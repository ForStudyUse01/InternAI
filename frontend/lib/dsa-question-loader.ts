import type { DsaCategoryKey, DsaQuestion } from "@/lib/data/dsa-interview-meta";

type DsaBankModule = {
  dsaQuestions: Record<DsaCategoryKey, DsaQuestion[]>;
  getCategoryDifficultyCounts: (category: DsaCategoryKey) => Record<string, number>;
};

let bankPromise: Promise<DsaBankModule> | null = null;

export function loadDsaQuestionBank(): Promise<DsaBankModule> {
  if (!bankPromise) {
    bankPromise = import("@/lib/data/dsa-interview-questions").then((mod) => ({
      dsaQuestions: mod.dsaQuestions,
      getCategoryDifficultyCounts: mod.getCategoryDifficultyCounts
    }));
  }
  return bankPromise;
}
