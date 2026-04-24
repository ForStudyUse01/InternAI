import { useMemo, useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api/client";
import type { Application, PaginatedData, RecommendationItem, ResumeParsedView } from "@/types/common";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { EnergyStreamBackground } from "@/components/ui/EnergyStreamBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { InternDashboardCursor } from "@/components/intern/InternDashboardCursor";
import { useAsyncData } from "@/hooks/useAsyncData";

interface RecommendationResponse extends PaginatedData<RecommendationItem> {
  emptyStateMessage?: string;
}

interface ParsedProject {
  title: string;
  description: string[];
  link: string;
}

interface ParsedResumeData {
  name: string;
  email: string;
  skills: string[];
  education: string[];
  experience: string[];
  /** Project titles (derived from structured entries) */
  projects: string[];
  projectEntries: ParsedProject[];
  rawText: string;
}

interface ResumeInsights {
  resumeScore: number;
  skillGap: string[];
  suggestions: string[];
}

const SKILL_SYNONYMS: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  node: "node.js",
  reactjs: "react",
  nextjs: "next.js",
  "next js": "next.js",
  "express.js": "express",
  mongo: "mongodb",
  postgresql: "postgresql",
  py: "python",
  ml: "machine learning",
  ai: "artificial intelligence",
};

const SKILL_CATALOG = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node.js",
  "express",
  "mongodb",
  "postgresql",
  "sql",
  "python",
  "java",
  "c++",
  "c#",
  "html",
  "css",
  "tailwind",
  "git",
  "docker",
  "aws",
  "machine learning",
  "artificial intelligence",
  "data analysis",
  "figma",
  "communication",
  "problem solving",
];

gsap.registerPlugin(useGSAP, ScrollTrigger);
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function normalizeSkill(skill: string): string {
  const value = skill.trim().toLowerCase();
  return SKILL_SYNONYMS[value] ?? value;
}

function normalizeSkillArray(skills: string[]): string[] {
  const normalized = skills
    .map(normalizeSkill)
    .filter((skill) => skill.length >= 2);
  return [...new Set(normalized)];
}

function parseSectionLines(text: string, headingPattern: RegExp): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headingIndex = lines.findIndex((line) => headingPattern.test(line.toLowerCase()));
  if (headingIndex === -1) return [];
  const values: string[] = [];
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^(education|experience|projects?|skills?|certifications?|summary|profile)\b/i.test(line)) {
      break;
    }
    values.push(line.replace(/^[-*]\s*/, ""));
  }
  return values.slice(0, 8);
}

function isNextSectionHeading(line: string): boolean {
  return /^(education|experience|skills?|certifications?|summary|profile|publications?|awards?|references?|languages?|interests?|work\s+history|employment)\b/i.test(
    line.trim(),
  );
}

function extractUrlsFromLine(line: string): string[] {
  const found: string[] = [];
  const re = /https?:\/\/[^\s<)\],;]+|(?:www\.)?github\.com\/[^\s<)\],;]+/gi;
  let m: RegExpExecArray | null = re.exec(line);
  while (m !== null) {
    found.push(m[0].replace(/[.,;:!?)]+$/, ""));
    m = re.exec(line);
  }
  return found;
}

function stripLeadingBullet(line: string): string | null {
  const trimmed = line.trim();
  const patterns = [
    /^\u2022\s*(.+)$/,
    /^\u2023\s*(.+)$/,
    /^•\s*(.+)$/,
    /^\*\s+(.+)$/,
    /^-\s+(.+)$/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

/** Lines belonging to Projects / Project Experience until the next major section. */
function extractProjectSectionLines(text: string): string[] {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim());
  let start = -1;
  const prefix: string[] = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    if (!line) continue;
    const heading = line.match(/^(projects?|project experience)\s*:?\s*(.*)$/i);
    if (heading) {
      start = i;
      const rest = heading[2]?.trim() ?? "";
      if (rest) prefix.push(rest);
      break;
    }
  }

  if (start === -1) {
    const flat = text.replace(/\r\n/g, "\n");
    const m = flat.match(/\b(projects?|project experience)\b\s*:?\s*/i);
    if (!m || m.index === undefined) return [];
    const tail = flat.slice(m.index + m[0].length);
    return tail
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !isNextSectionHeading(l))
      .slice(0, 80);
  }

  const out: string[] = [...prefix];
  for (let i = start + 1; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    if (!line) continue;
    if (isNextSectionHeading(line)) break;
    out.push(line);
  }
  return out;
}

function parseProjectsStructured(text: string): ParsedProject[] {
  const lines = extractProjectSectionLines(text);
  if (!lines.length) return [];

  const projects: ParsedProject[] = [];
  let cur: ParsedProject | null = null;

  const flush = () => {
    if (!cur) return;
    const hasBody = Boolean(cur.title) || cur.description.length > 0 || Boolean(cur.link);
    if (!hasBody) {
      cur = null;
      return;
    }
    projects.push({
      title: (cur.title || "Project").replace(/\*\*/g, "").trim(),
      description: cur.description.slice(0, 12),
      link: cur.link ?? "",
    });
    cur = null;
  };

  const startProject = (titleLine: string, linkFromLine: string) => {
    flush();
    const urls = extractUrlsFromLine(titleLine);
    const link = linkFromLine || urls[0] || "";
    let title = titleLine;
    for (const u of urls) title = title.replace(u, "");
    title = title.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    cur = { title: title || "Project", description: [], link };
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const bullet = stripLeadingBullet(line);
    if (bullet !== null) {
      if (!cur) cur = { title: "Project", description: [], link: "" };
      const urls = extractUrlsFromLine(line);
      if (urls[0]) cur.link = urls[0];
      cur.description.push(bullet);
      continue;
    }

    const urls = extractUrlsFromLine(line);
    let rest = line;
    for (const u of urls) rest = rest.replace(u, "");
    rest = rest.replace(/\s+/g, " ").trim();

    if (urls.length && !rest) {
      if (!cur) cur = { title: "Project", description: [], link: urls[0] ?? "" };
      else cur.link = urls[0] ?? cur.link;
      continue;
    }

    startProject(rest || line, urls[0] ?? "");
  }

  flush();
  return projects.slice(0, 12);
}

function mapServerProjectStrings(rows: string[]): ParsedProject[] {
  return rows.map((row) => {
    const urls = extractUrlsFromLine(row);
    let title = row;
    for (const u of urls) title = title.replace(u, "");
    title = title.replace(/\s+/g, " ").trim() || "Project";
    return { title, description: [], link: urls[0] ?? "" };
  });
}

function extractName(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (/^[a-zA-Z][a-zA-Z\s.'-]{2,40}$/.test(line) && !/@/.test(line)) {
      return line;
    }
  }
  return "";
}

function extractEmail(text: string): string {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i);
  return match?.[0] ?? "";
}

function extractSkills(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  const matched = SKILL_CATALOG.filter((skill) => lowercaseText.includes(skill.toLowerCase()));
  const rawSkillLines = parseSectionLines(text, /^skills?/).flatMap((line) =>
    line
      .split(/[|,;/]/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return normalizeSkillArray([...matched, ...rawSkillLines]);
}

function scoreResume(parsed: ParsedResumeData, targetSkills: string[]): ResumeInsights {
  const normalizedTargetSkills = normalizeSkillArray(targetSkills);
  const normalizedResumeSkills = normalizeSkillArray(parsed.skills);
  const matchedSkills = normalizedTargetSkills.filter((skill) => normalizedResumeSkills.includes(skill));
  const skillCoverage = normalizedTargetSkills.length ? matchedSkills.length / normalizedTargetSkills.length : 1;
  const structureScore =
    (parsed.name ? 0.15 : 0) +
    (parsed.email ? 0.1 : 0) +
    (parsed.education.length ? 0.15 : 0) +
    (parsed.experience.length ? 0.2 : 0) +
    (parsed.projectEntries.length ? 0.15 : 0) +
    (parsed.skills.length >= 5 ? 0.15 : 0) +
    (parsed.rawText.length > 1200 ? 0.1 : 0.05);
  const score = Math.round(Math.min(1, skillCoverage * 0.6 + structureScore * 0.4) * 100);
  const skillGap = normalizedTargetSkills.filter((skill) => !normalizedResumeSkills.includes(skill));
  const suggestions = [
    parsed.projectEntries.length < 2 ? "Add 2-3 quantified projects with measurable outcomes." : "",
    parsed.experience.length < 2 ? "Expand experience bullets with impact and tools used." : "",
    skillGap.length > 0 ? `Highlight or learn missing skills: ${skillGap.slice(0, 5).join(", ")}.` : "",
    parsed.rawText.length < 900 ? "Increase resume detail with concise, high-signal bullet points." : "",
  ].filter(Boolean);
  return { resumeScore: score, skillGap, suggestions };
}

async function extractTextFromPdf(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: bytes });
  const pdf = await task.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }
  return pages.join("\n\n");
}

async function extractTextFromDocx(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: bytes });
  return result.value;
}

function cleanResumeText(raw: string): string {
  return raw
    .split("\0")
    .join(" ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseResumeFromText(rawText: string): ParsedResumeData {
  const text = cleanResumeText(rawText);
  const structured = parseProjectsStructured(text);
  const projectEntries =
    structured.length > 0
      ? structured
      : parseSectionLines(text, /^projects?/).map((t) => ({
          title: t.replace(/\*\*/g, "").trim() || "Project",
          description: [] as string[],
          link: extractUrlsFromLine(t)[0] ?? "",
        }));
  return {
    name: extractName(text),
    email: extractEmail(text),
    skills: extractSkills(text),
    education: parseSectionLines(text, /^education/),
    experience: parseSectionLines(text, /^experience/),
    projects: projectEntries.map((p) => p.title),
    projectEntries,
    rawText: text,
  };
}

export function InternDashboardPage() {
  const { token } = useAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [manualSkills, setManualSkills] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [parsingResume, setParsingResume] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [localParsedResume, setLocalParsedResume] = useState<ParsedResumeData | null>(null);
  const [localInsights, setLocalInsights] = useState<ResumeInsights | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);
  const skillsSectionRef = useRef<HTMLDivElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const analyticsRef = useRef<HTMLDivElement | null>(null);
  const internshipsGridRef = useRef<HTMLDivElement | null>(null);
  const projectsGridRef = useRef<HTMLDivElement | null>(null);
  const scoreValueRef = useRef<HTMLSpanElement | null>(null);
  const scoreBarFillRef = useRef<HTMLDivElement | null>(null);

  const resumeState = useAsyncData(async () => {
    const response = await apiClient.get<ResumeParsedView>("/resume/parsed", token);
    return response.data ?? null;
  }, [token, refreshTick]);

  const recommendationState = useAsyncData(async () => {
    const response = await apiClient.get<RecommendationResponse>("/recommendations?page=1&limit=10", token);
    return response.data ?? { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }, [token, refreshTick]);

  const applicationState = useAsyncData(async () => {
    const response = await apiClient.get<PaginatedData<Application>>("/applications/intern/me?page=1&limit=10", token);
    return response.data ?? { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }, [token, refreshTick]);

  const noResumeMessage = useMemo(() => {
    if (recommendationState.data?.emptyStateMessage) {
      return recommendationState.data.emptyStateMessage;
    }

    if (!resumeState.data && !resumeState.loading) {
      return "Upload your resume to get accurate internship recommendations.";
    }

    return null;
  }, [recommendationState.data, resumeState.data, resumeState.loading]);

  const recommendationSkills = useMemo(() => {
    const items = recommendationState.data?.items ?? [];
    const skills = items.flatMap((item) => [...item.internship.requiredSkills, ...item.internship.preferredSkills]);
    return normalizeSkillArray(skills);
  }, [recommendationState.data]);

  const recommendationInternKey = useMemo(
    () => recommendationState.data?.items.map((item) => item.internship.id).join(",") ?? "",
    [recommendationState.data?.items],
  );

  async function handleUploadResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resumeFile) {
      toast.error("Please choose a resume file.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);
    if (manualSkills.trim()) {
      formData.append("manualSkills", manualSkills);
    }

    setSubmitting(true);

    try {
      await apiClient.post("/resume/upload", formData, token, true);
      toast.success("Resume uploaded successfully.");
      setResumeFile(null);
      setManualSkills("");
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLocalResumeAnalysis(file: File) {
    setParsingResume(true);
    try {
      const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
      const extractedText = isPdf ? await extractTextFromPdf(file) : await extractTextFromDocx(file);
      const parsed = parseResumeFromText(extractedText);
      const insights = scoreResume(parsed, recommendationSkills);
      setLocalParsedResume(parsed);
      setLocalInsights(insights);
      setManualSkills(parsed.skills.join(", "));
      toast.success("Resume parsed locally with AI-style insights.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not parse resume file.");
    } finally {
      setParsingResume(false);
    }
  }

  async function handleManualSkillsUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const skills = manualSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

      await apiClient.patch("/resume/manual-skills", { skills }, token);
      toast.success("Manual skills updated.");
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Manual skill update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApply(internshipId: string) {
    setApplyingId(internshipId);
    try {
      await apiClient.post("/applications", { internshipId }, token);
      toast.success("Application submitted.");
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application failed");
    } finally {
      setApplyingId(null);
    }
  }

  const profileSummary = {
    skills: localParsedResume?.skills.length ?? resumeState.data?.skills.length ?? 0,
    projects:
      localParsedResume?.projectEntries?.length ??
      localParsedResume?.projects.length ??
      resumeState.data?.projects.length ??
      0,
    applications: applicationState.data?.items.length ?? 0,
    score: localInsights?.resumeScore ?? resumeState.data?.resumeScore ?? 0,
  };

  const displaySkills = useMemo(
    () =>
      normalizeSkillArray([
        ...(localParsedResume?.skills ?? []),
        ...(resumeState.data?.skills ?? []),
        ...manualSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ]),
    [localParsedResume?.skills, resumeState.data?.skills, manualSkills],
  );

  const displayExperience = useMemo(() => localParsedResume?.experience ?? [], [localParsedResume?.experience]);

  const displayProjectEntries = useMemo(() => {
    const local = localParsedResume?.projectEntries;
    if (local && local.length > 0) return local;
    return mapServerProjectStrings(resumeState.data?.projects ?? []);
  }, [localParsedResume?.projectEntries, resumeState.data?.projects]);

  const projectsAnimKey = useMemo(
    () => displayProjectEntries.map((p) => `${p.title}|${p.link}|${p.description.join("¦")}`).join("§"),
    [displayProjectEntries],
  );

  const hasResumeContent = Boolean(localParsedResume || resumeState.data);
  const resumeBusy = resumeState.loading || parsingResume;

  const analyticsBars = useMemo(
    () => [
      { label: "Resume score", value: profileSummary.score },
      { label: "Skill breadth", value: Math.min(100, profileSummary.skills * 9) },
      { label: "Project signal", value: Math.min(100, profileSummary.projects * 18) },
      { label: "Application momentum", value: Math.min(100, profileSummary.applications * 22) },
    ],
    [profileSummary.score, profileSummary.skills, profileSummary.projects, profileSummary.applications],
  );

  const suggestionsKey = (localInsights?.suggestions ?? []).join("|");

  useGSAP(() => {
    const root = dashboardRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    const scrollBase = {
      trigger: root,
      start: "top bottom",
      end: "bottom top",
    };

    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
      const slow = root.querySelectorAll(".js-parallax-slow");
      const mid = root.querySelectorAll(".js-parallax-mid");

      gsap.to(slow, {
        yPercent: 16,
        ease: "none",
        scrollTrigger: { ...scrollBase, scrub: 1.15 },
      });
      gsap.to(mid, {
        yPercent: 7,
        ease: "none",
        scrollTrigger: { ...scrollBase, scrub: 0.9 },
      });

      const cards = root.querySelectorAll(".js-dashboard-card");
      gsap.from(cards, {
        y: 28,
        autoAlpha: 0,
        duration: 0.75,
        ease: "power3.out",
        stagger: { each: 0.05, from: "start" },
      });
    });

    mm.add("(prefers-reduced-motion: reduce), (max-width: 767px)", () => {
      const cards = root.querySelectorAll(".js-dashboard-card");
      gsap.from(cards, {
        y: 14,
        autoAlpha: 0,
        duration: 0.42,
        ease: "power2.out",
        stagger: 0.04,
      });
    });

    return () => mm.revert();
  }, { scope: dashboardRef });

  useGSAP(() => {
    const el = scoreValueRef.current;
    if (!el) return;
    const counter = { v: 0 };
    gsap.to(counter, {
      v: profileSummary.score,
      duration: 1.35,
      ease: "expo.out",
      onUpdate: () => {
        el.textContent = String(Math.round(counter.v));
      },
    });
  }, { dependencies: [profileSummary.score], scope: dashboardRef, revertOnUpdate: true });

  useGSAP(() => {
    const el = scoreBarFillRef.current;
    if (!el) return;
    const target = Math.min(100, Math.max(0, profileSummary.score)) / 100;
    const origin = { transformOrigin: "left center" as const };
    if (prefersReducedMotion()) {
      gsap.set(el, { scaleX: target, ...origin });
      return;
    }
    gsap.fromTo(
      el,
      { scaleX: 0, ...origin },
      {
        scaleX: target,
        duration: 1.2,
        ease: "power3.out",
        ...origin,
      },
    );
  }, { dependencies: [profileSummary.score], scope: dashboardRef, revertOnUpdate: true });

  useGSAP(() => {
    const root = skillsSectionRef.current;
    if (!root) return;
    const chips = root.querySelectorAll(".js-skill-chip");
    if (!chips.length) return;
    gsap.from(chips, {
      y: 6,
      autoAlpha: 0,
      duration: 0.36,
      stagger: 0.03,
      ease: "power2.out",
    });
  }, { dependencies: [displaySkills.join("|")], scope: skillsSectionRef, revertOnUpdate: true });

  useGSAP(() => {
    const root = suggestionsRef.current;
    if (!root) return;
    const rows = root.querySelectorAll(".js-suggestion");
    if (!rows.length) return;
    gsap.from(rows, {
      x: 20,
      autoAlpha: 0,
      duration: 0.52,
      stagger: 0.11,
      ease: "power3.out",
    });
  }, { dependencies: [suggestionsKey], scope: suggestionsRef, revertOnUpdate: true });

  useGSAP(() => {
    const root = analyticsRef.current;
    if (!root) return;
    const fills = root.querySelectorAll(".bar-fill");
    if (!fills.length) return;
    const origin = { transformOrigin: "left center" as const };
    fills.forEach((node, index) => {
      const raw = Number((node as HTMLElement).dataset.value ?? "0");
      const target = Math.min(100, Math.max(0, raw)) / 100;
      if (prefersReducedMotion()) {
        gsap.set(node, { scaleX: target, ...origin });
        return;
      }
      gsap.fromTo(
        node,
        { scaleX: 0, ...origin },
        {
          scaleX: target,
          duration: 1.2,
          ease: "power3.out",
          delay: index * 0.08,
          ...origin,
          scrollTrigger: {
            trigger: root,
            start: "top 90%",
            once: true,
          },
        },
      );
    });
  }, {
    dependencies: [analyticsBars.map((b) => b.value).join(",")],
    scope: analyticsRef,
    revertOnUpdate: true,
  });

  useGSAP(() => {
    const root = internshipsGridRef.current;
    if (!root) return;
    const cards = root.querySelectorAll(".js-intern-card");
    if (!cards.length) return;
    gsap.from(cards, {
      y: 24,
      autoAlpha: 0,
      duration: 0.65,
      ease: "power3.out",
      stagger: 0.06,
      scrollTrigger: {
        trigger: root,
        start: "top 88%",
        once: true,
      },
    });
  }, { dependencies: [recommendationInternKey], scope: internshipsGridRef, revertOnUpdate: true });

  useGSAP(() => {
    const root = projectsGridRef.current;
    if (!root) return;
    const cards = root.querySelectorAll(".js-project-card");
    if (!cards.length) return;
    if (prefersReducedMotion()) return;
    gsap.from(cards, {
      y: 16,
      autoAlpha: 0,
      duration: 0.52,
      stagger: 0.08,
      ease: "power3.out",
    });
  }, { dependencies: [projectsAnimKey], scope: projectsGridRef, revertOnUpdate: true });

  return (
    <section
      ref={dashboardRef}
      className="intern-dashboard-page relative isolate min-h-screen overflow-hidden py-2 text-white"
    >
      <div className="ambient-beam" aria-hidden />
      <AnimatedBackground />
      <div className="js-parallax-mid pointer-events-none absolute inset-0 -z-[6] min-h-full">
        <EnergyStreamBackground />
      </div>
      <div className="js-parallax-slow js-depth-layer pointer-events-none absolute inset-0 -z-[3]" />
      <div className="js-depth-layer pointer-events-none absolute inset-0 -z-[2] bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.02)_40%,transparent_80%)]" />

      <div className="intern-dashboard-main js-parallax-fg relative z-[1] mx-auto max-w-7xl space-y-6 px-3 pb-20 md:px-5">
        <header className="js-dashboard-card intern-depth-card-surface rounded-[24px] border border-white/10 bg-black/35 p-6 backdrop-blur-xl">
          <h1 className="text-3xl font-semibold tracking-tight">Intern AI Command Center</h1>
          <p className="mt-2 text-sm text-white/70">
            Depth-aware workspace with calm motion, scroll parallax, and AI resume intelligence—aligned with your
            landing and auth experience.
          </p>
        </header>

        <div className="grid gap-4 xl:grid-cols-12">
          <GlassCard className="js-dashboard-card intern-depth-card-surface xl:col-span-4 h-full rounded-[24px] border border-white/10 bg-white/5">
            <div className="p-5">
              <h2 className="text-base font-semibold text-white">Profile Summary</h2>
              <div className="mt-4 space-y-3 text-sm text-white/80">
                <p>
                  Resume score:{" "}
                  <span
                    ref={scoreValueRef}
                    className="inline-block rounded-md px-1.5 font-semibold tabular-nums text-[#00FFAE]"
                  >
                    {profileSummary.score}
                  </span>
                  /100
                </p>
                <p>Detected skills: {profileSummary.skills}</p>
                <p>Projects highlighted: {profileSummary.projects}</p>
                <p>Applications sent: {profileSummary.applications}</p>
              </div>
              <div className="bar mt-4">
                <div ref={scoreBarFillRef} className="bar-fill" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="js-dashboard-card intern-depth-card-surface xl:col-span-8 h-full rounded-[24px] border border-white/10 bg-white/5">
            <div className="p-5">
              <h2 className="text-base font-semibold text-white">Resume Reader and Extractor</h2>
              <p className="mt-1 text-xs text-white/60">Upload PDF or DOCX for instant extraction and editable AI insights.</p>
              <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={handleUploadResume}>
                <input
                  type="file"
                  className="block w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#00FF88] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black hover:file:bg-[#00E0FF]"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setResumeFile(file);
                    if (file) {
                      void handleLocalResumeAnalysis(file);
                    }
                  }}
                />
                <input
                  className="field-input w-full"
                  placeholder="Manual skills fallback (comma separated)"
                  value={manualSkills}
                  onChange={(event) => setManualSkills(event.target.value)}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-[#00E58D] to-[#12CBE2] px-4 py-2 text-sm font-semibold text-black shadow-[0_8px_24px_rgba(0,255,136,0.2)] transition-shadow hover:shadow-[0_10px_28px_rgba(0,255,136,0.26)] disabled:opacity-50"
                >
                  {submitting ? "Uploading..." : "Sync to Server"}
                </button>
              </form>
              <form className="mt-3" onSubmit={handleManualSkillsUpdate}>
                <button
                  type="submit"
                  disabled={submitting || !manualSkills.trim()}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition-all hover:border-[#00E0FF]/40 hover:shadow-[0_0_12px_rgba(0,224,255,0.18)] disabled:opacity-50"
                >
                  Update Manual Skills
                </button>
              </form>
              {parsingResume && <p className="mt-3 text-xs text-[#7FFFF4]">Parsing resume and computing AI insights...</p>}
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <GlassCard className="js-dashboard-card intern-depth-card-surface xl:col-span-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">AI Resume Insights</h2>
            {resumeBusy && <SkeletonCard lines={4} />}
            {resumeState.error && <ErrorState message={resumeState.error} />}
            {!resumeBusy && !hasResumeContent && (
              <EmptyState message="Upload your resume to unlock AI analysis." />
            )}
            {hasResumeContent && !resumeBusy && (
              <div className="mt-4 space-y-2 text-sm text-white/80">
                {resumeState.data && (
                  <p>
                    <span className="text-white">Status:</span>{" "}
                    <span className="capitalize text-[#9FFFE5]">{resumeState.data.parsingStatus}</span>
                  </p>
                )}
                <p>
                  <span className="text-white">Name:</span> {localParsedResume?.name || "Not detected"}
                </p>
                <p>
                  <span className="text-white">Email:</span>{" "}
                  {localParsedResume?.email || resumeState.data?.contact || "Not detected"}
                </p>
                <p>
                  <span className="text-white">Education:</span>{" "}
                  {(localParsedResume?.education ?? []).join(" | ") || "None"}
                </p>
                {resumeState.data?.summary ? (
                  <p>
                    <span className="text-white">Summary:</span> {resumeState.data.summary}
                  </p>
                ) : null}
                {resumeState.data?.location ? (
                  <p>
                    <span className="text-white">Location:</span> {resumeState.data.location}
                  </p>
                ) : null}
                <p>
                  <span className="text-white">Score:</span>{" "}
                  {localInsights?.resumeScore ?? resumeState.data?.resumeScore ?? 0}/100
                </p>
              </div>
            )}
          </GlassCard>

          <GlassCard className="js-dashboard-card intern-depth-card-surface xl:col-span-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Skill Gap & Suggestions</h2>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <p>
                Skill gaps:{" "}
                {(localInsights?.skillGap ?? [])
                  .slice(0, 8)
                  .join(", ") || "No major skill gaps for current recommendations."}
              </p>
              <div ref={suggestionsRef} className="space-y-2">
                {(localInsights?.suggestions ?? ["Add measurable impact statements and tailor your summary to role requirements."]).map((tip) => (
                  <div key={tip} className="js-suggestion rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-2 text-xs">
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard
          ref={analyticsRef}
          className="js-dashboard-card intern-depth-card-surface rounded-[24px] border border-white/10 bg-white/5 p-5"
        >
          <h2 className="text-base font-semibold text-white">Signal bars</h2>
          <p className="mt-1 text-xs text-white/55">Animated coverage metrics (scroll to play).</p>
          <div className="mt-4 space-y-4">
            {analyticsBars.map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-xs text-white/75">
                  <span>{bar.label}</span>
                  <span className="tabular-nums text-[#9FFFE5]">{bar.value}</span>
                </div>
                <div className="bar mt-1.5">
                  <div className="bar-fill" data-value={String(bar.value)} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard
          ref={skillsSectionRef}
          className="js-dashboard-card intern-depth-card-surface rounded-[24px] border border-white/10 bg-white/5 p-5"
        >
          <h2 className="text-base font-semibold text-white">Skills</h2>
          <p className="mt-1 text-xs text-white/55">Normalized from your resume, server profile, and manual entry.</p>
          {resumeBusy && <SkeletonCard lines={3} />}
          {!resumeBusy && !hasResumeContent && displaySkills.length === 0 && (
            <EmptyState message="Upload a resume or add manual skills to see them here." />
          )}
          {!resumeBusy && (hasResumeContent || displaySkills.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {displaySkills.length === 0 ? (
                <p className="text-sm text-white/55">No skills detected yet.</p>
              ) : (
                displaySkills.map((skill) => (
                  <span
                    key={skill}
                    className="js-skill-chip rounded-full border border-[#00FF88]/35 bg-[#00FF88]/10 px-3 py-1 text-xs font-medium text-[#B8FFE8] shadow-[0_0_10px_rgba(0,255,136,0.08)]"
                  >
                    {skill}
                  </span>
                ))
              )}
            </div>
          )}
        </GlassCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="js-dashboard-card intern-depth-card-surface rounded-[24px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Experience</h2>
            <p className="mt-1 text-xs text-white/55">Parsed from resume sections (PDF/DOCX upload).</p>
            {resumeBusy && <SkeletonCard lines={4} />}
            {!resumeBusy && displayExperience.length === 0 && (
              <p className="mt-4 text-sm text-white/55">
                No experience lines extracted yet. Add an Experience section to your resume, or upload PDF/DOCX for deeper parsing.
              </p>
            )}
            {!resumeBusy && displayExperience.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                {displayExperience.map((line, index) => (
                  <li
                    key={`${line}-${index}`}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 leading-relaxed"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard className="js-dashboard-card intern-depth-card-surface rounded-[24px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Projects</h2>
            <p className="mt-1 text-xs text-white/55">Parsed from Projects / Project Experience with bullets and links.</p>
            {resumeBusy && <SkeletonCard lines={4} />}
            {!resumeBusy && displayProjectEntries.length === 0 && (
              <p className="mt-4 text-sm text-white/55">No projects listed yet.</p>
            )}
            {!resumeBusy && displayProjectEntries.length > 0 && (
              <div ref={projectsGridRef} className="mt-4 grid gap-3 sm:grid-cols-2">
                {displayProjectEntries.map((proj, index) => (
                  <article
                    key={`${proj.title}-${index}-${proj.link}`}
                    className="js-project-card flex flex-col rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 text-sm text-white/85"
                  >
                    <h3 className="font-semibold text-white">{proj.title}</h3>
                    {proj.description.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/75">
                        {proj.description.slice(0, 3).map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-white/45">No bullet details extracted for this block.</p>
                    )}
                    {proj.link ? (
                      <a
                        href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 text-xs font-medium text-[#7FFFF4] underline decoration-cyan-400/40 underline-offset-2 hover:text-white"
                      >
                        View link
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <GlassCard className="js-dashboard-card intern-depth-card-surface rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-base font-semibold text-white">AI-Powered Recommended Internships</h2>
          {recommendationState.loading && <SkeletonCard lines={5} />}
          {recommendationState.error && <ErrorState message={recommendationState.error} />}
          {!recommendationState.loading && noResumeMessage && <EmptyState message={noResumeMessage} />}
          {!recommendationState.loading && !noResumeMessage && recommendationState.data && recommendationState.data.items.length === 0 && (
            <EmptyState message="No internships available right now." />
          )}
          {recommendationState.data && recommendationState.data.items.length > 0 && (
            <div ref={internshipsGridRef} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recommendationState.data.items.map((item) => (
                <GlassCard
                  key={item.internship.id}
                  className="js-intern-card intern-depth-card-surface h-full rounded-[24px] border border-white/10 bg-white/5"
                >
                  <div className="h-full p-4 text-sm text-white/85">
                    <p className="font-semibold text-white">{item.internship.title}</p>
                    <p className="mt-1 text-xs text-white/55">{item.internship.location} • {item.internship.duration}</p>
                    <p className="mt-2">Required match: {item.requiredMatch}%</p>
                    <p>Preferred match: {item.preferredMatch}%</p>
                    <p>Overall score: <span className="font-semibold text-[#00FFAE]">{item.overallScore}%</span></p>
                    <p className="mt-2 text-xs">Missing required: {item.missingRequiredSkills.join(", ") || "None"}</p>
                    <button
                      type="button"
                      disabled={applyingId === item.internship.id}
                      className="mt-3 rounded-lg bg-gradient-to-r from-[#00E58D] to-[#12CBE2] px-3 py-1.5 text-xs font-semibold text-black shadow-[0_8px_20px_rgba(0,255,136,0.18)] transition-shadow hover:shadow-[0_10px_24px_rgba(0,255,136,0.24)] disabled:opacity-50"
                      onClick={() => void handleApply(item.internship.id)}
                    >
                      {applyingId === item.internship.id ? "Applying..." : "Apply Now"}
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="grid gap-4 xl:grid-cols-12">
          <GlassCard className="js-dashboard-card intern-depth-card-surface xl:col-span-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Applied Internships Tracker</h2>
            {applicationState.loading && <SkeletonCard lines={3} />}
            {applicationState.error && <ErrorState message={applicationState.error} />}
            {applicationState.data && applicationState.data.items.length === 0 && <EmptyState message="No application activity yet" />}
            {applicationState.data && applicationState.data.items.length > 0 && (
              <div className="mt-4 space-y-2 text-sm text-white/85">
                {applicationState.data.items.map((application) => (
                  <div key={application._id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-white/60">{new Date(application.createdAt).toLocaleDateString()}</p>
                    <p>Internship: {application.internshipId}</p>
                    <p>Status: <span className="font-semibold capitalize text-[#9FFFE5]">{application.status}</span></p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="js-dashboard-card intern-depth-card-surface xl:col-span-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Activity Timeline</h2>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="font-medium text-white">Resume Intelligence Updated</p>
                <p className="text-xs text-white/60">Latest parsing + scoring synced across dashboard panels.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="font-medium text-white">Recommendations Re-ranked</p>
                <p className="text-xs text-white/60">AI matching engine prioritized roles with highest skill overlap.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="font-medium text-white">Application Flow Ready</p>
                <p className="text-xs text-white/60">Micro-interactions and hover depth effects active.</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
      <InternDashboardCursor />
    </section>
  );
}
