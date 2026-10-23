import type { CheatingReport } from "@/lib/aptitude-proctor";
import type { ValidatedAIOutput } from "@/lib/ai-platform/types";
import {
  augmentWithUserHistory,
  groundWeakAreaDetection,
  INSUFFICIENT
} from "@/lib/ai-platform/grounding-engine";
import {
  getConceptPriorityWeight,
  getImprovementTrendScore,
  getLearningMemory,
  getTopWeakConcepts,
  prioritizeConcepts
} from "@/lib/ai-platform/learning-memory";
import { validateAptitudeResult } from "@/lib/ai-platform/aptitude-validation";
import {
  APTITUDE_TEST_SETS,
  APTITUDE_SECTIONS,
  aptitudeTests,
  type AptitudeQuestion,
  type AptitudeTestSet
} from "@/lib/data/aptitude-tests";

export type AptitudeSectionKey = "quantitative" | "logical" | "verbal" | "dataInterpretation";
export type AptitudeDifficulty = "Easy" | "Medium" | "Hard";
export type ReadinessLabel =
  | "Not Ready"
  | "Needs Improvement"
  | "Interview Ready (Moderate)"
  | "Highly Interview Ready";

export const MARKS: Record<AptitudeDifficulty, number> = { Easy: 1, Medium: 2, Hard: 3 };
export const NEGATIVE_MARKS: Record<AptitudeDifficulty, number> = { Easy: 0.25, Medium: 0.25, Hard: 0.5 };

export type SectionScore = {
  score: number;
  max: number;
  correct: number;
  wrong: number;
  unanswered: number;
  total: number;
  accuracy: number;
  timeSpentSeconds: number;
  timeAllowedSeconds: number;
  timeEfficiency: number;
};

export type WeakAreaReport = {
  section: AptitudeSectionKey;
  label: string;
  accuracy: number;
  status: "Weak" | "Moderate" | "Strong";
  reason: string;
  conceptFocus: string[];
  improvementFocus: string;
};

export type PersonalizedInsight = {
  strengths: [string, string];
  weaknesses: [string, string];
  suggestion: string;
};

export type AptitudeTestResult = {
  testId: number;
  testTitle: string;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  timeEfficiency: number;
  timeSpentSeconds: number;
  timeAllowedSeconds: number;
  sectionScores: Record<AptitudeSectionKey, SectionScore>;
  weakAreas: WeakAreaReport[];
  strongAreas: WeakAreaReport[];
  readinessScore: number;
  readinessLabel: ReadinessLabel;
  personalizedInsight: PersonalizedInsight;
  difficultyPerformance: number;
  sectionBalance: number;
  improvementTrend: number;
  prioritizedConcepts: string[];
  aiValidation: ValidatedAIOutput<{ readinessScore: number; accuracy: number }>;
  attemptNumber?: number;
  cheatingReport?: CheatingReport;
  autoSubmitted?: boolean;
};

export function getTestSet(testId: number): AptitudeTestSet | undefined {
  return APTITUDE_TEST_SETS.find((set) => set.id === testId);
}

export function startTest(testId: number): AptitudeTestSet | undefined {
  return getTestSet(testId);
}

export function getQuestionsForSection(test: AptitudeTestSet, section: AptitudeSectionKey): AptitudeQuestion[] {
  return test.questions.filter((q) => q.section === section);
}

export function getSectionMeta(section: AptitudeSectionKey) {
  return APTITUDE_SECTIONS.find((s) => s.key === section)!;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getReadinessLabel(score: number): ReadinessLabel {
  if (score >= 81) return "Highly Interview Ready";
  if (score >= 61) return "Interview Ready (Moderate)";
  if (score >= 41) return "Needs Improvement";
  return "Not Ready";
}

const SECTION_IMPROVEMENT: Record<AptitudeSectionKey, string> = {
  quantitative: "Practice arithmetic speed drills and timed percentage/ratio sets.",
  logical: "Solve 10 seating and syllogism puzzles daily under a timer.",
  verbal: "Review grammar rules and attempt short RC passages with elimination.",
  dataInterpretation: "Focus on table/chart interpretation and percentage-change traps."
};

const CONCEPT_BUCKETS: Record<AptitudeSectionKey, string> = {
  quantitative: "Arithmetic / Algebra",
  logical: "Logic patterns / Puzzles",
  verbal: "Grammar / Vocabulary",
  dataInterpretation: "Graphs / Tables / Caselets"
};

export function calculateScore(
  test: AptitudeTestSet,
  answers: Record<string, number | null | undefined>
): {
  totalScore: number;
  maxScore: number;
  correctCount: number;
  sectionStats: Record<
    AptitudeSectionKey,
    { score: number; max: number; correct: number; wrong: number; unanswered: number; total: number }
  >;
  conceptMap: Map<string, { section: AptitudeSectionKey; correct: number; total: number }>;
  difficultyStats: Record<AptitudeDifficulty, { correct: number; total: number }>;
} {
  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;

  const sectionStats: Record<
    AptitudeSectionKey,
    { score: number; max: number; correct: number; wrong: number; unanswered: number; total: number }
  > = {
    quantitative: { score: 0, max: 0, correct: 0, wrong: 0, unanswered: 0, total: 0 },
    logical: { score: 0, max: 0, correct: 0, wrong: 0, unanswered: 0, total: 0 },
    verbal: { score: 0, max: 0, correct: 0, wrong: 0, unanswered: 0, total: 0 },
    dataInterpretation: { score: 0, max: 0, correct: 0, wrong: 0, unanswered: 0, total: 0 }
  };

  const conceptMap = new Map<string, { section: AptitudeSectionKey; correct: number; total: number }>();
  const difficultyStats: Record<AptitudeDifficulty, { correct: number; total: number }> = {
    Easy: { correct: 0, total: 0 },
    Medium: { correct: 0, total: 0 },
    Hard: { correct: 0, total: 0 }
  };

  for (const question of test.questions) {
    const marks = question.marks ?? MARKS[question.difficulty];
    maxScore += marks;
    sectionStats[question.section].max += marks;
    sectionStats[question.section].total += 1;
    difficultyStats[question.difficulty].total += 1;

    const conceptKey = `${question.section}:${question.concept}`;
    const conceptStat = conceptMap.get(conceptKey) ?? { section: question.section, correct: 0, total: 0 };
    conceptStat.total += 1;

    const selected = answers[question.id];
    const isUnanswered = selected == null || selected < 0;
    const isCorrect = !isUnanswered && selected === question.correctIndex;

    if (isCorrect) {
      totalScore += marks;
      correctCount += 1;
      sectionStats[question.section].score += marks;
      sectionStats[question.section].correct += 1;
      conceptStat.correct += 1;
      difficultyStats[question.difficulty].correct += 1;
    } else if (!isUnanswered) {
      totalScore -= NEGATIVE_MARKS[question.difficulty];
      sectionStats[question.section].score -= NEGATIVE_MARKS[question.difficulty];
      sectionStats[question.section].wrong += 1;
    } else {
      sectionStats[question.section].unanswered += 1;
    }

    conceptMap.set(conceptKey, conceptStat);
  }

  totalScore = Math.max(0, Math.round(totalScore * 100) / 100);
  for (const key of Object.keys(sectionStats) as AptitudeSectionKey[]) {
    sectionStats[key].score = Math.max(0, Math.round(sectionStats[key].score * 100) / 100);
  }

  return { totalScore, maxScore, correctCount, sectionStats, conceptMap, difficultyStats };
}

function sectionTimeEfficiency(spent: number, allowed: number): number {
  if (!allowed) return 0;
  const ratio = spent / allowed;
  if (ratio <= 0.85) return 100;
  if (ratio <= 1) return Math.round(100 - (ratio - 0.85) * 200);
  return Math.max(0, Math.round(60 - (ratio - 1) * 100));
}

export function analyzeWeakAreas(
  test: AptitudeTestSet,
  sectionScores: Record<AptitudeSectionKey, SectionScore>,
  conceptMap: Map<string, { section: AptitudeSectionKey; correct: number; total: number }>
): { weakAreas: WeakAreaReport[]; strongAreas: WeakAreaReport[] } {
  const reports: WeakAreaReport[] = APTITUDE_SECTIONS.map((section) => {
    const stat = sectionScores[section.key];
    const slow = stat.timeSpentSeconds > stat.timeAllowedSeconds * 0.9;
    const lowAccuracy = stat.accuracy < 60;

    let status: WeakAreaReport["status"] = "Moderate";
    if (stat.accuracy >= 80) status = "Strong";
    else if (lowAccuracy || (slow && stat.accuracy < 75)) status = "Weak";

    const reason =
      slow && lowAccuracy
        ? `Slow + low accuracy (${stat.accuracy}%)`
        : slow
          ? `Slow section pacing (${formatDuration(stat.timeSpentSeconds)} used)`
          : `${stat.accuracy}% accuracy`;

    const concepts = Array.from(conceptMap.entries())
      .filter(([key, c]) => key.startsWith(`${section.key}:`) && c.correct < c.total)
      .map(([key]) => key.split(":").slice(1).join(":"))
      .slice(0, 3);

    return {
      section: section.key,
      label: section.label,
      accuracy: stat.accuracy,
      status,
      reason,
      conceptFocus: concepts.length ? concepts : [CONCEPT_BUCKETS[section.key]],
      improvementFocus: SECTION_IMPROVEMENT[section.key]
    };
  });

  return {
    weakAreas: reports.filter((r) => r.status === "Weak"),
    strongAreas: reports.filter((r) => r.status === "Strong")
  };
}

export function computeInterviewReadinessScore(input: {
  testPerformance: number;
  sectionAccuracies: number[];
  difficultyStats: Record<AptitudeDifficulty, { correct: number; total: number }>;
  timeEfficiency: number;
  improvementTrend?: number;
}): {
  readinessScore: number;
  readinessLabel: ReadinessLabel;
  sectionBalance: number;
  difficultyPerformance: number;
  improvementTrend: number;
} {
  const { testPerformance, sectionAccuracies, difficultyStats, timeEfficiency } = input;
  const improvementTrend = input.improvementTrend ?? getImprovementTrendScore();

  const sectionAccuracy =
    sectionAccuracies.length > 0
      ? Math.round(sectionAccuracies.reduce((s, v) => s + v, 0) / sectionAccuracies.length)
      : 0;

  const diffAcc = (d: AptitudeDifficulty) =>
    difficultyStats[d].total ? Math.round((difficultyStats[d].correct / difficultyStats[d].total) * 100) : 0;

  const difficultyPerformance = Math.round(
    diffAcc("Easy") * 0.2 + diffAcc("Medium") * 0.35 + diffAcc("Hard") * 0.45
  );

  const readinessScore = Math.min(
    100,
    Math.round(
      testPerformance * 0.4 +
        sectionAccuracy * 0.2 +
        difficultyPerformance * 0.15 +
        timeEfficiency * 0.15 +
        improvementTrend * 0.1
    )
  );

  const spread =
    sectionAccuracies.length > 1 ? Math.max(...sectionAccuracies) - Math.min(...sectionAccuracies) : 0;
  const sectionBalance = sectionAccuracy;

  return {
    readinessScore,
    readinessLabel: getReadinessLabel(readinessScore),
    sectionBalance,
    difficultyPerformance,
    improvementTrend
  };
}

function extractWrongConcepts(
  test: AptitudeTestSet,
  answers: Record<string, number | null | undefined>
): string[] {
  const wrong = new Set<string>();
  for (const question of test.questions) {
    const selected = answers[question.id];
    if (selected == null || selected < 0) continue;
    if (selected !== question.correctIndex) wrong.add(question.concept);
  }
  return [...wrong];
}

function buildPersonalizedInsight(
  weakAreas: WeakAreaReport[],
  strongAreas: WeakAreaReport[],
  prioritizedConcepts: string[],
  wrongConcepts: string[]
): PersonalizedInsight {
  const insufficient = INSUFFICIENT;
  const historyWeak = getTopWeakConcepts(2)
    .filter((c) => wrongConcepts.includes(c.concept))
    .map((c) => c.concept);
  const topWeakConcept = prioritizedConcepts[0] || historyWeak[0];

  if (wrongConcepts.length === 0 && weakAreas.length === 0 && strongAreas.length === 0) {
    return {
      strengths: [insufficient, insufficient],
      weaknesses: [insufficient, insufficient],
      suggestion: `${insufficient} — submit answers to receive grounded insights.`
    };
  }

  const strengths: [string, string] = [
    strongAreas[0]
      ? `${strongAreas[0].label} — ${strongAreas[0].accuracy}% accuracy (${strongAreas[0].conceptFocus.join(", ")})`
      : insufficient,
    strongAreas[1]
      ? `${strongAreas[1].label} — ${strongAreas[1].accuracy}% accuracy`
      : strongAreas[0]?.conceptFocus[0]
        ? `Strong in ${strongAreas[0].conceptFocus[0]} (from submitted answers)`
        : insufficient
  ];

  const weaknesses: [string, string] = [
    weakAreas[0]
      ? `${weakAreas[0].label} — ${weakAreas[0].reason}`
      : topWeakConcept
        ? `Missed questions tagged: ${topWeakConcept}`
        : insufficient,
    weakAreas[1]
      ? `${weakAreas[1].label} — focus on ${weakAreas[1].conceptFocus[0]}`
      : historyWeak[1]
        ? `History + current test: ${historyWeak[1]}`
        : insufficient
  ];

  const suggestion = topWeakConcept
    ? `Review ${topWeakConcept} — identified from incorrect submitted answers.`
    : weakAreas[0]?.improvementFocus ?? insufficient;

  return { strengths, weaknesses, suggestion };
}

export function submitTest(
  test: AptitudeTestSet,
  answers: Record<string, number | null | undefined>,
  timeSpentSeconds: number,
  sectionTimeSpent: Partial<Record<AptitudeSectionKey, number>> = {}
): AptitudeTestResult {
  return evaluateAptitudeTest(test, answers, timeSpentSeconds, sectionTimeSpent);
}

export function evaluateAptitudeTest(
  test: AptitudeTestSet,
  answers: Record<string, number | null | undefined>,
  timeSpentSeconds: number,
  sectionTimeSpent: Partial<Record<AptitudeSectionKey, number>> = {}
): AptitudeTestResult {
  const { totalScore, maxScore, correctCount, sectionStats, conceptMap, difficultyStats } = calculateScore(
    test,
    answers
  );

  const accuracy = test.questions.length ? Math.round((correctCount / test.questions.length) * 100) : 0;
  const timeAllowedSeconds = test.durationMinutes * 60;
  const globalTimeEfficiency = sectionTimeEfficiency(timeSpentSeconds, timeAllowedSeconds);

  const sectionScores = Object.fromEntries(
    (Object.keys(sectionStats) as AptitudeSectionKey[]).map((key) => {
      const stat = sectionStats[key];
      const allowed = test.sectionTimeMinutes[key] * 60;
      const spent = sectionTimeSpent[key] ?? 0;
      return [
        key,
        {
          score: stat.score,
          max: stat.max,
          correct: stat.correct,
          wrong: stat.wrong,
          unanswered: stat.unanswered,
          total: stat.total,
          accuracy: stat.total ? Math.round((stat.correct / stat.total) * 100) : 0,
          timeSpentSeconds: spent,
          timeAllowedSeconds: allowed,
          timeEfficiency: sectionTimeEfficiency(spent, allowed)
        } satisfies SectionScore
      ];
    })
  ) as Record<AptitudeSectionKey, SectionScore>;

  const sectionAccuracies = (Object.keys(sectionScores) as AptitudeSectionKey[]).map(
    (k) => sectionScores[k].accuracy
  );

  const testPerformance = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;

  const {
    readinessScore,
    readinessLabel,
    sectionBalance,
    difficultyPerformance,
    improvementTrend
  } = computeInterviewReadinessScore({
    testPerformance,
    sectionAccuracies,
    difficultyStats,
    timeEfficiency: globalTimeEfficiency
  });

  const wrongConcepts = extractWrongConcepts(test, answers);
  const weakAreaGrounding = augmentWithUserHistory(
    groundWeakAreaDetection(Object.values(sectionStats)),
    getLearningMemory().userProgressTrend.length > 0
  );

  let weakAreas: WeakAreaReport[];
  let strongAreas: WeakAreaReport[];

  if (!weakAreaGrounding.sufficient) {
    weakAreas = [];
    strongAreas = [];
  } else {
    ({ weakAreas, strongAreas } = analyzeWeakAreas(test, sectionScores, conceptMap));
  }

  const conceptRows = Array.from(conceptMap.entries())
    .filter(([, stat]) => stat.correct < stat.total)
    .map(([key]) => ({ concept: key.split(":").slice(1).join(":") }));

  const prioritizedConcepts = prioritizeConcepts(conceptRows).map((r) => r.concept).slice(0, 5);

  const draftResult: AptitudeTestResult = {
    testId: test.id,
    testTitle: test.title,
    totalScore,
    maxScore,
    accuracy,
    timeEfficiency: globalTimeEfficiency,
    timeSpentSeconds,
    timeAllowedSeconds,
    sectionScores,
    weakAreas: [...weakAreas].sort(
      (a, b) =>
        getConceptPriorityWeight(b.conceptFocus[0] || "") -
        getConceptPriorityWeight(a.conceptFocus[0] || "")
    ),
    strongAreas,
    readinessScore,
    readinessLabel,
    personalizedInsight: buildPersonalizedInsight(
      weakAreas,
      strongAreas,
      prioritizedConcepts,
      wrongConcepts
    ),
    difficultyPerformance,
    sectionBalance,
    improvementTrend,
    prioritizedConcepts,
    aiValidation: {
      result: { readinessScore, accuracy },
      confidenceScore: 0,
      validationStatus: "partial",
      explanationTrace: "pending validation",
      confidenceTier: "low",
      reliabilityLevel: "Low"
    }
  };

  const aiValidation = validateAptitudeResult(draftResult);

  return {
    ...draftResult,
    aiValidation
  };
}

export { aptitudeTests };
