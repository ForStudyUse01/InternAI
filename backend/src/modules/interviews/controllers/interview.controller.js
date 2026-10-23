const asyncHandler = require("../../../shared/utils/asyncHandler");
const { sendSuccess } = require("../../../shared/utils/api-response");
const interviewRoomService = require("../../../services/interview-room.service");
const { notifyInterviewUpdated } = require("../../../services/interview-workflow.service");
const { getChatIo } = require("../../../shared/socket/chat.socket");
const { isEnabled } = require("../../../shared/config/feature-flags");
const AppError = require("../../../shared/utils/AppError");

function ensureInterviewRoomsEnabled() {
  if (!isEnabled("ENABLE_INTERVIEW_ROOMS")) {
    throw new AppError("Interview rooms are disabled", 503);
  }
}

const getRoom = asyncHandler(async (req, res) => {
  ensureInterviewRoomsEnabled();
  const payload = await interviewRoomService.getRoomDetails(req.user, req.params.roomId);
  return sendSuccess(res, { data: payload });
});

const joinRoom = asyncHandler(async (req, res) => {
  ensureInterviewRoomsEnabled();
  const payload = await interviewRoomService.joinRoom(req.user, req.params.roomId);
  return sendSuccess(res, { data: payload });
});

const updateNotes = asyncHandler(async (req, res) => {
  ensureInterviewRoomsEnabled();
  const room = await interviewRoomService.updateHrNotes(req.user, req.params.roomId, req.body?.notes);
  return sendSuccess(res, { data: { room }, message: "Notes saved" });
});

const updateOutcome = asyncHandler(async (req, res) => {
  ensureInterviewRoomsEnabled();
  const room = await interviewRoomService.setOutcome(req.user, req.params.roomId, req.body?.outcome);
  return sendSuccess(res, { data: { room }, message: "Outcome updated" });
});

const endInterview = asyncHandler(async (req, res) => {
  ensureInterviewRoomsEnabled();
  const payload = await interviewRoomService.endInterview(req.user, req.params.roomId);

  if (payload.application && payload.room?.roundId) {
    const round = (payload.application.interviewRounds || []).id(payload.room.roundId);
    if (round) {
      const changeType = payload.room.outcome === "rejected" ? "rejected" : "completed";
      await notifyInterviewUpdated({
        application: payload.application,
        round,
        companyUserId: req.user._id,
        changeType,
        interviewRoomLink: null
      }).catch((err) => {
        console.error(`[interviews] failed to notify interview-end for room ${req.params.roomId}:`, err.message);
      });
    }
  }

  const io = getChatIo();
  if (io && payload.room) {
    io.to(`interview:${req.params.roomId}`).emit("interview:end", {
      roomId: req.params.roomId,
      room: payload.room
    });
  }

  return sendSuccess(res, { data: payload, message: "Interview ended" });
});

module.exports = {
  getRoom,
  joinRoom,
  updateNotes,
  updateOutcome,
  endInterview
};
