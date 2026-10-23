"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/shared/dashboard-page-header";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { LearningCoursesModule } from "@/components/dashboard/intern/learning-courses-module";
import { InternProfile, fetchInternProfileWithScore } from "@/lib/intern-portal";

export default function LearningCoursesPage() {
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInternProfileWithScore()
      .then((data) => setProfile(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard-stack">
          <DashboardPageHeader
            eyebrow="Learning"
            title="Courses"
            subtitle="Free, verified courses from Coursera, NPTEL, Kaggle, freeCodeCamp, Microsoft Learn, Google Learn, and more. Every link opens the real external platform."
          />

          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          ) : (
            <LearningCoursesModule profile={profile} />
          )}
    </div>
  );
}
