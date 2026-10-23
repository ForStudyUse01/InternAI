const { isEnabled } = require("../config/feature-flags");
const interviewRoomService = require("../../services/interview-room.service");
const { notifyInterviewUpdated, notifyInterviewParticipantJoined } = require("../../services/interview-workflow.service");
const { getChatIo } = require("./chat.socket");

function interviewRoomChannel(roomId) {
  return `interview:${roomId}`;
}

function normalizeRoomId(roomId) {
  const normalized = String(roomId || "").trim();
  if (!normalized) {
    throw new Error("roomId is required");
  }
  return normalized;
}

// In-memory live-membership roster: roomId -> Map<userId, {socketId, role, name}>.
// This is the mesh's signaling directory (who to relay targeted WebRTC
// signals to right now) — separate from the persisted participants[] history
// on InterviewRoom, which survives disconnects and drives no-show detection.
const roomMembers = new Map();

function getRoster(roomId) {
  return roomMembers.get(roomId) || new Map();
}

function rosterToArray(roomId, excludeUserId = null) {
  const roster = getRoster(roomId);
  const list = [];
  for (const [userId, member] of roster.entries()) {
    if (excludeUserId && String(userId) === String(excludeUserId)) continue;
    list.push({ userId, socketId: member.socketId, role: member.role, name: member.name });
  }
  return list;
}

function rememberInterviewRoomAccess(socket, roomId) {
  socket.data.interviewRooms = socket.data.interviewRooms || new Set();
  socket.data.interviewRooms.add(String(roomId));
}

function forgetInterviewRoomAccess(socket, roomId) {
  socket.data.interviewRooms?.delete(String(roomId));
}

function removeMemberFromRoster(io, roomId, userId) {
  const roster = roomMembers.get(roomId);
  if (!roster) return null;
  const key = String(userId);
  const existing = roster.get(key);
  if (!existing) return null;
  roster.delete(key);
  if (roster.size === 0) roomMembers.delete(roomId);
  io.to(interviewRoomChannel(roomId)).emit("interview:participant:update", {
    roomId,
    userId: key,
    socketId: existing.socketId,
    joined: false
  });
  return existing;
}

async function notifyInterviewEnded(payload, companyUserId) {
  if (!payload?.application || !payload?.room?.roundId) return;
  const round = (payload.application.interviewRounds || []).id(payload.room.roundId);
  if (!round) return;

  const changeType = payload.room.outcome === "rejected" ? "rejected" : "completed";
  await notifyInterviewUpdated({
    application: payload.application,
    round,
    companyUserId,
    changeType,
    interviewRoomLink: null
  }).catch((err) => {
    console.error(`[interviews] failed to notify interview-end (socket) for room ${payload.room?.roomId}:`, err.message);
  });
}

function resolveParticipantDisplayName(socket, participantRole, application) {
  if (participantRole === "intern") {
    return application?.intern?.fullName || socket.user.email || "Candidate";
  }
  return socket.user.displayName || socket.user.email || "Interviewer";
}

function initInterviewSocket() {
  if (!isEnabled("ENABLE_INTERVIEW_ROOMS")) {
    return;
  }

  const io = getChatIo();
  if (!io) {
    return;
  }

  io.on("connection", (socket) => {
    socket.on("interview:join", async ({ roomId }, callback) => {
      try {
        const normalizedRoomId = normalizeRoomId(roomId);
        const joined = await interviewRoomService.joinRoom(socket.user, normalizedRoomId);

        const userId = String(socket.user._id);
        const roster = roomMembers.get(normalizedRoomId) || new Map();
        roomMembers.set(normalizedRoomId, roster);

        const staleEntry = roster.get(userId);
        if (staleEntry && staleEntry.socketId !== socket.id) {
          // Same user already has a live connection in this room (refresh or a
          // second tab) — evict the stale socket instead of allowing two
          // simultaneous connections for one identity.
          const staleSocket = io.sockets.sockets.get(staleEntry.socketId);
          if (staleSocket) {
            staleSocket.emit("interview:kicked", { roomId: normalizedRoomId, reason: "joined-elsewhere" });
            staleSocket.leave(interviewRoomChannel(normalizedRoomId));
            forgetInterviewRoomAccess(staleSocket, normalizedRoomId);
          }
        }

        const participantName = resolveParticipantDisplayName(socket, joined.participantRole, joined.application);
        const rosterForNewcomer = rosterToArray(normalizedRoomId, userId);

        roster.set(userId, { socketId: socket.id, role: joined.participantRole, name: participantName });

        socket.join(interviewRoomChannel(normalizedRoomId));
        rememberInterviewRoomAccess(socket, normalizedRoomId);

        // Deterministic offer rule (avoids glare): the newcomer always offers
        // to every pre-existing member; pre-existing members only ever answer.
        socket.to(interviewRoomChannel(normalizedRoomId)).emit("interview:participant:update", {
          roomId: normalizedRoomId,
          userId,
          socketId: socket.id,
          role: joined.participantRole,
          name: participantName,
          joined: true
        });

        if (joined.isFirstJoinForUser && joined.application) {
          const round = (joined.application.interviewRounds || []).find(
            (r) => String(r._id) === String(joined.room.roundId)
          );
          notifyInterviewParticipantJoined({
            application: joined.application,
            round,
            joinedRole: joined.participantRole,
            joinedName: participantName
          }).catch((err) => {
            console.error(`[interviews] failed to notify participant-joined for room ${normalizedRoomId}:`, err.message);
          });
        }

        callback?.({
          ok: true,
          room: joined.room,
          participantRole: joined.participantRole,
          selfSocketId: socket.id,
          participants: rosterForNewcomer
        });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Failed to join interview room", code: error.code || null });
      }
    });

    socket.on("interview:signal", async ({ roomId, targetSocketId, signal }, callback) => {
      try {
        const normalizedRoomId = normalizeRoomId(roomId);
        if (!signal || typeof signal !== "object" || !signal.type) {
          throw new Error("Invalid signaling payload");
        }
        if (!targetSocketId) {
          throw new Error("targetSocketId is required");
        }

        await interviewRoomService.verifySocketRoomAccess(socket.user, normalizedRoomId);

        const roster = getRoster(normalizedRoomId);
        const targetIsMember = [...roster.values()].some((member) => member.socketId === targetSocketId);
        if (!targetIsMember) {
          throw new Error("Target participant is not in this room");
        }

        socket.join(interviewRoomChannel(normalizedRoomId));
        rememberInterviewRoomAccess(socket, normalizedRoomId);

        io.to(targetSocketId).emit("interview:signal", {
          roomId: normalizedRoomId,
          fromSocketId: socket.id,
          fromUserId: String(socket.user._id),
          signal
        });
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Signaling failed" });
      }
    });

    socket.on("interview:chat", async ({ roomId, body }, callback) => {
      try {
        const normalizedRoomId = normalizeRoomId(roomId);
        const message = await interviewRoomService.appendChatMessage(socket.user, normalizedRoomId, body);
        io.to(interviewRoomChannel(normalizedRoomId)).emit("interview:chat", {
          roomId: normalizedRoomId,
          message
        });
        callback?.({ ok: true, message });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Failed to send message" });
      }
    });

    socket.on("interview:participant:update", async ({ roomId, muted, cameraOff, screenSharing }, callback) => {
      try {
        const normalizedRoomId = normalizeRoomId(roomId);
        const access = await interviewRoomService.verifySocketRoomAccess(socket.user, normalizedRoomId);
        const payload = {
          roomId: normalizedRoomId,
          userId: String(socket.user._id),
          socketId: socket.id,
          role: access.participantRole
        };
        if (muted !== undefined) payload.muted = Boolean(muted);
        if (cameraOff !== undefined) payload.cameraOff = Boolean(cameraOff);
        if (screenSharing !== undefined) payload.screenSharing = Boolean(screenSharing);
        socket.to(interviewRoomChannel(normalizedRoomId)).emit("interview:participant:update", payload);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Failed to update participant status" });
      }
    });

    socket.on("interview:notes:update", async ({ roomId, notes }, callback) => {
      try {
        const normalizedRoomId = normalizeRoomId(roomId);
        const room = await interviewRoomService.updateHrNotes(socket.user, normalizedRoomId, notes);
        socket.to(interviewRoomChannel(normalizedRoomId)).emit("interview:notes:sync", {
          roomId: normalizedRoomId,
          notes: room.hrNotes || "",
          updatedByUserId: String(socket.user._id)
        });
        callback?.({ ok: true, notes: room.hrNotes || "" });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Failed to update notes" });
      }
    });

    socket.on("interview:hand-raise", async ({ roomId, raised }, callback) => {
      try {
        const normalizedRoomId = normalizeRoomId(roomId);
        await interviewRoomService.verifySocketRoomAccess(socket.user, normalizedRoomId);
        socket.to(interviewRoomChannel(normalizedRoomId)).emit("interview:hand-raise", {
          roomId: normalizedRoomId,
          userId: String(socket.user._id),
          socketId: socket.id,
          raised: Boolean(raised)
        });
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Failed to update raised-hand status" });
      }
    });

    socket.on("interview:leave", ({ roomId }) => {
      try {
        const normalizedRoomId = normalizeRoomId(roomId);
        socket.leave(interviewRoomChannel(normalizedRoomId));
        forgetInterviewRoomAccess(socket, normalizedRoomId);
        removeMemberFromRoster(io, normalizedRoomId, socket.user._id);
        interviewRoomService.recordParticipantLeft(normalizedRoomId, socket.user._id).catch((err) => {
          console.error(`[interviews] failed to record participant leave for room ${normalizedRoomId}:`, err.message);
        });
      } catch {
        // Ignore malformed leave payloads.
      }
    });

    socket.on("interview:end", async ({ roomId }, callback) => {
      try {
        const normalizedRoomId = normalizeRoomId(roomId);
        const payload = await interviewRoomService.endInterview(socket.user, normalizedRoomId);
        await notifyInterviewEnded(payload, socket.user._id);

        io.to(interviewRoomChannel(normalizedRoomId)).emit("interview:end", {
          roomId: normalizedRoomId,
          room: payload.room
        });

        forgetInterviewRoomAccess(socket, normalizedRoomId);
        roomMembers.delete(normalizedRoomId);
        callback?.({ ok: true, room: payload.room });
      } catch (error) {
        callback?.({ ok: false, message: error.message || "Failed to end interview" });
      }
    });

    socket.on("disconnect", () => {
      const rooms = socket.data.interviewRooms;
      if (!rooms || rooms.size === 0) return;
      rooms.forEach((roomId) => {
        removeMemberFromRoster(io, roomId, socket.user._id);
        interviewRoomService.recordParticipantLeft(roomId, socket.user._id).catch((err) => {
          console.error(`[interviews] failed to record participant leave on disconnect for room ${roomId}:`, err.message);
        });
      });
      socket.data.interviewRooms = new Set();
    });
  });
}

module.exports = { initInterviewSocket };
