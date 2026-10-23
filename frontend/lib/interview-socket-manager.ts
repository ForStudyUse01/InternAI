"use client";

import { io, type Socket } from "socket.io-client";
import type { InterviewChatMessage, InterviewRoom } from "@/lib/interview-portal";
import { resolveInterviewSocketUrl } from "@/lib/interview-portal";
import { getAuthSession } from "@/lib/session";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import type { WebRtcSignal } from "@/lib/use-interview-socket";

export type RosterMember = {
  userId: string;
  socketId: string;
  role: "intern" | "company";
  name: string;
};

export type ParticipantUpdate = {
  roomId: string;
  userId?: string;
  socketId?: string;
  role?: "intern" | "company";
  name?: string;
  joined?: boolean;
  muted?: boolean;
  cameraOff?: boolean;
  screenSharing?: boolean;
};

export type InterviewSocketHandlers = {
  onJoined?: (payload: {
    room: InterviewRoom;
    participantRole: "intern" | "company";
    selfSocketId: string;
    participants: RosterMember[];
  }) => void;
  onSignal?: (payload: { fromSocketId: string; fromUserId: string; signal: WebRtcSignal }) => void;
  onChat?: (message: InterviewChatMessage) => void;
  onParticipantUpdate?: (payload: ParticipantUpdate) => void;
  onEnd?: (payload: { room: InterviewRoom }) => void;
  onKicked?: () => void;
  onHandRaise?: (payload: { roomId: string; userId: string; socketId: string; raised: boolean }) => void;
  onNotesSync?: (payload: { roomId: string; notes: string; updatedByUserId: string }) => void;
  onReconnect?: () => void;
};

const subscribers = new Map<number, InterviewSocketHandlers>();
let nextSubscriberId = 1;
let socket: Socket | null = null;
let connectToken: string | null = null;
const joinedRooms = new Set<string>();

function dispatch<K extends keyof InterviewSocketHandlers>(
  key: K,
  payload: Parameters<NonNullable<InterviewSocketHandlers[K]>>[0]
) {
  subscribers.forEach((handlers) => {
    const handler = handlers[key];
    if (typeof handler === "function") {
      (handler as (arg: typeof payload) => void)(payload);
    }
  });
}

function attachSocketListeners(sock: Socket) {
  sock.removeAllListeners("interview:signal");
  sock.removeAllListeners("interview:chat");
  sock.removeAllListeners("interview:participant:update");
  sock.removeAllListeners("interview:end");
  sock.removeAllListeners("interview:kicked");
  sock.removeAllListeners("interview:hand-raise");
  sock.removeAllListeners("interview:notes:sync");
  sock.removeAllListeners("connect");

  sock.on("interview:signal", (payload: { fromSocketId: string; fromUserId: string; signal: WebRtcSignal }) => {
    dispatch("onSignal", payload);
  });

  sock.on("interview:chat", (payload: { message: InterviewChatMessage }) => {
    if (payload?.message) dispatch("onChat", payload.message);
  });

  sock.on("interview:participant:update", (payload: ParticipantUpdate) => {
    dispatch("onParticipantUpdate", payload);
  });

  sock.on("interview:end", (payload: { room: InterviewRoom }) => {
    dispatch("onEnd", payload);
  });

  sock.on("interview:kicked", () => {
    dispatch("onKicked", undefined);
  });

  sock.on("interview:hand-raise", (payload: { roomId: string; userId: string; socketId: string; raised: boolean }) => {
    dispatch("onHandRaise", payload);
  });

  sock.on("interview:notes:sync", (payload: { roomId: string; notes: string; updatedByUserId: string }) => {
    dispatch("onNotesSync", payload);
  });

  sock.on("connect", () => {
    if (joinedRooms.size === 0) return;
    joinedRooms.forEach((roomId) => {
      emitJoinRoom(roomId).catch(() => undefined);
    });
    subscribers.forEach((handlers) => handlers.onReconnect?.());
  });
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectToken = null;
  joinedRooms.clear();
}

function ensureSocket(): Socket | null {
  if (!FEATURE_FLAGS.ENABLE_INTERVIEW_ROOMS) return null;

  const token = getAuthSession()?.token;
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket && connectToken !== token) {
    disconnectSocket();
  }

  if (!socket) {
    connectToken = token;
    socket = io(resolveInterviewSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 12
    });
    attachSocketListeners(socket);
  }

  return socket;
}

export function subscribeInterviewSocket(handlers: InterviewSocketHandlers): () => void {
  const id = nextSubscriberId++;
  subscribers.set(id, handlers);
  ensureSocket();

  return () => {
    subscribers.delete(id);
    if (subscribers.size === 0) {
      disconnectSocket();
    }
  };
}

function emitJoinRoom(roomId: string): Promise<{
  ok: boolean;
  room?: InterviewRoom;
  participantRole?: "intern" | "company";
  selfSocketId?: string;
  participants?: RosterMember[];
  message?: string;
}> {
  return new Promise((resolve) => {
    const sock = ensureSocket();
    if (!sock) {
      resolve({ ok: false, message: "Socket not ready" });
      return;
    }

    const emitJoin = () => {
      sock.emit("interview:join", { roomId }, (response?: {
        ok?: boolean;
        room?: InterviewRoom;
        participantRole?: "intern" | "company";
        selfSocketId?: string;
        participants?: RosterMember[];
        message?: string;
      }) => {
        if (response?.ok && response.room && response.participantRole && response.selfSocketId) {
          joinedRooms.add(String(roomId));
          dispatch("onJoined", {
            room: response.room,
            participantRole: response.participantRole,
            selfSocketId: response.selfSocketId,
            participants: response.participants || []
          });
          resolve({
            ok: true,
            room: response.room,
            participantRole: response.participantRole,
            selfSocketId: response.selfSocketId,
            participants: response.participants || []
          });
          return;
        }
        resolve({ ok: false, message: response?.message || "Failed to join room" });
      });
    };

    if (sock.connected) {
      emitJoin();
      return;
    }

    sock.once("connect", emitJoin);
    sock.once("connect_error", () => resolve({ ok: false, message: "Socket connection failed" }));
  });
}

export function joinInterviewSocketRoom(roomId: string) {
  return emitJoinRoom(roomId);
}

export function sendInterviewSignal(roomId: string, targetSocketId: string, signal: WebRtcSignal) {
  const sock = ensureSocket();
  if (!sock?.connected || !targetSocketId) return;
  sock.emit("interview:signal", { roomId, targetSocketId, signal }, (response?: { ok?: boolean; message?: string }) => {
    if (response && response.ok === false) {
      console.warn("[interview] signal delivery failed:", response.message);
    }
  });
}

export function sendInterviewChat(
  roomId: string,
  body: string
): Promise<{ ok: boolean; message?: InterviewChatMessage; messageText?: string }> {
  return new Promise((resolve) => {
    const sock = ensureSocket();
    if (!sock?.connected) {
      resolve({ ok: false, messageText: "Socket not connected" });
      return;
    }
    sock.emit("interview:chat", { roomId, body }, (response?: { ok?: boolean; message?: InterviewChatMessage | string }) => {
      if (response?.ok && response.message && typeof response.message === "object") {
        resolve({ ok: true, message: response.message });
        return;
      }
      const errorText = typeof response?.message === "string" ? response.message : "Failed to send message";
      resolve({ ok: false, messageText: errorText });
    });
  });
}

export function updateInterviewParticipantStatus(
  roomId: string,
  status: { muted?: boolean; cameraOff?: boolean; screenSharing?: boolean }
) {
  const sock = ensureSocket();
  if (!sock?.connected) return;
  sock.emit("interview:participant:update", { roomId, ...status });
}

export function sendInterviewHandRaise(roomId: string, raised: boolean) {
  const sock = ensureSocket();
  if (!sock?.connected) return;
  sock.emit("interview:hand-raise", { roomId, raised });
}

export function sendInterviewNotesUpdate(roomId: string, notes: string): Promise<{ ok: boolean; notes?: string; message?: string }> {
  return new Promise((resolve) => {
    const sock = ensureSocket();
    if (!sock?.connected) {
      resolve({ ok: false, message: "Socket not connected" });
      return;
    }
    sock.emit("interview:notes:update", { roomId, notes }, (response?: { ok?: boolean; notes?: string; message?: string }) => {
      resolve({ ok: Boolean(response?.ok), notes: response?.notes, message: response?.message });
    });
  });
}

export function leaveInterviewSocketRoom(roomId: string) {
  const sock = ensureSocket();
  joinedRooms.delete(String(roomId));
  if (!sock?.connected) return;
  sock.emit("interview:leave", { roomId });
}

export function endInterviewSocketRoom(roomId: string): Promise<{ ok: boolean; room?: InterviewRoom; message?: string }> {
  return new Promise((resolve) => {
    const sock = ensureSocket();
    if (!sock?.connected) {
      resolve({ ok: false, message: "Socket not connected" });
      return;
    }
    sock.emit("interview:end", { roomId }, (response?: { ok?: boolean; room?: InterviewRoom; message?: string }) => {
      if (response?.ok) joinedRooms.delete(String(roomId));
      resolve({ ok: Boolean(response?.ok), room: response?.room, message: response?.message });
    });
  });
}
