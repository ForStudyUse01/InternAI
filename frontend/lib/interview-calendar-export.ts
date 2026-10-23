import {
  formatInterviewDateTime,
  getInterviewEndDateTime,
  INTERVIEW_DEFAULT_DURATION_MINUTES,
  parseInterviewDateTime,
  type ScheduledInterviewRecord
} from "@/lib/interview-workflow";

export type InterviewCalendarEvent = {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  url: string;
};

function formatIcsUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildInterviewCalendarEvent(
  interview: ScheduledInterviewRecord,
  audience: "intern" | "company" = "intern"
): InterviewCalendarEvent | null {
  const start = parseInterviewDateTime(interview.interviewDate, interview.interviewTime);
  if (!start) return null;
  const end = getInterviewEndDateTime(interview.interviewDate, interview.interviewTime) || new Date(start.getTime() + 60 * 60 * 1000);
  const joinUrl =
    interview.roomId && typeof window !== "undefined"
      ? `${window.location.origin}/interview/${interview.roomId}`
      : interview.meetingLink || "";

  const counterpart = audience === "company" ? interview.candidateName || "Candidate" : interview.companyName;
  const title = `${interview.interviewType} · ${interview.role} (${counterpart})`;
  const descriptionLines = [
    `Role: ${interview.role}`,
    `Round: ${interview.interviewType}`,
    audience === "company" ? `Candidate: ${interview.candidateName || "Candidate"}` : `Company: ${interview.companyName}`,
    `Mode: ${interview.mode || "online"}`,
    `Duration: ${INTERVIEW_DEFAULT_DURATION_MINUTES} minutes`,
    `Scheduled: ${formatInterviewDateTime(interview.interviewDate, interview.interviewTime)}`,
    joinUrl ? `Join link: ${joinUrl}` : ""
  ].filter(Boolean);

  return {
    uid: `interview-${interview.interviewId}@internai`,
    title,
    description: descriptionLines.join("\n"),
    location: interview.mode === "offline" ? "In-person interview" : joinUrl || "Online interview",
    start,
    end,
    url: joinUrl
  };
}

function formatGoogleCalendarLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

export function buildGoogleCalendarUrl(event: InterviewCalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleCalendarLocal(event.start)}/${formatGoogleCalendarLocal(event.end)}`,
    details: event.description,
    location: event.location
  });
  if (event.url) params.set("sprop", event.url);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildInterviewIcsContent(event: InterviewCalendarEvent) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InternAI//Interview Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(event.start)}`,
    `DTEND:${formatIcsUtc(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`
  ];
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadInterviewIcs(interview: ScheduledInterviewRecord, audience: "intern" | "company" = "intern") {
  const event = buildInterviewCalendarEvent(interview, audience);
  if (!event || typeof window === "undefined") return;
  const blob = new Blob([buildInterviewIcsContent(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `interview-${interview.interviewId}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function openGoogleCalendarForInterview(
  interview: ScheduledInterviewRecord,
  audience: "intern" | "company" = "intern"
) {
  const event = buildInterviewCalendarEvent(interview, audience);
  if (!event || typeof window === "undefined") return;
  window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
}
