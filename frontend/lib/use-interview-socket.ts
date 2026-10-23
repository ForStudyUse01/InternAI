"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { InterviewChatMessage, InterviewRoom } from "@/lib/interview-portal";
import {
  endInterviewSocketRoom,
  joinInterviewSocketRoom,
  leaveInterviewSocketRoom,
  sendInterviewChat,
  sendInterviewHandRaise,
  sendInterviewNotesUpdate,
  sendInterviewSignal,
  subscribeInterviewSocket,
  updateInterviewParticipantStatus,
  type InterviewSocketHandlers,
  type ParticipantUpdate,
  type RosterMember
} from "@/lib/interview-socket-manager";

export type WebRtcSignal = {
  type: "offer" | "answer" | "ice-candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export type { ParticipantUpdate, RosterMember };

type InterviewSocketHookHandlers = InterviewSocketHandlers;

export function useInterviewSocket(handlers: InterviewSocketHookHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const activeRoomRef = useRef<string | null>(null);

  useEffect(() => {
    return subscribeInterviewSocket({
      onJoined: (payload) => handlersRef.current.onJoined?.(payload),
      onSignal: (payload) => handlersRef.current.onSignal?.(payload),
      onChat: (message) => handlersRef.current.onChat?.(message),
      onParticipantUpdate: (payload) => handlersRef.current.onParticipantUpdate?.(payload),
      onEnd: (payload) => handlersRef.current.onEnd?.(payload),
      onKicked: () => handlersRef.current.onKicked?.(),
      onHandRaise: (payload) => handlersRef.current.onHandRaise?.(payload),
      onNotesSync: (payload) => handlersRef.current.onNotesSync?.(payload),
      onReconnect: () => handlersRef.current.onReconnect?.()
    });
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    activeRoomRef.current = roomId;
    return joinInterviewSocketRoom(roomId);
  }, []);

  const sendSignal = useCallback((roomId: string, targetSocketId: string, signal: WebRtcSignal) => {
    sendInterviewSignal(roomId, targetSocketId, signal);
  }, []);

  const sendChat = useCallback((roomId: string, body: string) => {
    return sendInterviewChat(roomId, body);
  }, []);

  const updateParticipantStatus = useCallback(
    (roomId: string, status: { muted?: boolean; cameraOff?: boolean; screenSharing?: boolean }) => {
      updateInterviewParticipantStatus(roomId, status);
    },
    []
  );

  const sendHandRaise = useCallback((roomId: string, raised: boolean) => {
    sendInterviewHandRaise(roomId, raised);
  }, []);

  const sendNotesUpdate = useCallback((roomId: string, notes: string) => {
    return sendInterviewNotesUpdate(roomId, notes);
  }, []);

  const endRoom = useCallback((roomId: string) => {
    activeRoomRef.current = null;
    return endInterviewSocketRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    if (activeRoomRef.current === roomId) activeRoomRef.current = null;
    leaveInterviewSocketRoom(roomId);
  }, []);

  return useMemo(
    () => ({
      joinRoom,
      sendSignal,
      sendChat,
      updateParticipantStatus,
      sendHandRaise,
      sendNotesUpdate,
      endRoom,
      leaveRoom
    }),
    [joinRoom, sendSignal, sendChat, updateParticipantStatus, sendHandRaise, sendNotesUpdate, endRoom, leaveRoom]
  );
}
