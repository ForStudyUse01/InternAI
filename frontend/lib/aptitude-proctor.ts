"use client";

export type FocusLossEvent = {
  timestamp: string;
  durationMs: number;
};

export type ProctorBehaviorLog = {
  tabSwitchCount: number;
  tabSwitchTimestamps: string[];
  focusLossEvents: FocusLossEvent[];
  copyAttempts: number;
  inactivityEvents: FocusLossEvent[];
  focusLossDurationSeconds: number;
  totalInactivitySeconds: number;
  fullscreenExit?: boolean;
  fullscreenExitAt?: string;
};

export type CheatingRiskLevel = "Low" | "Medium" | "High";

export type CheatingReport = {
  cheatingScore: number;
  cheatingRiskLevel: CheatingRiskLevel;
  flags: string[];
  behaviorLog: ProctorBehaviorLog;
};

export const INACTIVITY_THRESHOLD_MS = 90_000;

export function createEmptyProctorLog(): ProctorBehaviorLog {
  return {
    tabSwitchCount: 0,
    tabSwitchTimestamps: [],
    focusLossEvents: [],
    copyAttempts: 0,
    inactivityEvents: [],
    focusLossDurationSeconds: 0,
    totalInactivitySeconds: 0
  };
}

export function mergeProctorLogs(base: ProctorBehaviorLog, patch: Partial<ProctorBehaviorLog>): ProctorBehaviorLog {
  return {
    tabSwitchCount: patch.tabSwitchCount ?? base.tabSwitchCount,
    tabSwitchTimestamps: patch.tabSwitchTimestamps ?? base.tabSwitchTimestamps,
    focusLossEvents: patch.focusLossEvents ?? base.focusLossEvents,
    copyAttempts: patch.copyAttempts ?? base.copyAttempts,
    inactivityEvents: patch.inactivityEvents ?? base.inactivityEvents,
    focusLossDurationSeconds: patch.focusLossDurationSeconds ?? base.focusLossDurationSeconds,
    totalInactivitySeconds: patch.totalInactivitySeconds ?? base.totalInactivitySeconds,
    fullscreenExit: patch.fullscreenExit ?? base.fullscreenExit,
    fullscreenExitAt: patch.fullscreenExitAt ?? base.fullscreenExitAt
  };
}

export function computeCheatingReport(
  log: ProctorBehaviorLog,
  options?: { fullscreenExit?: boolean }
): CheatingReport {
  const flags: string[] = [];
  let score = 0;
  const fullscreenExit = options?.fullscreenExit ?? log.fullscreenExit;

  if (fullscreenExit) {
    flags.push("fullscreen_exit");
    score += 30;
  }

  if (log.tabSwitchCount >= 2) {
    flags.push("tab_switching");
    score += Math.min(35, log.tabSwitchCount * 8);
  }

  if (log.focusLossDurationSeconds >= 30) {
    flags.push("focus_loss");
    score += Math.min(30, Math.floor(log.focusLossDurationSeconds / 10));
  }

  if (log.totalInactivitySeconds >= 90) {
    flags.push("inactivity");
    score += Math.min(20, Math.floor(log.totalInactivitySeconds / 30));
  }

  if (log.copyAttempts >= 1) {
    flags.push("copy_attempt");
    score += Math.min(15, log.copyAttempts * 10);
  }

  const cheatingScore = Math.min(100, Math.round(score));
  const cheatingRiskLevel: CheatingRiskLevel =
    cheatingScore >= 55 ? "High" : cheatingScore >= 25 ? "Medium" : "Low";

  return { cheatingScore, cheatingRiskLevel, flags, behaviorLog: log };
}
