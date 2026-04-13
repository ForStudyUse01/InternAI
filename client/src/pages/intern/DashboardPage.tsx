import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api/client";
import type { Application, PaginatedData, RecommendationItem, ResumeParsedView } from "@/types/common";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useAsyncData } from "@/hooks/useAsyncData";

interface RecommendationResponse extends PaginatedData<RecommendationItem> {
  emptyStateMessage?: string;
}

export function InternDashboardPage() {
  const { token } = useAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [manualSkills, setManualSkills] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const resumeState = useAsyncData(async () => {
    const response = await apiClient.get<ResumeParsedView>("/resume/parsed", token);
    return response.data ?? null;
  }, [token, refreshTick]);

  const recommendationState = useAsyncData(async () => {
    const response = await apiClient.get<RecommendationResponse>("/recommendations?page=1&limit=10", token);
    return response.data ?? { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }, [token, refreshTick]);

  const applicationState = useAsyncData(async () => {
    const response = await apiClient.get<PaginatedData<Application>>("/applications/intern/me?page=1&limit=10", token);
    return response.data ?? { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }, [token, refreshTick]);

  const noResumeMessage = useMemo(() => {
    if (recommendationState.data?.emptyStateMessage) {
      return recommendationState.data.emptyStateMessage;
    }

    if (!resumeState.data && !resumeState.loading) {
      return "Upload your resume to get accurate internship recommendations.";
    }

    return null;
  }, [recommendationState.data, resumeState.data, resumeState.loading]);

  async function handleUploadResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resumeFile) {
      toast.error("Please choose a resume file.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);
    if (manualSkills.trim()) {
      formData.append("manualSkills", manualSkills);
    }

    setSubmitting(true);

    try {
      await apiClient.post("/resume/upload", formData, token, true);
      toast.success("Resume uploaded successfully.");
      setResumeFile(null);
      setManualSkills("");
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualSkillsUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const skills = manualSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);

      await apiClient.patch("/resume/manual-skills", { skills }, token);
      toast.success("Manual skills updated.");
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Manual skill update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApply(internshipId: string) {
    setApplyingId(internshipId);
    try {
      await apiClient.post("/applications", { internshipId }, token);
      toast.success("Application submitted.");
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application failed");
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Intern Dashboard</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Resume Upload</h2>
          <form className="space-y-3" onSubmit={handleUploadResume}>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
            />
            <input
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Manual skills fallback (comma separated)"
              value={manualSkills}
              onChange={(event) => setManualSkills(event.target.value)}
            />
            <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60">
              {submitting ? "Uploading..." : "Upload Resume"}
            </button>
          </form>
          <form className="mt-3" onSubmit={handleManualSkillsUpdate}>
            <button type="submit" disabled={submitting || !manualSkills.trim()} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-60">
              Update Manual Skills
            </button>
          </form>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Parsed Resume & Score</h2>
          {resumeState.loading && <SkeletonCard lines={4} />}
          {resumeState.error && <ErrorState message={resumeState.error} />}
          {!resumeState.loading && !resumeState.data && <EmptyState message="Upload your resume..." />}
          {resumeState.data && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Parsing status:</span> {resumeState.data.parsingStatus}</p>
              <p><span className="font-medium">Resume score:</span> {resumeState.data.resumeScore}</p>
              <p><span className="font-medium">Summary:</span> {resumeState.data.summary || "Not available"}</p>
              <p><span className="font-medium">Skills:</span> {resumeState.data.skills.join(", ") || "None"}</p>
              <p><span className="font-medium">Projects:</span> {resumeState.data.projects.join(", ") || "None"}</p>
              <p><span className="font-medium">Contact:</span> {resumeState.data.contact || "Not available"}</p>
              <p><span className="font-medium">Location:</span> {resumeState.data.location || "Not available"}</p>
            </div>
          )}
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Internship Recommendations</h2>
        {recommendationState.loading && <SkeletonCard lines={5} />}
        {recommendationState.error && <ErrorState message={recommendationState.error} />}
        {!recommendationState.loading && noResumeMessage && <EmptyState message={noResumeMessage} />}
        {!recommendationState.loading && !noResumeMessage && recommendationState.data && recommendationState.data.items.length === 0 && (
          <EmptyState message="No internships available right now." />
        )}
        {recommendationState.data && recommendationState.data.items.length > 0 && (
          <div className="space-y-3">
            {recommendationState.data.items.map((item) => (
              <div key={item.internship.id} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-medium">{item.internship.title}</p>
                <p className="text-slate-600">{item.internship.location} • {item.internship.duration}</p>
                <p>Required match: {item.requiredMatch}%</p>
                <p>Preferred match: {item.preferredMatch}%</p>
                <p>Overall score: {item.overallScore}%</p>
                <p>Missing required skills: {item.missingRequiredSkills.join(", ") || "None"}</p>
                <p>Missing preferred skills: {item.missingPreferredSkills.join(", ") || "None"}</p>
                <button
                  type="button"
                  disabled={applyingId === item.internship.id}
                  className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-60"
                  onClick={() => void handleApply(item.internship.id)}
                >
                  {applyingId === item.internship.id ? "Applying..." : "Apply"}
                </button>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Application Tracking</h2>
        {applicationState.loading && <SkeletonCard lines={3} />}
        {applicationState.error && <ErrorState message={applicationState.error} />}
        {applicationState.data && applicationState.data.items.length === 0 && <EmptyState message="No application activity yet" />}
        {applicationState.data && applicationState.data.items.length > 0 && (
          <div className="space-y-2 text-sm">
            {applicationState.data.items.map((application) => (
              <div key={application._id} className="rounded border border-slate-200 p-3">
                <p>Application ID: {application._id}</p>
                <p>Internship ID: {application.internshipId}</p>
                <p>Status: <span className="font-medium capitalize">{application.status}</span></p>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
