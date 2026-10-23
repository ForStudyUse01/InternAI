import type { Metadata } from "next";
import { PortfolioPublicPageClient } from "@/components/portfolio/portfolio-public-page-client";

type PageProps = {
  params: Promise<{ username: string }>;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

async function fetchPortfolioHero(username: string): Promise<{ name?: string; tagline?: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolios/${encodeURIComponent(username)}/public`, {
      next: { revalidate: 300 }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.portfolio?.content?.hero ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const hero = await fetchPortfolioHero(username);

  const fullTitle = `${hero?.name || username} | InternAI Portfolio`;
  const description = hero?.tagline
    ? hero.tagline.slice(0, 160)
    : `Professional 3D portfolio for ${username} on InternAI.`;

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: `/portfolio/${username}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "profile",
      url: `/portfolio/${username}`,
      title: fullTitle,
      description
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description
    }
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { username } = await params;
  return <PortfolioPublicPageClient slug={username} />;
}
