import { describe, test, expect } from "vitest";
import {
  parseInterviewDateTime,
  resolveInterviewDisplayStatus,
  canJoinInterviewRoom,
  findOverlappingInterviews,
  encodeInterviewNotes,
  decodeInterviewNotes,
  getCountdownParts,
  isSameCalendarDay,
  normalizeInterviewDateInput,
  isActiveCalendarInterview,
  type ScheduledInterviewRecord
} from "@/lib/interview-workflow";

describe("normalizeInterviewDateInput", () => {
  test("passes through an already-normalized YYYY-MM-DD date", () => {
    expect(normalizeInterviewDateInput("2026-03-05")).toBe("2026-03-05");
  });
  test("truncates an ISO datetime string to its date part", () => {
    expect(normalizeInterviewDateInput("2026-03-05T10:00:00.000Z")).toBe("2026-03-05");
  });
  test("returns empty string for null/undefined", () => {
    expect(normalizeInterviewDateInput(null)).toBe("");
    expect(normalizeInterviewDateInput(undefined)).toBe("");
  });
});

describe("parseInterviewDateTime", () => {
  test("parses a standard date + 24h time", () => {
    const date = parseInterviewDateTime("2026-03-05", "14:30");
    expect(date?.getHours()).toBe(14);
    expect(date?.getMinutes()).toBe(30);
  });

  test("parses a legacy 12h AM/PM time string", () => {
    const pm = parseInterviewDateTime("2026-03-05", "2:30 PM");
    expect(pm?.getHours()).toBe(14);
    const am = parseInterviewDateTime("2026-03-05", "12:00 AM");
    expect(am?.getHours()).toBe(0);
  });

  test("defaults to 09:00 when time is missing", () => {
    const date = parseInterviewDateTime("2026-03-05");
    expect(date?.getHours()).toBe(9);
  });

  test("returns null when date is missing", () => {
    expect(parseInterviewDateTime(undefined, "10:00")).toBeNull();
  });
});

describe("resolveInterviewDisplayStatus", () => {
  test("returns cancelled for rejected/cancelled raw status", () => {
    expect(resolveInterviewDisplayStatus("cancelled")).toBe("cancelled");
    expect(resolveInterviewDisplayStatus("rejected")).toBe("cancelled");
  });

  test("returns completed for completed/cleared raw status", () => {
    expect(resolveInterviewDisplayStatus("completed")).toBe("completed");
    expect(resolveInterviewDisplayStatus("cleared")).toBe("completed");
  });

  test("returns in_progress when now falls within the interview window", () => {
    const now = new Date("2026-03-05T14:15:00").getTime();
    const status = resolveInterviewDisplayStatus("scheduled", "2026-03-05", "14:00", now, 60);
    expect(status).toBe("in_progress");
  });

  test("returns upcoming when within 24h of start", () => {
    const now = new Date("2026-03-05T14:00:00").getTime();
    const status = resolveInterviewDisplayStatus("scheduled", "2026-03-06", "10:00", now, 60);
    expect(status).toBe("upcoming");
  });

  test("returns scheduled when far in the future", () => {
    const now = new Date("2026-03-01T14:00:00").getTime();
    const status = resolveInterviewDisplayStatus("scheduled", "2026-03-10", "10:00", now, 60);
    expect(status).toBe("scheduled");
  });
});

describe("canJoinInterviewRoom", () => {
  test("allows joining within the 15-minute early-join window", () => {
    const now = new Date("2026-03-05T13:50:00").getTime();
    expect(canJoinInterviewRoom("2026-03-05", "14:00", "upcoming", now)).toBe(true);
  });

  test("allows late join up to 3 hours after start", () => {
    const now = new Date("2026-03-05T16:00:00").getTime();
    expect(canJoinInterviewRoom("2026-03-05", "14:00", "in_progress", now)).toBe(true);
  });

  test("blocks joining more than 3 hours after start", () => {
    const now = new Date("2026-03-05T18:00:00").getTime();
    expect(canJoinInterviewRoom("2026-03-05", "14:00", "in_progress", now)).toBe(false);
  });

  test("blocks joining far too early (more than 15 min before start)", () => {
    const now = new Date("2026-03-05T12:00:00").getTime();
    expect(canJoinInterviewRoom("2026-03-05", "14:00", "scheduled", now)).toBe(false);
  });

  test("blocks joining a completed/cancelled/no_show interview regardless of time", () => {
    const now = new Date("2026-03-05T14:00:00").getTime();
    expect(canJoinInterviewRoom("2026-03-05", "14:00", "completed", now)).toBe(false);
    expect(canJoinInterviewRoom("2026-03-05", "14:00", "cancelled", now)).toBe(false);
    expect(canJoinInterviewRoom("2026-03-05", "14:00", "no_show", now)).toBe(false);
  });
});

function record(overrides: Partial<ScheduledInterviewRecord> = {}): ScheduledInterviewRecord {
  return {
    interviewId: "i1",
    applicationId: "a1",
    companyName: "Acme",
    role: "Intern",
    interviewDate: "2026-03-05",
    interviewTime: "14:00",
    interviewType: "Technical",
    interviewStatus: "scheduled",
    durationMinutes: 60,
    ...overrides
  };
}

describe("findOverlappingInterviews", () => {
  test("detects a time overlap between two interviews on the same day", () => {
    const existing = [record({ interviewId: "existing", interviewTime: "14:00", durationMinutes: 60 })];
    const overlaps = findOverlappingInterviews(existing, "2026-03-05", "14:30");
    expect(overlaps).toHaveLength(1);
  });

  test("no overlap when times don't intersect", () => {
    const existing = [record({ interviewId: "existing", interviewTime: "14:00", durationMinutes: 60 })];
    const overlaps = findOverlappingInterviews(existing, "2026-03-05", "16:00");
    expect(overlaps).toHaveLength(0);
  });

  test("excludes the interview being edited from its own overlap check", () => {
    const existing = [record({ interviewId: "same-one", interviewTime: "14:00", durationMinutes: 60 })];
    const overlaps = findOverlappingInterviews(existing, "2026-03-05", "14:30", "same-one");
    expect(overlaps).toHaveLength(0);
  });

  test("ignores cancelled/completed interviews when checking overlap", () => {
    const existing = [
      record({ interviewId: "cancelled-one", interviewTime: "14:00", durationMinutes: 60, rawRoundStatus: "cancelled" })
    ];
    const overlaps = findOverlappingInterviews(existing, "2026-03-05", "14:30");
    expect(overlaps).toHaveLength(0);
  });
});

describe("encodeInterviewNotes / decodeInterviewNotes", () => {
  test("round-trips interviewer name and duration through notes text", () => {
    const encoded = encodeInterviewNotes({ interviewer: "Jane Smith", durationMinutes: 45 }, "Be on time.");
    const decoded = decodeInterviewNotes(encoded);
    expect(decoded.interviewer).toBe("Jane Smith");
    expect(decoded.durationMinutes).toBe(45);
    expect(decoded.notes).toBe("Be on time.");
  });

  test("omits the meta line entirely when using defaults (no interviewer, default duration)", () => {
    const encoded = encodeInterviewNotes({}, "Just notes.");
    expect(encoded).toBe("Just notes.");
  });

  test("decoding plain notes with no meta line returns defaults", () => {
    const decoded = decodeInterviewNotes("Just plain notes, no meta.");
    expect(decoded.interviewer).toBe("");
    expect(decoded.durationMinutes).toBe(60);
    expect(decoded.notes).toBe("Just plain notes, no meta.");
  });

  test("decoding undefined notes returns safe defaults", () => {
    const decoded = decodeInterviewNotes(undefined);
    expect(decoded.interviewer).toBe("");
    expect(decoded.notes).toBe("");
  });
});

describe("getCountdownParts", () => {
  test("returns null when target date is missing", () => {
    expect(getCountdownParts(undefined, undefined)).toBeNull();
  });

  test("computes days/hours/minutes remaining", () => {
    const now = new Date("2026-03-04T10:00:00").getTime();
    const parts = getCountdownParts("2026-03-05", "12:00", now);
    expect(parts?.days).toBe(1);
  });

  test("clamps to zero when the target time has already passed", () => {
    const now = new Date("2026-03-10T10:00:00").getTime();
    const parts = getCountdownParts("2026-03-05", "12:00", now);
    expect(parts?.totalMs).toBe(0);
  });
});

describe("isSameCalendarDay", () => {
  test("true for the same calendar day at different times", () => {
    expect(isSameCalendarDay(new Date("2026-03-05T01:00:00"), new Date("2026-03-05T23:00:00"))).toBe(true);
  });
  test("false for different days", () => {
    expect(isSameCalendarDay(new Date("2026-03-05T23:59:00"), new Date("2026-03-06T00:01:00"))).toBe(false);
  });
});

describe("isActiveCalendarInterview", () => {
  test("excludes rejected/cancelled/no_show interviews", () => {
    expect(isActiveCalendarInterview(record({ rawRoundStatus: "rejected" }))).toBe(false);
    expect(isActiveCalendarInterview(record({ interviewStatus: "cancelled" }))).toBe(false);
    expect(isActiveCalendarInterview(record({ interviewStatus: "no_show" }))).toBe(false);
  });
  test("includes a normally scheduled interview", () => {
    expect(isActiveCalendarInterview(record())).toBe(true);
  });
});
