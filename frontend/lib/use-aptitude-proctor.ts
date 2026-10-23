"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEmptyProctorLog,
  INACTIVITY_THRESHOLD_MS,
  type ProctorBehaviorLog
} from "@/lib/aptitude-proctor";

type Options = {
  enabled: boolean;
  examRootRef: React.RefObject<HTMLElement | null>;
  initialLog?: ProctorBehaviorLog;
  onLogChange?: (log: ProctorBehaviorLog) => void;
};

export function useAptitudeProctor({ enabled, examRootRef, initialLog, onLogChange }: Options) {
  const [proctorLog, setProctorLog] = useState<ProctorBehaviorLog>(() => initialLog ?? createEmptyProctorLog());
  const proctorRef = useRef(proctorLog);
  const blurStartedAt = useRef<number | null>(null);
  const lastActivityAt = useRef(Date.now());
  const inactivityActive = useRef(false);

  useEffect(() => {
    proctorRef.current = proctorLog;
    onLogChange?.(proctorLog);
  }, [proctorLog, onLogChange]);

  const patchLog = useCallback((updater: (log: ProctorBehaviorLog) => ProctorBehaviorLog) => {
    setProctorLog((prev) => updater(prev));
  }, []);

  const recordTabSwitch = useCallback(() => {
    const now = new Date().toISOString();
    patchLog((log) => ({
      ...log,
      tabSwitchCount: log.tabSwitchCount + 1,
      tabSwitchTimestamps: [...log.tabSwitchTimestamps, now]
    }));
  }, [patchLog]);

  const closeFocusLoss = useCallback(() => {
    if (blurStartedAt.current == null) return;
    const durationMs = Date.now() - blurStartedAt.current;
    blurStartedAt.current = null;
    if (durationMs < 500) return;

    const event = { timestamp: new Date().toISOString(), durationMs };
    patchLog((log) => ({
      ...log,
      focusLossEvents: [...log.focusLossEvents, event],
      focusLossDurationSeconds: log.focusLossDurationSeconds + Math.round(durationMs / 1000)
    }));
  }, [patchLog]);

  const recordCopyAttempt = useCallback(() => {
    patchLog((log) => ({ ...log, copyAttempts: log.copyAttempts + 1 }));
  }, [patchLog]);

  const recordInactivity = useCallback((durationMs: number) => {
    if (durationMs < INACTIVITY_THRESHOLD_MS) return;
    const event = { timestamp: new Date().toISOString(), durationMs };
    patchLog((log) => ({
      ...log,
      inactivityEvents: [...log.inactivityEvents, event],
      totalInactivitySeconds: log.totalInactivitySeconds + Math.round(durationMs / 1000)
    }));
  }, [patchLog]);

  const touchActivity = useCallback(() => {
    if (inactivityActive.current) {
      recordInactivity(Date.now() - lastActivityAt.current);
      inactivityActive.current = false;
    }
    lastActivityAt.current = Date.now();
  }, [recordInactivity]);

  useEffect(() => {
    if (!enabled) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        blurStartedAt.current = Date.now();
        recordTabSwitch();
      } else {
        closeFocusLoss();
      }
    };

    const onBlur = () => {
      if (document.hidden) return;
      blurStartedAt.current = Date.now();
    };

    const onFocus = () => closeFocusLoss();

    const onCopy = (event: ClipboardEvent) => {
      const root = examRootRef.current;
      if (!root) return;
      const target = event.target as Node | null;
      if (target && root.contains(target)) recordCopyAttempt();
    };

    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    const onActivity = () => touchActivity();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    activityEvents.forEach((name) => document.addEventListener(name, onActivity, { passive: true }));

    const inactivityTimer = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityAt.current;
      if (idleMs >= INACTIVITY_THRESHOLD_MS) inactivityActive.current = true;
    }, 5000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      activityEvents.forEach((name) => document.removeEventListener(name, onActivity));
      window.clearInterval(inactivityTimer);
      closeFocusLoss();
    };
  }, [closeFocusLoss, enabled, examRootRef, recordCopyAttempt, recordTabSwitch, touchActivity]);

  return { proctorLog, proctorRef };
}
