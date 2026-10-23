import type { ScheduledInterviewRecord } from "@/lib/interview-workflow";
import { extractInterviewRoomIdFromLink } from "@/lib/interview-portal";
import {
  canJoinInterviewRoom,
  formatInterviewDateTime,
  getCountdownParts,
  parseInterviewDateTime
} from "@/lib/interview-workflow";

export type InterviewJoinErrorKind =
  | "not_open"
  | "expired"
  | "ended"
  | "cancelled"
  | "forbidden"
  | "not_found"
  | "disabled"
  | "network"
  | "session"
  | "unknown";

export function isExternalMeetingLink(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function resolveInterviewJoinHref(interview: ScheduledInterviewRecord): string {
  // Offline (in-person) rounds never expose a join link, even if a stale
  // meetingLink lingers from a prior online round — showing "Join Meeting"
  // for an in-person interview would send participants to the wrong place.
  if (interview.mode === "offline") return "";
  if (interview.roomId) return `/interview/${interview.roomId}`;
  return interview.meetingLink || "";
}

export function classifyInterviewJoinError(message: string): InterviewJoinErrorKind {
  const text = message.toLowerCase();
  if (text.includes("not open yet") || text.includes("scheduled time")) return "not_open";
  if (text.includes("expired") || text.includes("access window")) return "expired";
  if (text.includes("already ended") || text.includes("completed")) return "ended";
  if (text.includes("cancelled") || text.includes("rejected")) return "cancelled";
  if (text.includes("not invited") || text.includes("forbidden") || text.includes("not allowed")) return "forbidden";
  if (text.includes("not found")) return "not_found";
  if (text.includes("disabled")) return "disabled";
  if (text.includes("session expired") || text.includes("log in")) return "session";
  if (text.includes("network") || text.includes("fetch")) return "network";
  return "unknown";
}

export function getInterviewJoinErrorMessage(message: string): { title: string; description: string; kind: InterviewJoinErrorKind } {
  const kind = classifyInterviewJoinError(message);
  const map: Record<InterviewJoinErrorKind, { title: string; description: string }> = {
    not_open: {
      title: "Interview not open yet",
      description: message || "You can join 15 minutes before the scheduled start time."
    },
    expired: {
      title: "Interview window closed",
      description: message || "The late-join window for this interview has expired."
    },
    ended: {
      title: "Interview ended",
      description: message || "This interview session has already ended."
    },
    cancelled: {
      title: "Interview cancelled",
      description: message || "This interview is no longer available."
    },
    forbidden: {
      title: "Access denied",
      description: message || "You are not authorized to join this interview room."
    },
    not_found: {
      title: "Interview not found",
      description: message || "This meeting link is invalid or the room no longer exists."
    },
    disabled: {
      title: "Interview rooms unavailable",
      description: message || "Interview rooms are temporarily disabled."
    },
    session: {
      title: "Sign in required",
      description: message || "Please sign in again to join your interview."
    },
    network: {
      title: "Connection problem",
      description: message || "Unable to reach the interview server. Check your connection and retry."
    },
    unknown: {
      title: "Unable to join interview",
      description: message || "Something went wrong while opening the interview room."
    }
  };
  return { ...map[kind], kind };
}

export function getInterviewJoinAvailability(interview: ScheduledInterviewRecord, now = Date.now()) {
  const joinHref = resolveInterviewJoinHref(interview);
  const canJoin = Boolean(joinHref) && canJoinInterviewRoom(interview.interviewDate, interview.interviewTime, interview.interviewStatus, now);
  const countdown = getCountdownParts(interview.interviewDate, interview.interviewTime, now);
  const start = parseInterviewDateTime(interview.interviewDate, interview.interviewTime);
  const opensAt = start ? new Date(start.getTime() - 15 * 60 * 1000) : null;
  const opensSoon = Boolean(start && !canJoin && now < start.getTime() && interview.interviewStatus !== "cancelled" && interview.interviewStatus !== "completed");

  return {
    joinHref,
    canJoin,
    opensSoon,
    opensAt,
    countdown,
    isPlatformRoom: Boolean(interview.roomId || extractInterviewRoomIdFromLink(interview.meetingLink)),
    isExternalLink: joinHref ? isExternalMeetingLink(joinHref) : false
  };
}

export function formatInterviewJoinHint(interview: ScheduledInterviewRecord, now = Date.now()): string | null {
  const availability = getInterviewJoinAvailability(interview, now);
  if (availability.canJoin) return null;
  if (interview.interviewStatus === "cancelled" || interview.interviewStatus === "completed") return null;
  if (availability.opensSoon && availability.countdown) {
    return `Join opens in ${availability.countdown.label}`;
  }
  if (availability.opensSoon && availability.opensAt) {
    return `Join opens ${formatInterviewDateTime(interview.interviewDate, interview.interviewTime)} (15 min early)`;
  }
  return null;
}
