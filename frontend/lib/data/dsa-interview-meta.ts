export type DsaDifficulty = "Easy" | "Medium" | "Hard";
export type DsaQuestionTag = "must-do" | "frequent" | "advanced";

export type DsaQuestion = {
  title: string;
  difficulty: DsaDifficulty;
  url: string;
  tag?: DsaQuestionTag;
};

export type DsaCategoryKey =
  | "arrays"
  | "strings"
  | "linkedList"
  | "stackQueue"
  | "binarySearch"
  | "trees"
  | "heaps"
  | "graphs"
  | "dp"
  | "greedy"
  | "backtracking";

export type DsaCategory = {
  key: DsaCategoryKey;
  label: string;
  description: string;
};

export const DSA_CATEGORIES: DsaCategory[] = [
  { key: "arrays", label: "Arrays", description: "Two pointers, sliding window, prefix sums" },
  { key: "strings", label: "Strings", description: "Hashing, windows, pattern matching" },
  { key: "linkedList", label: "Linked List", description: "Pointers, reversal, cycle detection" },
  { key: "stackQueue", label: "Stack & Queue", description: "Monotonic stack, BFS-style queues" },
  { key: "binarySearch", label: "Binary Search", description: "Sorted arrays, search space reduction" },
  { key: "trees", label: "Trees", description: "Binary tree, BST traversals & validation" },
  { key: "heaps", label: "Heaps", description: "Priority queue, top-K patterns" },
  { key: "graphs", label: "Graphs", description: "DFS, BFS, topological sort" },
  { key: "dp", label: "Dynamic Programming", description: "1D/2D state, optimal substructure" },
  { key: "greedy", label: "Greedy", description: "Local choices, interval scheduling" },
  { key: "backtracking", label: "Backtracking", description: "Combinations, permutations, search" }
];

export const QUESTIONS_PER_CATEGORY = 50;
