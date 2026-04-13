import { HttpError } from "../../utils/httpError";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function resolvePaginationParams(rawPage: unknown, rawLimit: unknown): PaginationParams {
  const page = Number(rawPage ?? 1);
  const limit = Number(rawLimit ?? 10);

  if (!Number.isFinite(page) || page < 1 || !Number.isInteger(page)) {
    throw new HttpError(400, "Page must be a positive integer");
  }

  if (!Number.isFinite(limit) || limit < 1 || limit > 50 || !Number.isInteger(limit)) {
    throw new HttpError(400, "Limit must be an integer between 1 and 50");
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
