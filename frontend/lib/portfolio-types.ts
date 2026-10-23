export type PortfolioTheme = "midnight" | "aurora" | "slate";

export type PortfolioStatus = "draft" | "published" | "disabled";

export type PortfolioSkill = {
  name: string;
  level?: string;
  category?: string;
};

export type PortfolioProject = {
  title: string;
  description?: string;
  techStack?: string[];
  demoLink?: string;
  githubLink?: string;
};

export type PortfolioContent = {
  hero: {
    name: string;
    headline: string;
    tagline: string;
    initials: string;
  };
  about: string;
  skills: PortfolioSkill[];
  projects: PortfolioProject[];
  certifications: Array<{ name: string; issuer?: string; year?: string; verified?: boolean }>;
  experience: Array<{ role: string; company?: string; duration?: string; description?: string }>;
  education: Array<{ degree: string; institution?: string; startYear?: string; endYear?: string; grade?: string }>;
  achievements: string[];
  contact: { email?: string; mobile?: string; location?: string };
  socialLinks: Array<{ platform: string; url: string }>;
  resumeFilePath?: string;
};

export type InternPortfolioRecord = {
  _id: string;
  slug: string;
  status: PortfolioStatus;
  theme: PortfolioTheme;
  autoSync: boolean;
  content?: PortfolioContent | null;
  lastGeneratedAt?: string | null;
  publishedAt?: string | null;
  portfolioUrl: string;
  metadata?: {
    viewCount?: number;
    aiGenerated?: boolean;
    needsRegeneration?: boolean;
  };
};

export type PortfolioSummary = {
  slug: string;
  theme?: PortfolioTheme;
  status?: PortfolioStatus;
  lastGeneratedAt?: string | null;
  viewCount?: number;
  portfolioUrl: string;
};
