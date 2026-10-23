import type { AptitudeSectionKey } from "@/lib/data/aptitude-tests";

/** Metadata only — no questions exposed before test start */
export type AptitudeTestMeta = {
  id: number;
  title: string;
  durationMinutes: number;
  sectionTimeMinutes: Record<AptitudeSectionKey, number>;
  questionCount: number;
};

export const APTITUDE_TEST_META: AptitudeTestMeta[] = [
  {
    id: 1,
    title: "Aptitude Set 1",
    durationMinutes: 60,
    sectionTimeMinutes: { quantitative: 20, logical: 15, verbal: 15, dataInterpretation: 10 },
    questionCount: 40
  },
  {
    id: 2,
    title: "Aptitude Set 2",
    durationMinutes: 64,
    sectionTimeMinutes: { quantitative: 21, logical: 16, verbal: 16, dataInterpretation: 11 },
    questionCount: 40
  },
  {
    id: 3,
    title: "Aptitude Set 3",
    durationMinutes: 64,
    sectionTimeMinutes: { quantitative: 21, logical: 16, verbal: 16, dataInterpretation: 11 },
    questionCount: 40
  },
  {
    id: 4,
    title: "Aptitude Set 4",
    durationMinutes: 68,
    sectionTimeMinutes: { quantitative: 22, logical: 17, verbal: 17, dataInterpretation: 12 },
    questionCount: 40
  },
  {
    id: 5,
    title: "Aptitude Set 5",
    durationMinutes: 68,
    sectionTimeMinutes: { quantitative: 22, logical: 17, verbal: 17, dataInterpretation: 12 },
    questionCount: 40
  },
  {
    id: 6,
    title: "Aptitude Set 6",
    durationMinutes: 72,
    sectionTimeMinutes: { quantitative: 23, logical: 18, verbal: 18, dataInterpretation: 13 },
    questionCount: 40
  },
  {
    id: 7,
    title: "Aptitude Set 7",
    durationMinutes: 72,
    sectionTimeMinutes: { quantitative: 23, logical: 18, verbal: 18, dataInterpretation: 13 },
    questionCount: 40
  },
  {
    id: 8,
    title: "Aptitude Set 8",
    durationMinutes: 76,
    sectionTimeMinutes: { quantitative: 24, logical: 19, verbal: 19, dataInterpretation: 14 },
    questionCount: 40
  },
  {
    id: 9,
    title: "Aptitude Set 9",
    durationMinutes: 76,
    sectionTimeMinutes: { quantitative: 24, logical: 19, verbal: 19, dataInterpretation: 14 },
    questionCount: 40
  },
  {
    id: 10,
    title: "Aptitude Set 10",
    durationMinutes: 80,
    sectionTimeMinutes: { quantitative: 25, logical: 20, verbal: 20, dataInterpretation: 15 },
    questionCount: 40
  }
];

export function getTestMeta(testId: number): AptitudeTestMeta | undefined {
  return APTITUDE_TEST_META.find((set) => set.id === testId);
}
