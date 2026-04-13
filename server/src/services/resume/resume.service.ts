import path from "node:path";
import fs from "node:fs/promises";
import { ResumeModel } from "../../models/Resume";
import { HttpError } from "../../utils/httpError";
import { normalizeSkillArray } from "../common/skill-normalizer";
import { resumeParserFactory } from "./resume-parser.factory";
import { calculateResumeScore } from "./resume-scoring.service";
import type { AuthenticatedUser } from "../../types/auth";
import type { ParsedResumeData } from "./resume-parser.interface";

function sanitizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseManualSkills(input: unknown): string[] {
  if (Array.isArray(input)) {
    return normalizeSkillArray(input);
  }

  if (typeof input === "string") {
    const normalized = input
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return normalizeSkillArray(normalized);
  }

  return [];
}

function mergeManualSkills(baseData: ParsedResumeData, manualSkills: string[]): ParsedResumeData {
  const mergedSkills = normalizeSkillArray([...(baseData.skills ?? []), ...manualSkills]);
  return {
    ...baseData,
    skills: mergedSkills,
  };
}

export async function uploadResumeForIntern(
  currentUser: AuthenticatedUser,
  file: Express.Multer.File | undefined,
  manualSkillsInput: unknown
) {
  if (!file) {
    throw new HttpError(400, "Resume file is required");
  }

  const manualSkills = parseManualSkills(manualSkillsInput);
  const parser = resumeParserFactory.getParser();

  let parsingStatus: "pending" | "parsed" | "failed" = "pending";
  let parsedData: ParsedResumeData = {
    skills: [],
    projects: [],
  };

  const parserResult = await parser.parse(file.path, file.mimetype);
  parsingStatus = parserResult.status;
  parsedData = parserResult.data;

  if (manualSkills.length > 0) {
    parsedData = mergeManualSkills(parsedData, manualSkills);
    parsingStatus = "parsed";
  }

  const scoreResult = calculateResumeScore(parsedData);

  const existingResume = await ResumeModel.findOne({ userId: currentUser.id }).lean();

  const resume = await ResumeModel.findOneAndUpdate(
    { userId: currentUser.id },
    {
      $set: {
        userId: currentUser.id,
        fileName: file.originalname,
        fileUrl: path.join("uploads", "resumes", path.basename(file.path)).replace(/\\/g, "/"),
        mimeType: file.mimetype,
        fileSize: file.size,
        parsingStatus,
        parsedData,
        resumeScore: scoreResult.score,
      },
    },
    { new: true, upsert: true }
  ).lean();

  if (existingResume?.fileUrl) {
    const previousFilePath = path.resolve(existingResume.fileUrl);
    const currentFilePath = path.resolve(path.join("uploads", "resumes", path.basename(file.path)));
    if (previousFilePath !== currentFilePath) {
      await fs.unlink(previousFilePath).catch(() => undefined);
    }
  }

  return {
    resume,
    score: scoreResult,
  };
}

export async function getParsedResumeForIntern(currentUser: AuthenticatedUser) {
  const resume = await ResumeModel.findOne({ userId: currentUser.id }).lean();
  if (!resume) {
    throw new HttpError(404, "No resume found for this intern");
  }

  return {
    parsingStatus: resume.parsingStatus,
    summary: resume.parsedData?.summary ?? "",
    skills: normalizeSkillArray(resume.parsedData?.skills ?? []),
    projects: resume.parsedData?.projects ?? [],
    contact: resume.parsedData?.contact ?? "",
    location: resume.parsedData?.location ?? "",
    resumeScore: resume.resumeScore ?? 0,
  };
}

export async function updateManualSkillsForIntern(currentUser: AuthenticatedUser, skillsInput: unknown) {
  const manualSkills = parseManualSkills(skillsInput);
  if (manualSkills.length === 0) {
    throw new HttpError(400, "At least one valid skill is required");
  }

  const resume = await ResumeModel.findOne({ userId: currentUser.id });
  if (!resume) {
    throw new HttpError(404, "No resume found for this intern");
  }

  const updatedParsedData = mergeManualSkills(
    {
      summary: sanitizeText(resume.parsedData?.summary),
      skills: resume.parsedData?.skills ?? [],
      projects: resume.parsedData?.projects ?? [],
      contact: sanitizeText(resume.parsedData?.contact),
      location: sanitizeText(resume.parsedData?.location),
    },
    manualSkills
  );

  const scoreResult = calculateResumeScore(updatedParsedData);

  resume.parsedData = updatedParsedData;
  resume.parsingStatus = "parsed";
  resume.resumeScore = scoreResult.score;
  await resume.save();

  return {
    resume,
    score: scoreResult,
  };
}
