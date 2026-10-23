const crypto = require("crypto");
const InterviewRoom = require("../../../models/InterviewRoom");
const Application = require("../../../models/Application");
const InternProfile = require("../../../models/InternProfile");
const CompanyProfile = require("../../../models/CompanyProfile");
const User = require("../../../models/User");
const AppError = require("../../../shared/utils/AppError");
const { APPLICATION_STATUS } = require("../../../constants/enums");
const companyQuery = require("../../../services/company-query.service");
const { isHrScopedUser } = require("../../../services/company-access.service");
const { canTransition } = require("../../../services/pipeline.service");
const { withVersionRetry } = require("../../../shared/utils/with-version-retry");

const EARLY_JOIN_MINUTES = 15;
const LATE_JOIN_HOURS = 3;
const ROLE_CAPS = { intern: 1, company: 3 };

function combineScheduledTime(interviewDate, interviewTime) {
  const dateKey =
    typeof interviewDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(interviewDate)
      ? interviewDate
      : new Date(interviewDate).toISOString().slice(0, 10);
  const [year, month, day] = dateKey.split("-").map(Number);
  const parts = String(interviewTime || "00:00").split(":");
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  const scheduled = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(scheduled.getTime())) {
    throw new AppError("Invalid interview date", 400);
  }
  return scheduled;
}

function getAccessWindow(scheduledTime) {
  const start = new Date(scheduledTime).getTime() - EARLY_JOIN_MINUTES * 60 * 1000;
  const end = new Date(scheduledTime).getTime() + LATE_JOIN_HOURS * 60 * 60 * 1000;
  return { start, end };
}

function isWithinAccessWindow(room, now = Date.now()) {
  const { start, end } = getAccessWindow(room.scheduledTime);
  if (room.status === "live") {
    return now <= end;
  }
  if (room.status === "completed") {
    return false;
  }
  return now >= start && now <= end;
}

async function getCompanyProfileByUserId(userId) {
  const user = await User.findById(userId).select("companyProfileRef").lean();
  if (user?.companyProfileRef) {
    const linked = await CompanyProfile.findById(user.companyProfileRef).lean();
    if (linked) return linked;
  }
  const company = await CompanyProfile.findOne({ user: userId }).lean();
  if (!company) {
    throw new AppError("Company profile not found", 404);
  }
  return company;
}

async function getInternProfileByUserId(userId) {
  const profile = await InternProfile.findOne({ user: userId }).lean();
  if (!profile) {
    throw new AppError("Intern profile not found", 404);
  }
  return profile;
}

async function assertRoomParticipant(user, room, { enforceRecruiterScope = true } = {}) {
  if (user.role === "intern") {
    const profile = await getInternProfileByUserId(user._id);
    if (String(profile._id) !== String(room.candidateId)) {
      throw new AppError("You are not invited to this interview room", 403);
    }
    return { role: "intern", profile };
  }

  if (user.role === "company") {
    const company = await getCompanyProfileByUserId(user._id);
    if (String(company._id) !== String(room.companyId)) {
      throw new AppError("You are not invited to this interview room", 403);
    }

    const application = await Application.findById(room.applicationId).select("assignedRecruiter companyId").lean();
    if (!application) {
      throw new AppError("Application not found", 404);
    }
    if (String(application.companyId || application.company) !== String(room.companyId)) {
      throw new AppError("Not allowed for this interview", 403);
    }
    // Interviewers are freeform names, not linked accounts (no per-interviewer
    // identity system) — so join/view/chat only require membership in the
    // company that owns this room. Recruiter-scoping stays enforced for the
    // administrative actions (notes/outcome/end) that carry decision authority.
    if (
      enforceRecruiterScope &&
      isHrScopedUser(user) &&
      application.assignedRecruiter &&
      String(application.assignedRecruiter) !== String(user._id)
    ) {
      throw new AppError("Not allowed for this recruiter scope", 403);
    }

    return { role: "company", company };
  }

  throw new AppError("Forbidden", 403);
}

async function assertRoundJoinable(room) {
  const application = await Application.findById(room.applicationId).select("interviewRounds status");
  if (!application) {
    throw new AppError("Application not found", 404);
  }
  const round = (application.interviewRounds || []).id(room.roundId);
  if (!round) {
    throw new AppError("Interview round not found", 404);
  }
  const roundStatus = String(round.status || "").toLowerCase();
  if (roundStatus === "rejected" || roundStatus === "cancelled") {
    throw new AppError("This interview was cancelled", 403);
  }
  if (application.status === "rejected" || application.status === "withdrawn") {
    throw new AppError("This application is no longer active for interviews", 403);
  }
  return round;
}

async function loadInterviewApplication(room) {
  return Application.findById(room.applicationId)
    .populate("intern", "fullName email mobile skills education projects summary experience links")
    .populate("internship", "role department location")
    .populate("company", "companyName companyEmail")
    .lean();
}

async function findRoomByRoomId(roomId) {
  const room = await InterviewRoom.findOne({ roomId: String(roomId || "").trim() });
  if (!room) {
    throw new AppError("Interview room not found", 404);
  }
  return room;
}

async function createRoomForRound({ application, round, roundType }) {
  const scheduledTime = combineScheduledTime(round.interviewDate, round.interviewTime);
  const roundTypeValue = String(roundType || round.roundType || "").trim();

  // Atomic upsert against the {applicationId, roundId} unique index closes the
  // TOCTOU window a find-then-create pattern would otherwise leave open
  // (two concurrent schedule requests racing to create the room for one round).
  try {
    return await InterviewRoom.findOneAndUpdate(
      { applicationId: application._id, roundId: round._id },
      {
        $set: { scheduledTime, roundType: roundTypeValue },
        $setOnInsert: {
          roomId: crypto.randomUUID(),
          candidateId: application.internId || application.intern,
          companyId: application.companyId || application.company,
          status: "scheduled"
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      const existing = await InterviewRoom.findOne({ applicationId: application._id, roundId: round._id });
      if (existing) return existing;
    }
    throw err;
  }
}

async function syncRoomScheduleForRound(roundId, interviewDate, interviewTime) {
  const scheduledTime = combineScheduledTime(interviewDate, interviewTime);
  const room = await InterviewRoom.findOne({ roundId, status: { $ne: "completed" } });
  if (!room) return null;
  room.scheduledTime = scheduledTime;
  await room.save();
  return room;
}

function resolveClientInterviewUrl(roomId) {
  const configured = String(process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)[0];
  const base = configured || "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}/interview/${roomId}`;
}

async function getRoomDetails(user, roomId) {
  const room = await findRoomByRoomId(roomId);
  const participant = await assertRoomParticipant(user, room, { enforceRecruiterScope: false });
  await assertRoundJoinable(room);

  if (!isWithinAccessWindow(room)) {
    if (room.status === "completed") {
      throw new AppError("This interview has already ended", 403);
    }
    const { start } = getAccessWindow(room.scheduledTime);
    if (Date.now() < start) {
      throw new AppError("Interview room is not open yet. Please join at the scheduled time.", 403);
    }
    throw new AppError("Interview room access window has expired", 403);
  }

  const application = await loadInterviewApplication(room);

  return {
    room: serializeRoom(room, participant.role),
    application: application || null,
    participantRole: participant.role
  };
}

function serializeRoom(room, viewerRole) {
  const activeParticipants = (room.participants || []).filter((p) => !p.leftAt);
  const payload = {
    roomId: room.roomId,
    applicationId: room.applicationId,
    roundId: room.roundId,
    candidateId: room.candidateId,
    companyId: room.companyId,
    scheduledTime: room.scheduledTime,
    status: room.status,
    roundType: room.roundType,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    outcome: room.outcome || null,
    chatMessages: room.chatMessages || [],
    participantCount: activeParticipants.length,
    maxParticipants: room.maxParticipants || 4
  };

  if (viewerRole === "company") {
    payload.hrNotes = room.hrNotes || "";
  }

  return payload;
}

function resolveParticipantName(participant, user) {
  if (participant.role === "intern") {
    return participant.profile?.fullName || user.email || "Candidate";
  }
  return user.displayName || user.email || participant.company?.companyName || "Interviewer";
}

async function joinRoom(user, roomId) {
  const room = await findRoomByRoomId(roomId);
  const participant = await assertRoomParticipant(user, room, { enforceRecruiterScope: false });
  await assertRoundJoinable(room);

  if (!isWithinAccessWindow(room)) {
    if (room.status === "completed") {
      throw new AppError("This interview has already ended", 403);
    }
    const { start } = getAccessWindow(room.scheduledTime);
    if (Date.now() < start) {
      throw new AppError("Interview room is not open yet. Please join at the scheduled time.", 403);
    }
    throw new AppError("Interview room access window has expired", 403);
  }

  const activeParticipants = (room.participants || []).filter((p) => !p.leftAt);
  const alreadyActive = activeParticipants.find((p) => String(p.userId) === String(user._id));

  if (!alreadyActive) {
    const activeOfRole = activeParticipants.filter((p) => p.role === participant.role).length;
    const cap = ROLE_CAPS[participant.role] ?? 1;
    if (activeOfRole >= cap) {
      throw new AppError("This interview room is full.", 403, null, { code: "ROOM_FULL" });
    }
  }

  if (room.status === "scheduled") {
    room.status = "live";
    room.startedAt = new Date();
  }
  room.everJoined = true;

  if (alreadyActive) {
    alreadyActive.joinedAt = new Date();
  } else {
    room.participants.push({
      userId: user._id,
      role: participant.role,
      name: resolveParticipantName(participant, user),
      joinedAt: new Date(),
      leftAt: null
    });
  }
  await room.save();

  const application = await loadInterviewApplication(room);

  return {
    room: serializeRoom(room, participant.role),
    application: application || null,
    participantRole: participant.role,
    isFirstJoinForUser: !alreadyActive
  };
}

async function recordParticipantLeft(roomId, userId) {
  const room = await InterviewRoom.findOne({ roomId: String(roomId || "").trim() });
  if (!room) return null;
  const entry = (room.participants || [])
    .filter((p) => String(p.userId) === String(userId) && !p.leftAt)
    .pop();
  if (!entry) return null;
  entry.leftAt = new Date();
  await room.save();
  return room;
}

async function updateHrNotes(user, roomId, notes) {
  const room = await findRoomByRoomId(roomId);
  const participant = await assertRoomParticipant(user, room);
  if (participant.role !== "company") {
    throw new AppError("Only HR can update interview notes", 403);
  }
  if (room.status === "completed") {
    throw new AppError("Interview is already completed", 400);
  }

  room.hrNotes = String(notes || "");
  await room.save();
  return serializeRoom(room, "company");
}

async function setOutcome(user, roomId, outcome) {
  const normalized = String(outcome || "").trim().toLowerCase();
  if (!["selected", "rejected", "on_hold"].includes(normalized)) {
    throw new AppError("outcome must be selected, rejected, or on_hold", 400);
  }

  const room = await findRoomByRoomId(roomId);
  const participant = await assertRoomParticipant(user, room);
  if (participant.role !== "company") {
    throw new AppError("Only HR can set interview outcome", 403);
  }
  if (room.status === "completed") {
    throw new AppError("Interview is already completed", 400);
  }

  room.outcome = normalized;
  await room.save();
  return serializeRoom(room, "company");
}

async function endInterview(user, roomId) {
  const room = await findRoomByRoomId(roomId);
  const participant = await assertRoomParticipant(user, room);
  if (participant.role !== "company") {
    throw new AppError("Only HR can end the interview", 403);
  }
  if (room.status === "completed") {
    return serializeRoom(room, "company");
  }

  room.status = "completed";
  room.endedAt = new Date();
  await room.save();

  const outcomeTarget = {
    selected: { status: APPLICATION_STATUS.SELECTED, note: "Selected after interview" },
    rejected: { status: APPLICATION_STATUS.REJECTED, note: "Rejected after interview" },
    on_hold: { status: APPLICATION_STATUS.ON_HOLD, note: "Candidate placed on hold after interview" }
  }[room.outcome] || { status: APPLICATION_STATUS.INTERVIEW_COMPLETED, note: "Interview round completed" };

  let application;
  await withVersionRetry(async () => {
    application = await companyQuery.findApplicationById(room.companyId, room.applicationId, user, "internship");

    const round = (application.interviewRounds || []).id(room.roundId);
    if (round) {
      round.status = room.outcome === "rejected" ? "rejected" : "completed";
      round.updatedAt = new Date();
    }

    if (canTransition(application.status, outcomeTarget.status)) {
      application.status = outcomeTarget.status;
      application.stageHistory.push({ stage: outcomeTarget.status, note: outcomeTarget.note });
    }

    await application.save();
  });

  return {
    room: serializeRoom(room, "company"),
    application
  };
}

async function appendChatMessage(user, roomId, body) {
  const room = await findRoomByRoomId(roomId);
  const participant = await assertRoomParticipant(user, room, { enforceRecruiterScope: false });

  if (!isWithinAccessWindow(room) || room.status === "completed") {
    throw new AppError("Interview chat is closed", 403);
  }

  let senderName = user.email || "Participant";
  if (participant.role === "intern" && participant.profile?.fullName) {
    senderName = participant.profile.fullName;
  }
  if (participant.role === "company" && participant.company?.companyName) {
    senderName = participant.company.companyName;
  }

  const message = {
    senderRole: participant.role,
    senderName,
    body: String(body || "").trim(),
    createdAt: new Date()
  };

  if (!message.body) {
    throw new AppError("Message body is required", 400);
  }

  room.chatMessages.push(message);
  await room.save();

  const saved = room.chatMessages[room.chatMessages.length - 1];
  return {
    _id: saved._id,
    senderRole: saved.senderRole,
    senderName: saved.senderName,
    body: saved.body,
    createdAt: saved.createdAt
  };
}

async function verifySocketRoomAccess(user, roomId) {
  const room = await findRoomByRoomId(roomId);
  const participant = await assertRoomParticipant(user, room, { enforceRecruiterScope: false });
  await assertRoundJoinable(room);
  if (!isWithinAccessWindow(room) || room.status === "completed") {
    throw new AppError("Interview room is not active", 403);
  }
  return { room, participantRole: participant.role };
}

module.exports = {
  combineScheduledTime,
  createRoomForRound,
  syncRoomScheduleForRound,
  resolveClientInterviewUrl,
  getRoomDetails,
  joinRoom,
  recordParticipantLeft,
  updateHrNotes,
  setOutcome,
  endInterview,
  appendChatMessage,
  verifySocketRoomAccess,
  serializeRoom,
  findRoomByRoomId,
  ROLE_CAPS,
  LATE_JOIN_HOURS
};
