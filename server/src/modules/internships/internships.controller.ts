import type { Request, Response } from "express";
import { successResponse } from "../../utils/apiResponse";
import { createInternship, deleteInternship, listApplicants, listInternships, updateInternship } from "../../services/internships/internships.service";

function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function createInternshipController(req: Request, res: Response): Promise<void> {
  const internship = await createInternship(req.user!, req.body);
  res.status(201).json(successResponse("Internship created successfully", internship));
}

export async function updateInternshipController(req: Request, res: Response): Promise<void> {
  const internship = await updateInternship(req.user!, singleParam(req.params.internshipId), req.body);
  res.status(200).json(successResponse("Internship updated successfully", internship));
}

export async function deleteInternshipController(req: Request, res: Response): Promise<void> {
  await deleteInternship(req.user!, singleParam(req.params.internshipId));
  res.status(200).json(successResponse("Internship deleted successfully"));
}

export async function listInternshipsController(req: Request, res: Response): Promise<void> {
  const result = await listInternships(req.query.page, req.query.limit, req.user!);
  res.status(200).json(successResponse("Internships fetched successfully", result));
}

export async function listApplicantsController(req: Request, res: Response): Promise<void> {
  const result = await listApplicants(req.user!, singleParam(req.params.internshipId), req.query.page, req.query.limit);
  res.status(200).json(successResponse("Applicants fetched successfully", result));
}
