import type { Request, Response } from "express";
import { applyToInternship, listInternApplications, updateApplicationStatus } from "../../services/applications/applications.service";
import { successResponse } from "../../utils/apiResponse";

function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function applyToInternshipController(req: Request, res: Response): Promise<void> {
  const application = await applyToInternship(req.user!, req.body.internshipId);
  res.status(201).json(successResponse("Application submitted successfully", application));
}

export async function listInternApplicationsController(req: Request, res: Response): Promise<void> {
  const result = await listInternApplications(req.user!, req.query.page, req.query.limit);
  res.status(200).json(successResponse("Applications fetched successfully", result));
}

export async function updateApplicationStatusController(req: Request, res: Response): Promise<void> {
  const application = await updateApplicationStatus(req.user!, singleParam(req.params.applicationId), req.body.status);
  res.status(200).json(successResponse("Application status updated successfully", application));
}
