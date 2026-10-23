"use client";

import type { CheatingReport, ProctorBehaviorLog } from "@/lib/aptitude-proctor";
import { computeCheatingReport, createEmptyProctorLog } from "@/lib/aptitude-proctor";
import type { AptitudeSectionKey, AptitudeTestResult } from "@/lib/aptitude-test-engine";

export const MAX_ATTEMPTS_PER_TEST = 3;

const STORAGE_KEY_BASE = "internai_aptitude_progress";
const SESSION_KEY = "internai_aptitude_session";
const PENDING_SUBMIT_KEY = "internai_aptitude_pending_submit";
const AUTH_EMAIL_KEY = "internai.auth.email";

export type AptitudeProgressPoint = {
  test: number;
  score: number;
  maxScore: number;
  readiness: number;
  accuracy: number;
  completedAt: string;
  sectionScores: Record<AptitudeSectionKey, number>;
};

export type AttemptHistoryPoint = {
  attempt: number;
  score: number;
  accuracy: number;
  readiness: number;
  completedAt: string;
};

export type AptitudeHistoryRecord = AptitudeTestResult & {
  completedAt: string;
  attemptNumber: number;
  cheatingReport: CheatingReport;
  autoSubmitted?: boolean;
  dedupeKey?: string;
};

export type AptitudeExamSession = {
  testActive: boolean;
  fullscreenMode: boolean;
  isFullscreenLocked: boolean;
  testId: number;
  attemptNumber: number;
  startTime: string;
  fullscreenEnteredAt?: string;
  answers: Record<string, number | null>;
  currentSection: AptitudeSectionKey;
  currentIndex: number;
  sectionStartedAt: string;
  remainingSeconds: number;
  sectionRemainingSeconds: Record<AptitudeSectionKey, number>;
  sectionTimeSpentSeconds: Record<AptitudeSectionKey, number>;
  unlockedSections: AptitudeSectionKey[];
  tabSwitchCount: number;
  focusLossEvents: ProctorBehaviorLog["focusLossEvents"];
  proctorLog: ProctorBehaviorLog;
  markedQuestionIds?: string[];
};

export type PendingAutoSubmit = AptitudeExamSession & {
  trigger: "unload" | "refresh" | "route" | "fullscreen_exit";
  savedAt: string;
};

function getStorageScope(): string {
  if (typeof window === "undefined") return "guest";
  return localStorage.getItem(AUTH_EMAIL_KEY) || "guest";
}

function progressStorageKey(): string {
  return `${STORAGE_KEY_BASE}:${getStorageScope()}`;
}

function readStorage(): AptitudeHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(progressStorageKey()) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeStorage(records: AptitudeHistoryRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(progressStorageKey(), JSON.stringify(records));
  } catch {
    // ignore quota errors
  }
}

export function getAptitudeHistory(): AptitudeHistoryRecord[] {
  return readStorage().sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );
}

export function getAttemptCount(testId: number): number {
  return readStorage().filter((record) => record.testId === testId).length;
}

export function canStartAttempt(testId: number): boolean {
  return getAttemptCount(testId) < MAX_ATTEMPTS_PER_TEST;
}

export function getRemainingAttempts(testId: number): number {
  return Math.max(0, MAX_ATTEMPTS_PER_TEST - getAttemptCount(testId));
}

export function getAttemptHistory(testId: number): AttemptHistoryPoint[] {
  return readStorage()
    .filter((record) => record.testId === testId)
    .sort((a, b) => a.attemptNumber - b.attemptNumber)
    .slice(-MAX_ATTEMPTS_PER_TEST)
    .map((record) => ({
      attempt: record.attemptNumber,
      score: record.totalScore,
      accuracy: record.accuracy,
      readiness: record.readinessScore,
      completedAt: record.completedAt
    }));
}

export function saveAptitudeResult(
  result: AptitudeTestResult,
  options?: {
    attemptNumber?: number;
    cheatingReport?: CheatingReport;
    autoSubmitted?: boolean;
    dedupeKey?: string;
  }
): AptitudeHistoryRecord {
  if (options?.dedupeKey) {
    const existing = readStorage().find(
      (record) => record.testId === result.testId && record.dedupeKey === options.dedupeKey
    );
    if (existing) {
      clearExamSession();
      clearPendingAutoSubmit();
      return existing;
    }
  }

  const attemptNumber = options?.attemptNumber ?? getAttemptCount(result.testId) + 1;
  const cheatingReport =
    options?.cheatingReport ?? computeCheatingReport(createEmptyProctorLog());

  const record: AptitudeHistoryRecord = {
    ...result,
    attemptNumber,
    cheatingReport,
    autoSubmitted: options?.autoSubmitted,
    dedupeKey: options?.dedupeKey,
    completedAt: new Date().toISOString()
  };

  writeStorage([...readStorage(), record]);
  clearExamSession();
  clearPendingAutoSubmit();
  return record;
}

export function getBestScoreForTest(testId: number): number | null {
  const attempts = readStorage().filter((record) => record.testId === testId);
  if (!attempts.length) return null;
  return Math.max(...attempts.map((record) => record.totalScore));
}

export function getLatestResultForTest(testId: number): AptitudeHistoryRecord | null {
  const attempts = readStorage().filter((record) => record.testId === testId);
  if (!attempts.length) return null;
  return attempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
}

export function buildProgressData(records?: AptitudeHistoryRecord[]): AptitudeProgressPoint[] {
  const history = records ?? (typeof window === "undefined" ? [] : getAptitudeHistory());
  const byTest = new Map<number, AptitudeHistoryRecord>();

  for (const record of history) {
    const existing = byTest.get(record.testId);
    if (!existing || new Date(record.completedAt) > new Date(existing.completedAt)) {
      byTest.set(record.testId, record);
    }
  }

  return Array.from(byTest.values())
    .sort((a, b) => a.testId - b.testId)
    .map((record) => ({
      test: record.testId,
      score: record.totalScore,
      maxScore: record.maxScore,
      readiness: record.readinessScore,
      accuracy: record.accuracy,
      completedAt: record.completedAt,
      sectionScores: {
        quantitative: record.sectionScores.quantitative.score,
        logical: record.sectionScores.logical.score,
        verbal: record.sectionScores.verbal.score,
        dataInterpretation: record.sectionScores.dataInterpretation.score
      }
    }));
}

export function createExamSession(
  testId: number,
  timing: {
    durationMinutes: number;
    sectionTimeMinutes: Record<AptitudeSectionKey, number>;
  },
  attemptNumber: number
): AptitudeExamSession {
  const sectionRemaining = Object.fromEntries(
    (Object.keys(timing.sectionTimeMinutes) as AptitudeSectionKey[]).map((key) => [
      key,
      timing.sectionTimeMinutes[key] * 60
    ])
  ) as Record<AptitudeSectionKey, number>;

  return {
    testActive: true,
    fullscreenMode: true,
    isFullscreenLocked: true,
    testId,
    attemptNumber,
    startTime: new Date().toISOString(),
    fullscreenEnteredAt: new Date().toISOString(),
    answers: {},
    currentSection: "quantitative",
    currentIndex: 0,
    sectionStartedAt: new Date().toISOString(),
    remainingSeconds: timing.durationMinutes * 60,
    sectionRemainingSeconds: sectionRemaining,
    sectionTimeSpentSeconds: {
      quantitative: 0,
      logical: 0,
      verbal: 0,
      dataInterpretation: 0
    },
    unlockedSections: ["quantitative", "logical", "verbal", "dataInterpretation"],
    tabSwitchCount: 0,
    focusLossEvents: [],
    proctorLog: createEmptyProctorLog()
  };
}

export function saveExamSession(session: AptitudeExamSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function loadExamSession(): AptitudeExamSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AptitudeExamSession;
    if (!parsed.proctorLog) parsed.proctorLog = createEmptyProctorLog();
    parsed.fullscreenMode = parsed.fullscreenMode ?? true;
    parsed.isFullscreenLocked = parsed.isFullscreenLocked ?? true;
    return parsed;
  } catch {
    return null;
  }
}

export function clearExamSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function savePendingAutoSubmit(session: AptitudeExamSession, trigger: PendingAutoSubmit["trigger"]) {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingAutoSubmit = {
      ...session,
      testActive: true,
      trigger,
      savedAt: new Date().toISOString()
    };
    sessionStorage.setItem(PENDING_SUBMIT_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadPendingAutoSubmit(): PendingAutoSubmit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SUBMIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAutoSubmit;
    if (!parsed.proctorLog) parsed.proctorLog = createEmptyProctorLog();
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingAutoSubmit() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_SUBMIT_KEY);
}
