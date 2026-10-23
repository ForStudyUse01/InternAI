"use client";

import type { LearningMemory } from "@/lib/ai-platform/types";
import type { AptitudeTestResult } from "@/lib/aptitude-test-engine";
import type { AptitudeSectionKey } from "@/lib/aptitude-test-engine";

const STORAGE_KEY = "internai_ai_learning_memory";

const EMPTY_MEMORY: LearningMemory = {
  weakConcepts: [],
  masteredConcepts: [],
  frequentlyWrongPatterns: [],
  improvedSkills: [],
  userProgressTrend: [],
  skillGapsSeen: [],
  updatedAt: new Date().toISOString()
};

function readMemory(): LearningMemory {
  if (typeof window === "undefined") return { ...EMPTY_MEMORY };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw || typeof raw !== "object") return { ...EMPTY_MEMORY };
    return { ...EMPTY_MEMORY, ...raw, masteredConcepts: raw.masteredConcepts ?? [] } as LearningMemory;
  } catch {
    return { ...EMPTY_MEMORY };
  }
}

function writeMemory(memory: LearningMemory) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...memory, updatedAt: new Date().toISOString() }));
  } catch {
    // ignore quota
  }
}

function bumpConcept(
  list: LearningMemory["weakConcepts"],
  concept: string,
  section: string
): LearningMemory["weakConcepts"] {
  const idx = list.findIndex((c) => c.concept === concept && c.section === section);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], count: next[idx].count + 1, lastSeen: new Date().toISOString() };
    return next.sort((a, b) => b.count - a.count).slice(0, 40);
  }
  return [{ concept, section, count: 1, lastSeen: new Date().toISOString() }, ...list].slice(0, 40);
}

function recordMastered(
  list: LearningMemory["masteredConcepts"],
  concept: string,
  section: string
): LearningMemory["masteredConcepts"] {
  if (list.some((m) => m.concept === concept && m.section === section)) return list;
  return [{ concept, section, masteredAt: new Date().toISOString() }, ...list].slice(0, 30);
}

function bumpSkillGap(list: LearningMemory["skillGapsSeen"], skill: string) {
  const idx = list.findIndex((s) => s.skill === skill);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], count: next[idx].count + 1, lastSeen: new Date().toISOString() };
    return next.sort((a, b) => b.count - a.count).slice(0, 30);
  }
  return [{ skill, count: 1, lastSeen: new Date().toISOString() }, ...list].slice(0, 30);
}

export function getLearningMemory(): LearningMemory {
  return readMemory();
}

export function recordAptitudeLearning(result: AptitudeTestResult, wrongConcepts: string[]) {
  const memory = readMemory();

  let weakConcepts = memory.weakConcepts;
  let masteredConcepts = memory.masteredConcepts;

  for (const area of result.weakAreas) {
    for (const concept of area.conceptFocus) {
      if (wrongConcepts.includes(concept)) {
        weakConcepts = bumpConcept(weakConcepts, concept, area.section);
      }
    }
  }
  for (const concept of wrongConcepts) {
    const section = result.weakAreas[0]?.section ?? "quantitative";
    weakConcepts = bumpConcept(weakConcepts, concept, section);
  }

  for (const area of result.strongAreas) {
    for (const concept of area.conceptFocus) {
      if (area.accuracy >= 80) {
        masteredConcepts = recordMastered(masteredConcepts, concept, area.section);
        weakConcepts = weakConcepts.filter((w) => !(w.concept === concept && w.section === area.section));
      }
    }
  }

  const patterns = [...new Set([...wrongConcepts, ...memory.frequentlyWrongPatterns])].slice(0, 20);

  const trend = [
    {
      testId: result.testId,
      readiness: result.readinessScore,
      accuracy: result.accuracy,
      completedAt: new Date().toISOString()
    },
    ...memory.userProgressTrend.filter((t) => t.testId !== result.testId)
  ].slice(0, 20);

  const improvedSkills = memory.improvedSkills;
  if (trend.length >= 2) {
    const latest = trend[0];
    const prior = trend[1];
    if (latest.readiness > prior.readiness + 5) {
      for (const area of result.strongAreas) {
        if (!improvedSkills.includes(area.label)) improvedSkills.unshift(area.label);
      }
    }
  }

  writeMemory({
    ...memory,
    weakConcepts,
    masteredConcepts,
    frequentlyWrongPatterns: patterns,
    improvedSkills: improvedSkills.slice(0, 15),
    userProgressTrend: trend
  });
}

export function recordSkillGapLearning(missingSkills: string[]) {
  const memory = readMemory();
  let skillGapsSeen = memory.skillGapsSeen;
  for (const skill of missingSkills.slice(0, 12)) {
    skillGapsSeen = bumpSkillGap(skillGapsSeen, skill);
  }
  writeMemory({ ...memory, skillGapsSeen });
}

export function isConceptMastered(concept: string, section?: string): boolean {
  return readMemory().masteredConcepts.some(
    (m) => m.concept === concept && (!section || m.section === section)
  );
}

export function getConceptPriorityWeight(concept: string): number {
  if (isConceptMastered(concept)) return 0.5;
  const hit = readMemory().weakConcepts.find((c) => c.concept === concept);
  if (!hit) return 1;
  return Math.min(3, 1 + hit.count * 0.35);
}

export function getImprovementTrendScore(): number {
  const trend = readMemory().userProgressTrend;
  if (trend.length < 2) return 50;
  const recent = trend.slice(0, 3);
  const deltas = recent.slice(1).map((t, i) => recent[i].readiness - t.readiness);
  const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  return Math.max(0, Math.min(100, Math.round(50 + avgDelta * 3)));
}

export function getTopWeakConcepts(limit = 5): LearningMemory["weakConcepts"] {
  return readMemory()
    .weakConcepts.filter((c) => !isConceptMastered(c.concept, c.section))
    .slice(0, limit);
}

const SECTION_TO_DSA: Record<string, string> = {
  quantitative: "arrays",
  logical: "graphs",
  verbal: "strings",
  dataInterpretation: "graphs"
};

export function getAdaptiveTechnicalFocus(): { category: string; reason: string } | null {
  const top = getTopWeakConcepts(1)[0];
  if (!top) return null;
  const category = SECTION_TO_DSA[top.section] ?? "arrays";
  return {
    category,
    reason: `Repeated miss pattern in ${top.concept} (from test history) — prioritize ${category} practice`
  };
}

export function prioritizeConcepts<T extends { concept: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => getConceptPriorityWeight(b.concept) - getConceptPriorityWeight(a.concept));
}

export function getDifficultyRecommendation(section: AptitudeSectionKey, accuracy: number): "Easy" | "Medium" | "Hard" {
  if (accuracy >= 80) return "Hard";
  if (accuracy >= 55) return "Medium";
  return "Easy";
}
