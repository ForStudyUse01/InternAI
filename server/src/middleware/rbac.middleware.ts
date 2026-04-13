import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/auth";
import { errorResponse } from "../utils/apiResponse";

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('Authentication required. Use Authorization: Bearer <token>'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(errorResponse("You do not have access to this resource"));
      return;
    }

    next();
  };
}
