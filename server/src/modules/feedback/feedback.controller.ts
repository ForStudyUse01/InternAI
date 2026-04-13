import type { Request, Response } from "express";
import { addFeedback } from "../../services/feedback/feedback.service";
import { successResponse } from "../../utils/apiResponse";

export async function addFeedbackController(req: Request, res: Response): Promise<void> {
  const feedback = await addFeedback(req.user!, req.body);
  res.status(201).json(successResponse("Feedback submitted successfully", feedback));
}
