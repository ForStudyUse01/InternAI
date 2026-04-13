import { Types } from "mongoose";
import { HttpError } from "./httpError";

export function assertValidObjectId(value: string, label = "ID"): asserts value is string {
  if (!Types.ObjectId.isValid(value)) {
    throw new HttpError(400, `Invalid ${label}`);
  }
}
