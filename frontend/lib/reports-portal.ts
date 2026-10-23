import { getAuthSession } from "@/lib/session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type ReportDownloadKey =
  | "resume-analysis"
  | "skill-gap"
  | "application-history"
  | "hiring"
  | "candidate-evaluation"
  | "interview"
  | "platform-statistics"
  | "verification";

const REPORT_PATHS: Record<ReportDownloadKey, (params?: { applicationId?: string; companyId?: string; internshipId?: string }) => string> = {
  "resume-analysis": () => "/api/intern/reports/resume-analysis",
  "skill-gap": (params) => {
    const query = params?.internshipId ? `?internshipId=${encodeURIComponent(params.internshipId)}` : "";
    return `/api/intern/reports/skill-gap${query}`;
  },
  "application-history": () => "/api/intern/reports/application-history",
  hiring: () => "/api/company/reports/hiring",
  "candidate-evaluation": (params) =>
    `/api/company/reports/candidate-evaluation/${encodeURIComponent(params?.applicationId || "")}`,
  interview: (params) => `/api/company/reports/interview/${encodeURIComponent(params?.applicationId || "")}`,
  "platform-statistics": () => "/api/admin/reports/platform-statistics",
  verification: (params) => `/api/admin/reports/verification/${encodeURIComponent(params?.companyId || "")}`
};

export async function downloadEnterpriseReport(
  key: ReportDownloadKey,
  params?: { applicationId?: string; companyId?: string; internshipId?: string }
) {
  const session = getAuthSession();
  if (!session?.token) {
    throw new Error("Please sign in to download reports.");
  }

  const path = REPORT_PATHS[key](params);
  if (!path || path.includes("/undefined") || path.endsWith("/")) {
    throw new Error("Missing parameters for this report.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${session.token}` }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to generate report.");
  }

  const blob = await response.blob();
  const reportNumber = response.headers.get("X-Report-Number") || "InternAI-Report";
  const filename = `${reportNumber}.pdf`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return { filename, reportNumber };
}
