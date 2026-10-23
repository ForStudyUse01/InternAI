import type { Metadata } from "next";
import { CompanyPublicProfilePage } from "@/components/company/company-public-profile-page";

type PageProps = {
  params: Promise<{ companyId: string }>;
};

type PublicCompanySummary = {
  companyName?: string;
  description?: string;
  industry?: string;
  logoUrl?: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

function buildLogoAssetUrl(relativePath: string) {
  let normalized = String(relativePath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  const uploadsIdx = normalized.indexOf("/uploads/");
  if (uploadsIdx >= 0) normalized = normalized.slice(uploadsIdx + 1);
  if (normalized.includes("uploads/")) normalized = normalized.slice(normalized.indexOf("uploads/"));
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${API_BASE_URL}/${normalized}`;
}

async function fetchCompanySummary(companyId: string): Promise<PublicCompanySummary | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/public`, {
      next: { revalidate: 300 }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.company ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companyId } = await params;
  const company = await fetchCompanySummary(companyId);

  if (!company) {
    return {
      title: "Company Profile",
      description: "Company profile, open positions, and hiring stats on InternAI.",
      robots: { index: false, follow: false }
    };
  }

  const title = company.companyName || "Company";
  const fullTitle = `${title} | InternAI`;
  const description =
    company.description?.slice(0, 160) ||
    `${company.companyName || "This company"}'s profile, open internship positions, and hiring stats on InternAI.`;

  return {
    title,
    description,
    alternates: { canonical: `/company/${companyId}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "profile",
      url: `/company/${companyId}`,
      title: fullTitle,
      description,
      images: company.logoUrl ? [{ url: buildLogoAssetUrl(company.logoUrl) }] : undefined
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description
    }
  };
}

export default async function PublicCompanyProfileRoute({ params }: PageProps) {
  const { companyId } = await params;
  return <CompanyPublicProfilePage companyId={companyId} />;
}
