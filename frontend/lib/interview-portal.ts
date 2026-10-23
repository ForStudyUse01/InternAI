import { apiRequest } from "@/lib/api-client";
import { resolveApiBaseUrlForSocket } from "@/lib/chat-portal";
import { getAuthSession } from "@/lib/session";

export type InterviewRoomStatus = "scheduled" | "live" | "completed";
export type InterviewOutcome = "selected" | "rejected" | "on_hold" | null;

export type InterviewChatMessage = {
  _id: string;
  senderRole: "intern" | "company";
  senderName?: string;
  body: string;
  createdAt: string;
};

export type InterviewRoom = {
  roomId: string;
  applicationId: string;
  roundId: string;
  candidateId: string;
  companyId: string;
  scheduledTime: string;
  status: InterviewRoomStatus;
  roundType?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  outcome?: InterviewOutcome;
  hrNotes?: string;
  chatMessages?: InterviewChatMessage[];
};

export type InterviewApplicationContext = {
  _id: string;
  status?: string;
  intern?: {
    _id?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    skills?: string[];
    education?: string[];
    projects?: string[];
    summary?: string;
    experience?: string[];
    links?: string[];
  };
  internship?: {
    role?: string;
    department?: string;
    location?: string;
  };
  company?: {
    companyName?: string;
    companyEmail?: string;
  };
};

export type InterviewRoomPayload = {
  room: InterviewRoom;
  application: InterviewApplicationContext | null;
  participantRole: "intern" | "company";
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

function authToken(): string | undefined {
  return getAuthSession()?.token || undefined;
}

async function interviewRequest<T>(path: string, options: { method?: string; body?: string } = {}) {
  const response = await apiRequest<ApiEnvelope<T>>(path, {
    ...options,
    token: authToken()
  });
  if (response?.data === undefined) {
    throw new Error("Unexpected interview API response");
  }
  return response.data;
}

export async function fetchInterviewRoom(roomId: string) {
  return interviewRequest<InterviewRoomPayload>(`/interview/${roomId}`);
}

export async function joinInterviewRoom(roomId: string) {
  return interviewRequest<InterviewRoomPayload>(`/interview/${roomId}/join`, { method: "POST" });
}

export async function saveInterviewNotes(roomId: string, notes: string) {
  return interviewRequest<{ room: InterviewRoom }>(`/interview/${roomId}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notes })
  });
}

export async function setInterviewOutcome(roomId: string, outcome: "selected" | "rejected" | "on_hold") {
  return interviewRequest<{ room: InterviewRoom }>(`/interview/${roomId}/outcome`, {
    method: "PATCH",
    body: JSON.stringify({ outcome })
  });
}

export async function endInterviewSession(roomId: string) {
  return interviewRequest<{ room: InterviewRoom; application?: InterviewApplicationContext }>(`/interview/${roomId}/end`, {
    method: "POST"
  });
}

export function resolveInterviewSocketUrl(): string {
  return resolveApiBaseUrlForSocket();
}

export function extractInterviewRoomIdFromLink(link?: string | null): string | null {
  if (!link) return null;
  const match = link.match(/\/interview\/([^/?#]+)/i);
  return match?.[1] || null;
}
