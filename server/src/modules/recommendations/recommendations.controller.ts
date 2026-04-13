import type { Request, Response } from "express";
import { getInternRecommendations } from "../../services/recommendations/recommendations.service";
import { successResponse } from "../../utils/apiResponse";

export async function getRecommendationsController(req: Request, res: Response): Promise<void> {
  const result = await getInternRecommendations(req.user!, req.query.page, req.query.limit);
  res.status(200).json(successResponse("Recommendations fetched successfully", result));
}
