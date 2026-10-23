import { useLayoutEffect } from "react";

/** True when every peek returned empty — page should show a loading state. */
export function needsLoadingState(...cached: unknown[]) {
  return cached.every((value) => value == null);
}

/** Only block the UI when there is nothing cached to render yet. */
export function shouldBlockPageContent(...cached: unknown[]) {
  return cached.every((value) => {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    return false;
  });
}

/**
 * Hydrate client cache after the first render without causing SSR mismatches.
 * Server and client both use empty initial state; cache is applied before paint.
 */
export function useClientCacheHydration(hydrate: () => void) {
  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);
}

/** Build a Set of internship ids from application cache. */
export function appliedInternshipIdsFromApplications(
  applications: Array<{ internshipId?: string; internship?: { _id?: string } }> | null | undefined
) {
  const ids = new Set<string>();
  (applications ?? []).forEach((application) => {
    const internshipId = application.internshipId || application.internship?._id;
    if (internshipId) ids.add(String(internshipId));
  });
  return ids;
}
