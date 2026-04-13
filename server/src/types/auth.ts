export type UserRole = "intern" | "company";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export interface JwtPayloadModel {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
