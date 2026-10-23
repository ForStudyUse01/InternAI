const InterviewRoom = require("../../../models/InterviewRoom");
const Application = require("../../../models/Application");
const { LATE_JOIN_HOURS } = require("./interview-room.service");
const { sweepAllInterviewReminders, notifyInterviewNoShow } = require("./interview-workflow.service");
const { withVersionRetry } = require("../../../shared/utils/with-version-retry");

const SWEEP_INTERVAL_MS = Number(process.env.INTERVIEW_SWEEP_INTERVAL_MS) || 5 * 60 * 1000;

let timer = null;

async function sweepNoShows() {
  const cutoff = new Date(Date.now() - LATE_JOIN_HOURS * 60 * 60 * 1000);
  const staleRooms = await InterviewRoom.find({
    status: { $in: ["scheduled", "live"] },
    everJoined: false,
    scheduledTime: { $lte: cutoff }
  });

  let flagged = 0;
  for (const room of staleRooms) {
    room.status = "no_show";
    // eslint-disable-next-line no-await-in-loop
    await room.save();

    let application;
    let round;
    // eslint-disable-next-line no-await-in-loop
    await withVersionRetry(async () => {
      application = await Application.findById(room.applicationId);
      if (!application) return;
      round = (application.interviewRounds || []).id(room.roundId);
      if (!round || round.status !== "scheduled") return;
      round.status = "no_show";
      round.updatedAt = new Date();
      await application.save();
    });

    if (application && round) {
      flagged += 1;
      // eslint-disable-next-line no-await-in-loop
      await notifyInterviewNoShow({ application, round }).catch((err) => {
        console.error(`[interviews] failed to notify no-show for room ${room.roomId}:`, err.message);
      });
    }
  }

  return { flagged };
}

async function runSweep() {
  try {
    await sweepAllInterviewReminders();
  } catch (err) {
    console.error("[interviews] reminder sweep failed:", err.message);
  }
  try {
    await sweepNoShows();
  } catch (err) {
    console.error("[interviews] no-show sweep failed:", err.message);
  }
}

function start() {
  if (timer) return;
  timer = setInterval(runSweep, SWEEP_INTERVAL_MS);
  timer.unref?.();
}

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, runSweep };
