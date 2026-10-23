/**
 * Generates frontend/lib/data/aptitude-tests.ts
 * 10 AMCAT-style sets × 40 questions (10 per section, 4E/4M/2H)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../lib/data/aptitude-tests.ts");

const SECTIONS = [
  { key: "quantitative", label: "Quantitative Aptitude", minMin: 20, maxMin: 25 },
  { key: "logical", label: "Logical Reasoning", minMin: 15, maxMin: 20 },
  { key: "verbal", label: "Verbal Ability", minMin: 15, maxMin: 20 },
  { key: "dataInterpretation", label: "Data Interpretation", minMin: 10, maxMin: 15 }
];

const MARKS = { Easy: 1, Medium: 2, Hard: 3 };

const DIFF_PATTERN = ["Easy", "Easy", "Easy", "Easy", "Medium", "Medium", "Medium", "Medium", "Hard", "Hard"];

function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeOptions(correct, seed) {
  const deltas = [5, -5, 10, -10, 7, -7, 15];
  const opts = new Set([correct]);
  let i = 0;
  while (opts.size < 4 && i < deltas.length) {
    const v = correct + deltas[(seed + i) % deltas.length];
    if (v > 0) opts.add(v);
    i++;
  }
  while (opts.size < 4) opts.add(correct + opts.size);
  return shuffle([...opts].map(String), seed);
}

function correctIndex(options, correct) {
  return options.indexOf(String(correct));
}

function mentor(concept, mistake, conceptLine, whyCorrect, fix, tip) {
  return { mistake, conceptLine, whyCorrect, fix, tip };
}

const quantGens = [
  (set, i, diff) => {
    const pct = 10 + ((set + i) % 8) * 5;
    const val = (20 + set * 3 + i) * 10;
    const ans = Math.round((val * pct) / 100);
    const opts = makeOptions(ans, set * 100 + i);
    return {
      concept: "Percentages",
      question: `What is ${pct}% of ${val}?`,
      options: opts,
      correctIndex: correctIndex(opts, ans),
      mentor: mentor("Percentages", "Used wrong base value", "Percent = (Part/Base) × 100", `${pct}% of ${val} = ${ans}`, "Convert % to decimal before multiplying", "Write part = (pct/100) × whole first")
    };
  },
  (set, i, diff) => {
    const a = 3 + ((set + i) % 5);
    const b = 4 + ((set * 2 + i) % 6);
    const total = a + b;
    const opts = makeOptions(a, set * 50 + i);
    return {
      concept: "Ratios",
      question: `Divide ${a * 10}:${b * 10} in the ratio ${a}:${b}. What is the first share?`,
      options: opts,
      correctIndex: correctIndex(opts, a),
      mentor: mentor("Ratios", "Added ratios instead of proportional split", "Share = (Your ratio part / Total ratio) × Total", `First share uses ${a}/${total} of total`, "Add ratio parts for the whole", "Check: shares must sum to total")
    };
  },
  (set, i, diff) => {
    const rate = 4 + ((set + i) % 4);
    const hours = 5 + ((set + i) % 3);
    const ans = rate * hours;
    const opts = makeOptions(ans, set * 30 + i);
    return {
      concept: "Time & Work",
      question: `A worker completes ${rate} units/hour. How many units in ${hours} hours?`,
      options: opts,
      correctIndex: correctIndex(opts, ans),
      mentor: mentor("Time & Work", "Inverted rate and time", "Work = Rate × Time", `${rate}×${hours}=${ans}`, "Keep units consistent (per hour)", "Draw a rate-time table for harder problems")
    };
  },
  (set, i, diff) => {
    const cp = 200 + set * 20 + i * 5;
    const gain = 10 + (i % 5) * 2;
    const sp = Math.round(cp * (1 + gain / 100));
    const opts = makeOptions(sp, set * 20 + i).map(String);
    return {
      concept: "Profit & Loss",
      question: `Cost price is ₹${cp} with ${gain}% profit. Selling price?`,
      options: opts,
      correctIndex: correctIndex(opts, sp),
      mentor: mentor("Profit & Loss", "Applied discount instead of profit", "SP = CP × (1 ± profit%/100)", `SP = ${cp} × ${1 + gain / 100}`, "Decide sign: profit increases SP", "Mark CP → % change → SP")
    };
  },
  (set, i, diff) => {
    const speed = 30 + ((set + i) % 6) * 5;
    const time = 2 + (i % 4);
    const dist = speed * time;
    const opts = makeOptions(dist, set * 11 + i);
    return {
      concept: "Speed & Distance",
      question: `Speed ${speed} km/h for ${time} hours. Distance covered?`,
      options: opts,
      correctIndex: correctIndex(opts, dist),
      mentor: mentor("Speed & Distance", "Divided speed by time", "Distance = Speed × Time", `${speed}×${time}=${dist} km`, "Convert minutes to hours when needed", "Sketch timeline for multi-leg journeys")
    };
  },
  (set, i, diff) => {
    const n = 5 + (i % 4);
    const sum = n * (20 + set + i);
    const avg = sum / n;
    const opts = makeOptions(avg, set * 7 + i);
    return {
      concept: "Averages",
      question: `Sum of ${n} numbers is ${sum}. Average?`,
      options: opts,
      correctIndex: correctIndex(opts, avg),
      mentor: mentor("Averages", "Multiplied instead of dividing", "Average = Sum / Count", `${sum}/${n}=${avg}`, "Verify average lies near data range", "For weighted avg, use total/sum of weights")
    };
  },
  (set, i, diff) => {
    const n = 100 + set * 7 + i * 3;
    const rem = n % 9;
    const opts = makeOptions(rem, set * 3 + i);
    return {
      concept: "Number Systems",
      question: `Remainder when ${n} is divided by 9?`,
      options: opts,
      correctIndex: correctIndex(opts, rem),
      mentor: mentor("Number Systems", "Used last digit only", "Digital sum rule for mod 9", `Sum digits of ${n} → remainder ${rem}`, "Break large numbers into digit sums", "Mod 9 checks help verify arithmetic")
    };
  },
  (set, i, diff) => {
    const p = 1000 + set * 100;
    const r = 5 + (i % 3);
    const t = 2 + (i % 2);
    const si = Math.round((p * r * t) / 100);
    const opts = makeOptions(si, set * 9 + i);
    return {
      concept: "Simple Interest",
      question: `SI on ₹${p} at ${r}% for ${t} years?`,
      options: opts,
      correctIndex: correctIndex(opts, si),
      mentor: mentor("Simple Interest", "Forgot time factor", "SI = PRT/100", `(${p}×${r}×${t})/100=${si}`, "Keep rate annual unless stated monthly", "Compare SI vs CI for multi-year")
    };
  },
  (set, i, diff) => {
    const a = 12 + set + i;
    const b = 18 + set + i * 2;
    const lcm = (a * b) / gcd(a, b);
    const opts = makeOptions(lcm, set * 13 + i);
    return {
      concept: "LCM & HCF",
      question: `LCM of ${a} and ${b}?`,
      options: opts,
      correctIndex: correctIndex(opts, lcm),
      mentor: mentor("LCM & HCF", "Used HCF formula", "LCM = (a×b)/HCF", `LCM(${a},${b})=${lcm}`, "Prime factorize for quick LCM", "HCF divides both; LCM is multiple of both")
    };
  },
  (set, i, diff) => {
    const base = 2 + ((set + i) % 4);
    const exp = 3 + (i % 3);
    const ans = base ** exp;
    const opts = makeOptions(ans, set * 17 + i);
    return {
      concept: "Exponents",
      question: `Value of ${base}^${exp}?`,
      options: opts,
      correctIndex: correctIndex(opts, ans),
      mentor: mentor("Exponents", "Multiplied base × exponent", "Power = repeated multiplication", `${base}^${exp}=${ans}`, "Break powers using exponent laws", "Convert to prime bases when possible")
    };
  }
];

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

const logicalGens = [
  (set, i) => ({
    concept: "Syllogism",
    question: "All managers are leaders. Some leaders are mentors. Which conclusion definitely follows?",
    options: ["Some managers are mentors", "Some mentors are leaders", "All mentors are managers", "No manager is a mentor"],
    correctIndex: 1,
    mentor: mentor("Syllogism", "Assumed reverse relationship", "Valid conclusion must follow necessarily", "Only 'Some mentors are leaders' is safe", "Draw Venn circles before concluding", "Avoid absolute words unless given")
  }),
  (set, i) => ({
    concept: "Seating Arrangement",
    question: "A sits left of B, B sits left of C. Who is in the middle?",
    options: ["A", "B", "C", "Cannot determine"],
    correctIndex: 1,
    mentor: mentor("Seating Arrangement", "Ignored order direction", "Linear order: left < middle < right", "B is between A and C", "Convert words to positions", "Draw a line for linear seating")
  }),
  (set, i) => ({
    concept: "Blood Relations",
    question: "Pointing to a man, Rita says: 'He is the son of my mother's only brother.' Relation?",
    options: ["Brother", "Cousin", "Uncle", "Nephew"],
    correctIndex: 1,
    mentor: mentor("Blood Relations", "Confused uncle-nephew line", "Mother's brother = maternal uncle; his son = cousin", "Cousin is correct", "Map generation by generation", "Label genders only when needed")
  }),
  (set, i) => {
    const start = 2 + set + i;
    const ans = start + 6;
    return {
      concept: "Number Series",
      question: `Find next: ${start}, ${start + 2}, ${start + 4}, ${start + 6}, ?`,
      options: [String(ans), String(ans + 1), String(ans - 2), String(ans + 3)],
      correctIndex: 0,
      mentor: mentor("Number Series", "Used multiplication pattern", "Check constant difference first", `+2 pattern → ${ans}`, "Try difference, ratio, squares", "Write 1st/2nd differences")
    };
  },
  (set, i) => ({
    concept: "Coding-Decoding",
    question: "If CAT is coded as DBU, how is DOG coded?",
    options: ["EPH", "COF", "EOG", "FQI"],
    correctIndex: 0,
    mentor: mentor("Coding-Decoding", "Shifted only first letter", "Each letter shifted +1", "DOG → EPH", "Apply same rule to all letters", "Write alphabet positions")
  }),
  (set, i) => ({
    concept: "Direction Sense",
    question: "Walk 4 km North, then 3 km East. Shortest distance from start?",
    options: ["5 km", "7 km", "1 km", "12 km"],
    correctIndex: 0,
    mentor: mentor("Direction Sense", "Added distances directly", "Perpendicular legs form right triangle", "3-4-5 triangle → 5 km", "Sketch compass directions", "Use Pythagoras for right turns")
  }),
  (set, i) => ({
    concept: "Analogies",
    question: "Doctor : Hospital :: Teacher : ?",
    options: ["School", "Student", "Book", "Exam"],
    correctIndex: 0,
    mentor: mentor("Analogies", "Picked associated object not workplace", "First is role, second is workplace", "Teacher works at School", "Identify relationship type first", "Check both pairs same relation")
  }),
  (set, i) => ({
    concept: "Puzzles",
    question: "Only one of A/B is true. A: 'It is raining.' B: 'It is not raining.' Which is reliable?",
    options: ["A only", "B only", "Both", "Cannot decide without weather"],
    correctIndex: 3,
    mentor: mentor("Puzzles", "Assumed one must be true", "Contradictory statements need context", "Need external fact to decide", "List truth-table for small puzzles", "Contradictions can't both be true")
  }),
  (set, i) => ({
    concept: "Statement & Assumption",
    question: "Statement: 'Take an umbrella.' Assumption?",
    options: ["It may rain", "It is sunny", "Umbrellas are cheap", "Person owns a car"],
    correctIndex: 0,
    mentor: mentor("Statement & Assumption", "Picked unrelated assumption", "Assumption is implicit reason", "Umbrella implies rain risk", "Ask: why say this?", "Implicit ≠ stated fact")
  }),
  (set, i) => ({
    concept: "Data Sufficiency (Logic)",
    question: "Is x even? (1) x is divisible by 2. (2) x > 10",
    options: ["1 alone", "2 alone", "Both needed", "Neither"],
    correctIndex: 0,
    mentor: mentor("Data Sufficiency (Logic)", "Thought (2) helps parity", "Divisible by 2 defines even", "Statement 1 is sufficient", "Test each statement independently", "Eliminate clearly insufficient options")
  })
];

const verbalGens = [
  (set, i) => ({
    concept: "Grammar",
    question: "Choose correct: She ___ to the office every day.",
    options: ["go", "goes", "going", "gone"],
    correctIndex: 1,
    mentor: mentor("Grammar", "Missed subject-verb agreement", "Singular subject takes singular verb", "'She goes' is correct", "Identify subject number first", "Read sentence aloud for tense")
  }),
  (set, i) => ({
    concept: "Synonyms",
    question: "Synonym of 'BRIEF'",
    options: ["Short", "Heavy", "Late", "Weak"],
    correctIndex: 0,
    mentor: mentor("Synonyms", "Chose antonym-like word", "Synonym = similar meaning", "Brief ≈ Short", "Eliminate opposite meanings", "Check context if two seem close")
  }),
  (set, i) => ({
    concept: "Antonyms",
    question: "Antonym of 'EXPAND'",
    options: ["Contract", "Extend", "Widen", "Increase"],
    correctIndex: 0,
    mentor: mentor("Antonyms", "Selected synonym", "Antonym = opposite meaning", "Expand ↔ Contract", "Look for directional opposites", "Verify pair in a sentence")
  }),
  (set, i) => ({
    concept: "Sentence Correction",
    question: "Best version: 'He don’t know the answer.'",
    options: ["He doesn't know the answer.", "He don't knows the answer.", "He not know answer.", "He doesn't knows the answer."],
    correctIndex: 0,
    mentor: mentor("Sentence Correction", "Kept incorrect contraction", "Third person singular needs doesn't", "Doesn't + base verb", "Remove extra 's' after doesn't", "Scan subject-verb first")
  }),
  (set, i) => ({
    concept: "Para Jumbles",
    question: "Best opening sentence for a paragraph on teamwork:",
    options: ["Therefore, teams fail often.", "Teamwork improves outcomes when roles are clear.", "I like coffee.", "Numbers are important."],
    correctIndex: 1,
    mentor: mentor("Para Jumbles", "Chose conclusion sentence", "Opening introduces topic generally", "General teamwork statement opens best", "Find topic sentence before details", "Linkers like 'therefore' rarely open")
  }),
  (set, i) => ({
    concept: "Vocabulary",
    question: "Meaning of 'UBIQUITOUS'",
    options: ["Present everywhere", "Very rare", "Dangerous", "Temporary"],
    correctIndex: 0,
    mentor: mentor("Vocabulary", "Confused with 'unique'", "Ubiquitous = widespread", "Present everywhere", "Learn roots: ubique (everywhere)", "Eliminate opposites first")
  }),
  (set, i) => ({
    concept: "Idioms",
    question: "'Break the ice' means:",
    options: ["Start conversation", "Destroy something", "Freeze water", "End meeting"],
    correctIndex: 0,
    mentor: mentor("Idioms", "Took literal meaning", "Idiom = figurative usage", "Start social conversation", "Think metaphor not literal", "Group idioms by theme")
  }),
  (set, i) => ({
    concept: "Reading Comprehension",
    question: "Passage: 'Remote work increased productivity for focused tasks.' Best inference:",
    options: ["Remote work helps focused work", "Remote work reduces all productivity", "Office work is obsolete", "No one prefers remote work"],
    correctIndex: 0,
    mentor: mentor("Reading Comprehension", "Over-generalized", "Inference must be passage-bound", "Focused tasks benefited", "Stay close to stated scope", "Avoid extreme words")
  }),
  (set, i) => ({
    concept: "Spelling",
    question: "Correct spelling:",
    options: ["Accommodate", "Acomodate", "Accomodate", "Acommodate"],
    correctIndex: 0,
    mentor: mentor("Spelling", "Missed double consonants", "Accommodate has double c and m", "Accommodate", "Remember: 2C, 2M", "Write tricky words twice daily")
  }),
  (set, i) => ({
    concept: "One Word Substitution",
    question: "One who writes dictionaries:",
    options: ["Lexicographer", "Editor", "Calligrapher", "Linguist"],
    correctIndex: 0,
    mentor: mentor("One Word Substitution", "Confused related professions", "Lexicographer compiles dictionaries", "Lexicographer is precise", "Build OWL list by theme", "Link word roots to meaning")
  })
];

const diGens = [
  (set, i) => {
    const a = 20 + set + i;
    const b = 30 + set + i * 2;
    const total = a + b;
    const pctA = Math.round((a / total) * 100);
    return {
      concept: "Tables",
      question: `Dept A=${a}, Dept B=${b}. What % of total is Dept A?`,
      options: [`${pctA}%`, `${pctA + 5}%`, `${pctA - 5}%`, `${100 - pctA}%`],
      correctIndex: 0,
      mentor: mentor("Tables", "Used difference not share", "% share = part/total × 100", `${a}/${total}≈${pctA}%`, "Compute total first", "Round only at final step")
    };
  },
  (set, i) => {
    const q1 = 40 + set * 2;
    const q2 = q1 + 10;
    const growth = Math.round(((q2 - q1) / q1) * 100);
    return {
      concept: "Bar Charts",
      question: `Sales Q1=${q1}, Q2=${q2}. Q1→Q2 growth %?`,
      options: [`${growth}%`, `${growth + 5}%`, `${growth - 5}%`, "10%"],
      correctIndex: 0,
      mentor: mentor("Bar Charts", "Used absolute difference as %", "Growth% = (New-Old)/Old × 100", `${q2 - q1}/${q1}=${growth}%`, "Base is old value", "Label axes before calculating")
    };
  },
  (set, i) => {
    const parts = [25, 35, 40];
    const target = parts[(set + i) % 3];
    return {
      concept: "Pie Charts",
      question: `Pie share: 25%, 35%, 40%. Largest sector?`,
      options: ["40%", "35%", "25%", "All equal"],
      correctIndex: 0,
      mentor: mentor("Pie Charts", "Added percentages", "Compare given sector sizes", "40% is largest", "Largest slice has max angle", "Check total = 100%")
    };
  },
  (set, i) => {
    const y1 = 10 + set;
    const y2 = y1 + 4;
    const y3 = y2 + 4;
    return {
      concept: "Line Graphs",
      question: `Values: Year1=${y1}, Year2=${y2}, Year3=${y3}. Pattern?`,
      options: ["Constant increase", "Constant decrease", "Fluctuating", "No trend"],
      correctIndex: 0,
      mentor: mentor("Line Graphs", "Misread slope direction", "Equal yearly increase → linear up", "+4 each year", "Compute deltas between points", "Slope sign shows trend")
    };
  },
  (set, i) => {
    const rev = 500 + set * 20;
    const cost = 300 + set * 10;
    const profit = rev - cost;
    return {
      concept: "Caselets",
      question: `Revenue ₹${rev}, Cost ₹${cost}. Profit?`,
      options: [`₹${profit}`, `₹${profit + 20}`, `₹${profit - 20}`, `₹${rev + cost}`],
      correctIndex: 0,
      mentor: mentor("Caselets", "Added revenue and cost", "Profit = Revenue − Cost", `${rev}-${cost}=${profit}`, "List given metrics first", "Watch units in caselets")
    };
  },
  (set, i) => ({
    concept: "Data Sufficiency",
    question: "Is average of 4 numbers > 10? (1) Sum = 48. (2) Largest number = 20",
    options: ["1 alone sufficient", "2 alone sufficient", "Both needed", "Neither"],
    correctIndex: 0,
    mentor: mentor("Data Sufficiency", "Thought largest value fixes average", "Average = Sum/Count", "48/4=12 > 10 using (1)", "Compute average when sum given", "Test one statement at a time")
  }),
  (set, i) => {
    const old = 200 + set * 5;
    const inc = 10 + (i % 3) * 5;
    const neu = Math.round(old * (1 + inc / 100));
    return {
      concept: "Percentage Change",
      question: `Value ${old} increases ${inc}%. New value?`,
      options: [String(neu), String(neu + 10), String(neu - 10), String(old + inc)],
      correctIndex: 0,
      mentor: mentor("Percentage Change", "Added % to value directly", "New = Old × (1 + p/100)", `${old}×${1 + inc / 100}=${neu}`, "Distinguish % change vs points", "Mark old as base")
    };
  },
  (set, i) => {
    const s = 10 + set + i;
    const c = 5 + i;
    const avg = (s + s + 20) / 3;
    const opts = makeOptions(Math.round(avg * 10) / 10, set + i);
    return {
      concept: "Averages from Data",
      question: `Marks: ${s}, ${s + 5}, ${s + 10}. Average?`,
      options: opts.map(String),
      correctIndex: correctIndex(opts.map(String), Math.round(avg * 10) / 10),
      mentor: mentor("Averages from Data", "Used middle value only", "Average = sum/count", "Sum all marks then /3", "Quick check: avg near middle", "For weighted data, use weights")
    };
  },
  (set, i) => {
    const male = 60 + (set % 5) * 2;
    const female = 100 - male;
    return {
      concept: "Ratio from Data",
      question: `Class has ${male}% males. Female %?`,
      options: [`${female}%`, `${male}%`, "50%", "Cannot find"],
      correctIndex: 0,
      mentor: mentor("Ratio from Data", "Forgot total 100%", "Complementary % sum to 100", `${100 - male}% females`, "Check total percentage = 100", "Convert % to ratio when needed")
    };
  },
  (set, i) => {
    const base = 50 + set * 4;
    const mult = 1.2;
    const ans = Math.round(base * mult);
    return {
      concept: "Index Charts",
      question: `Index value ${base} grows 20%. New index?`,
      options: [String(ans), String(ans + 5), String(base + 20), String(ans - 5)],
      correctIndex: 0,
      mentor: mentor("Index Charts", "Added 20 to index", "Percent change multiplies base", `${base}×1.2=${ans}`, "Index uses relative scale", "Track base year in index problems")
    };
  }
];

function buildSectionQuestions(setId, sectionKey, generators) {
  return DIFF_PATTERN.map((difficulty, idx) => {
    const gen = generators[idx % generators.length];
    const base = gen(setId, idx, difficulty);
    return {
      id: `set${setId}-${sectionKey}-${idx + 1}`,
      section: sectionKey,
      difficulty,
      marks: MARKS[difficulty],
      correctAnswer: base.correctIndex,
      ...base
    };
  });
}

function sectionMinutesForSet(setId, section) {
  const t = (setId - 1) / 9;
  return Math.round(section.minMin + t * (section.maxMin - section.minMin));
}

const sets = Array.from({ length: 10 }, (_, i) => {
  const setId = i + 1;
  const sectionTimeMinutes = Object.fromEntries(SECTIONS.map((s) => [s.key, sectionMinutesForSet(setId, s)]));
  const durationMinutes = Object.values(sectionTimeMinutes).reduce((sum, m) => sum + m, 0);

  const questions = [
    ...buildSectionQuestions(setId, "quantitative", quantGens),
    ...buildSectionQuestions(setId, "logical", logicalGens),
    ...buildSectionQuestions(setId, "verbal", verbalGens),
    ...buildSectionQuestions(setId, "dataInterpretation", diGens)
  ];

  return {
    id: setId,
    title: `Aptitude Set ${setId}`,
    durationMinutes,
    sectionTimeMinutes,
    questions
  };
});

const header = `/** AUTO-GENERATED by scripts/build-aptitude-bank.mjs — do not edit manually */
export type AptitudeSectionKey = "quantitative" | "logical" | "verbal" | "dataInterpretation";
export type AptitudeDifficulty = "Easy" | "Medium" | "Hard";

export type AptitudeMentorHint = {
  mistake: string;
  conceptLine: string;
  whyCorrect: string;
  fix: string;
  tip: string;
};

export type AptitudeQuestion = {
  id: string;
  section: AptitudeSectionKey;
  concept: string;
  difficulty: AptitudeDifficulty;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  correctAnswer: number;
  marks: number;
  mentor?: AptitudeMentorHint;
};

export type AptitudeQuestionCompact = {
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  difficulty: AptitudeDifficulty;
  marks: number;
};

export type AptitudeSetBundle = {
  quant: AptitudeQuestionCompact[];
  reasoning: AptitudeQuestionCompact[];
  verbal: AptitudeQuestionCompact[];
  di: AptitudeQuestionCompact[];
};

export type AptitudeTestSet = {
  id: number;
  title: string;
  durationMinutes: number;
  sectionTimeMinutes: Record<AptitudeSectionKey, number>;
  questions: AptitudeQuestion[];
};

export const APTITUDE_SECTIONS = [
  { key: "quantitative" as const, label: "Quantitative Aptitude", shortLabel: "Quant" },
  { key: "logical" as const, label: "Logical Reasoning", shortLabel: "Logic" },
  { key: "verbal" as const, label: "Verbal Ability", shortLabel: "Verbal" },
  { key: "dataInterpretation" as const, label: "Data Interpretation", shortLabel: "DI" }
];

export const APTITUDE_TEST_SETS: AptitudeTestSet[] = `;

const aptitudeTestsObj = Object.fromEntries(
  sets.map((set) => {
    const compact = (section) =>
      set.questions
        .filter((q) => q.section === section)
        .map((q) => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          difficulty: q.difficulty,
          marks: q.marks
        }));
    return [
      `set${set.id}`,
      {
        quant: compact("quantitative"),
        reasoning: compact("logical"),
        verbal: compact("verbal"),
        di: compact("dataInterpretation")
      }
    ];
  })
);

const aptitudeTestsExport = `

export const aptitudeTests: Record<string, AptitudeSetBundle> = ${JSON.stringify(aptitudeTestsObj, null, 2)};
`;

const footer = `;

export function getAptitudeTest(testId: number): AptitudeTestSet | undefined {
  return APTITUDE_TEST_SETS.find((set) => set.id === testId);
}
`;

fs.writeFileSync(OUT, header + JSON.stringify(sets, null, 2) + aptitudeTestsExport + footer, "utf8");
console.log(`Wrote ${OUT} — ${sets.length} sets, ${sets[0].questions.length} questions each`);
