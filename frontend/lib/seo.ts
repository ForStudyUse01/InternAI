const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");
export const SITE_NAME = "InternAI";
export const SITE_TAGLINE = "Connecting Skills to Success";
export const SITE_DESCRIPTION =
  "InternAI — Connecting Skills to Success. Internship and placement management for students, companies, and administrators.";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
