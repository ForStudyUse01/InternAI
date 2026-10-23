const { canTransition, TERMINAL_STATUSES } = require("../../src/modules/applications/services/pipeline.service");

describe("pipeline.service canTransition", () => {
  test("allows a valid forward transition", () => {
    expect(canTransition("applied", "under_review")).toBe(true);
    expect(canTransition("shortlisted", "interview_scheduled")).toBe(true);
  });

  test("rejects an invalid/skipped transition", () => {
    expect(canTransition("applied", "selected")).toBe(false);
  });

  test("same-status transition is always allowed (no-op update)", () => {
    expect(canTransition("under_review", "under_review")).toBe(true);
  });

  test("terminal statuses (rejected/selected/withdrawn) allow no further transition", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(canTransition(status, "under_review")).toBe(false);
      expect(canTransition(status, "shortlisted")).toBe(false);
    }
  });

  test("interview_scheduled is reachable from any non-terminal status", () => {
    expect(canTransition("applied", "interview_scheduled")).toBe(true);
    expect(canTransition("on_hold", "interview_scheduled")).toBe(true);
    expect(canTransition("screening", "interview_scheduled")).toBe(true);
  });

  test("interview_scheduled is NOT reachable from a terminal status", () => {
    expect(canTransition("rejected", "interview_scheduled")).toBe(false);
    expect(canTransition("selected", "interview_scheduled")).toBe(false);
    expect(canTransition("withdrawn", "interview_scheduled")).toBe(false);
  });

  test("returns false when from/to is missing", () => {
    expect(canTransition(undefined, "selected")).toBe(false);
    expect(canTransition("applied", undefined)).toBe(false);
    expect(canTransition(null, null)).toBe(false);
  });

  test("returns false for an unknown status with no configured transitions", () => {
    expect(canTransition("not_a_real_status", "selected")).toBe(false);
  });
});
