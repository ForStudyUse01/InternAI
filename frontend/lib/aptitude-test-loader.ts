"use client";

import type { AptitudeTestSet } from "@/lib/data/aptitude-tests";

const cache = new Map<number, AptitudeTestSet>();

/** Loads full question bank only after test start — not bundled into nav/metadata views */
export async function loadTestSetQuestions(testId: number): Promise<AptitudeTestSet | undefined> {
  if (cache.has(testId)) return cache.get(testId);

  const mod = await import("@/lib/data/aptitude-tests");
  const set = mod.APTITUDE_TEST_SETS.find((entry) => entry.id === testId);
  if (set) cache.set(testId, set);
  return set;
}

export function clearLoadedTestSet(testId?: number) {
  if (testId != null) cache.delete(testId);
  else cache.clear();
}
