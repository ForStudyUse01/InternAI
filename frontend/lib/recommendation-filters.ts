import type { Recommendation } from "@/lib/intern-portal";
import { normalizeSkillList, normalizeSkillValue } from "@/lib/skill-normalizer";

export type RecommendedInternshipFilters = {
  query: string;
  location: string;
  mode: string;
  internshipType: string;
  duration: string;
  minStipend: string;
  skill: string;
  company: string;
  domain: string;
};

export const EMPTY_RECOMMENDED_FILTERS: RecommendedInternshipFilters = {
  query: "",
  location: "",
  mode: "",
  internshipType: "",
  duration: "",
  minStipend: "",
  skill: "",
  company: "",
  domain: ""
};

const FILTERS_STORAGE_KEY = "intern:recommended-filters";

export type RecommendationFilterOptions = {
  locations: string[];
  modes: string[];
  internshipTypes: string[];
  durations: string[];
  companies: Array<{ id: string; name: string }>;
  domains: string[];
  skills: string[];
};

function parseStipendAmount(value?: string) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : null;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export function deriveRecommendationFilterOptions(
  recommendations: Recommendation[]
): RecommendationFilterOptions {
  const locations: string[] = [];
  const modes: string[] = [];
  const internshipTypes: string[] = [];
  const durations: string[] = [];
  const domains: string[] = [];
  const skills: string[] = [];
  const companyMap = new Map<string, string>();

  recommendations.forEach(({ internship }) => {
    if (internship.location) locations.push(internship.location);
    if (internship.mode) modes.push(internship.mode);
    if (internship.internshipType) internshipTypes.push(internship.internshipType);
    if (internship.duration) durations.push(internship.duration);
    if (internship.department) domains.push(internship.department);

    normalizeSkillList([
      ...(internship.skillsRequired || []),
      ...(internship.prioritySkills || [])
    ]).forEach((skill) => skills.push(skill));

    const companyId = internship.company?._id;
    const companyName = internship.company?.companyName;
    if (companyId && companyName) {
      companyMap.set(String(companyId), companyName);
    } else if (companyName) {
      companyMap.set(companyName.toLowerCase(), companyName);
    }
  });

  return {
    locations: uniqueSorted(locations),
    modes: uniqueSorted(modes),
    internshipTypes: uniqueSorted(internshipTypes),
    durations: uniqueSorted(durations),
    domains: uniqueSorted(domains),
    skills: uniqueSorted(skills),
    companies: [...companyMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  };
}

export function countActiveRecommendedFilters(filters: RecommendedInternshipFilters) {
  return Object.values(filters).filter((value) => String(value || "").trim()).length;
}

export function applyRecommendationFilters(
  recommendations: Recommendation[],
  filters: RecommendedInternshipFilters
) {
  const query = filters.query.trim().toLowerCase();
  const normalizedSkill = normalizeSkillValue(filters.skill);
  const minStipend = filters.minStipend.trim() ? Number(filters.minStipend) : null;

  return recommendations.filter(({ internship }) => {
    if (filters.mode && String(internship.mode || "") !== filters.mode) return false;

    if (filters.location) {
      const location = String(internship.location || "").toLowerCase();
      if (!location.includes(filters.location.trim().toLowerCase())) return false;
    }

    if (filters.internshipType) {
      const type = String(internship.internshipType || "").toLowerCase();
      if (type !== filters.internshipType.trim().toLowerCase()) return false;
    }

    if (filters.duration) {
      const duration = String(internship.duration || "").toLowerCase();
      if (!duration.includes(filters.duration.trim().toLowerCase())) return false;
    }

    if (filters.domain) {
      const domain = String(internship.department || "").toLowerCase();
      if (!domain.includes(filters.domain.trim().toLowerCase())) return false;
    }

    if (filters.company) {
      const companyId = String(internship.company?._id || "");
      const companyName = String(internship.company?.companyName || "").toLowerCase();
      const filter = filters.company.trim();
      if (companyId !== filter && companyName !== filter.toLowerCase()) return false;
    }

    if (minStipend !== null && Number.isFinite(minStipend)) {
      const stipend = parseStipendAmount(internship.stipend);
      if (stipend === null || stipend < minStipend) return false;
    }

    if (normalizedSkill) {
      const skills = normalizeSkillList([
        ...(internship.skillsRequired || []),
        ...(internship.prioritySkills || [])
      ]);
      if (!skills.some((skill) => skill.includes(normalizedSkill))) return false;
    }

    if (query) {
      const role = String(internship.role || "").toLowerCase();
      const company = String(internship.company?.companyName || "").toLowerCase();
      const description = String(internship.description || "").toLowerCase();
      const location = String(internship.location || "").toLowerCase();
      const domain = String(internship.department || "").toLowerCase();
      const skills = normalizeSkillList([
        ...(internship.skillsRequired || []),
        ...(internship.prioritySkills || [])
      ]);

      const textMatch =
        role.includes(query) ||
        company.includes(query) ||
        description.includes(query) ||
        location.includes(query) ||
        domain.includes(query);
      const skillMatch = skills.some((skill) => skill.includes(normalizeSkillValue(query) || query));
      if (!textMatch && !skillMatch) return false;
    }

    return true;
  });
}

export function loadPersistedRecommendedFilters(): RecommendedInternshipFilters {
  if (typeof window === "undefined") return { ...EMPTY_RECOMMENDED_FILTERS };
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_RECOMMENDED_FILTERS };
    const parsed = JSON.parse(raw) as Partial<RecommendedInternshipFilters>;
    return { ...EMPTY_RECOMMENDED_FILTERS, ...parsed };
  } catch {
    return { ...EMPTY_RECOMMENDED_FILTERS };
  }
}

export function persistRecommendedFilters(filters: RecommendedInternshipFilters) {
  if (typeof window === "undefined") return;
  try {
    if (countActiveRecommendedFilters(filters) === 0) {
      sessionStorage.removeItem(FILTERS_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}
