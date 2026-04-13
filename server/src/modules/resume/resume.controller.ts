import type { Request, Response } from "express";
import { getParsedResumeForIntern, updateManualSkillsForIntern, uploadResumeForIntern } from "../../services/resume/resume.service";
import { successResponse } from "../../utils/apiResponse";

export async function uploadResumeController(req: Request, res: Response): Promise<void> {
  const result = await uploadResumeForIntern(req.user!, req.file, req.body.manualSkills);
  res.status(201).json(successResponse("Resume uploaded successfully", result));
}

export async function getParsedResumeController(req: Request, res: Response): Promise<void> {
  const parsedResume = await getParsedResumeForIntern(req.user!);
  res.status(200).json(successResponse("Parsed resume fetched successfully", parsedResume));
}

export async function updateManualSkillsController(req: Request, res: Response): Promise<void> {
  const result = await updateManualSkillsForIntern(req.user!, req.body.skills);
  res.status(200).json(successResponse("Manual skills updated successfully", result));
}
