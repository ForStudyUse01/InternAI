"use client";

import { useEffect, useState } from "react";
import { getCountdownParts, type CountdownParts } from "@/lib/interview-workflow";

/** A live clock tick shared by every countdown display so each surface
 *  doesn't need to re-implement its own setInterval. */
export function useTickingNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

/** Live-updating countdown to an interview's start time. Returns null until
 *  the first tick (avoids a server/client render mismatch) or if there's no
 *  valid date/time to count down to. */
export function useInterviewCountdown(
  interviewDate?: string,
  interviewTime?: string,
  intervalMs = 60_000
): CountdownParts | null {
  const now = useTickingNow(intervalMs);
  if (now === null) return null;
  return getCountdownParts(interviewDate, interviewTime, now);
}
