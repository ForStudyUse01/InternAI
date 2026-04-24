import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api/client";
import type { Applicant, Application, Internship, PaginatedData } from "@/types/common";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useAsyncData } from "@/hooks/useAsyncData";

export function CompanyDashboardPage() {
  const { token } = useAuth();
  const [selectedInternshipId, setSelectedInternshipId] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    duration: "",
    stipend: "",
    requiredSkills: "",
    preferredSkills: "",
    status: "open",
  });
  const [statusUpdate, setStatusUpdate] = useState<Record<string, Application["status"]>>({});
  const [feedbackForm, setFeedbackForm] = useState({ applicationId: "", strengths: "", weaknesses: "", rating: 3, notes: "" });
  const [refreshTick, setRefreshTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const internshipState = useAsyncData(async () => {
    const response = await apiClient.get<PaginatedData<Internship>>("/internships?page=1&limit=10", token);
    return response.data ?? { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }, [token, refreshTick]);

  const applicantState = useAsyncData(async () => {
    if (!selectedInternshipId) {
      return { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const response = await apiClient.get<PaginatedData<Applicant>>(`/internships/${selectedInternshipId}/applicants?page=1&limit=10`, token);
    return response.data ?? { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }, [token, selectedInternshipId, refreshTick]);

  useEffect(() => {
    if (!selectedInternshipId && internshipState.data?.items.length) {
      setSelectedInternshipId(internshipState.data.items[0]._id);
    }
  }, [internshipState.data, selectedInternshipId]);

  async function handleCreateInternship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await apiClient.post(
        "/internships",
        {
          ...form,
          requiredSkills: form.requiredSkills.split(",").map((value) => value.trim()).filter(Boolean),
          preferredSkills: form.preferredSkills.split(",").map((value) => value.trim()).filter(Boolean),
        },
        token
      );
      toast.success("Internship created.");
      setForm({ title: "", description: "", location: "", duration: "", stipend: "", requiredSkills: "", preferredSkills: "", status: "open" });
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create internship");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteInternship(internshipId: string) {
    setSubmitting(true);
    try {
      await apiClient.delete(`/internships/${internshipId}`, token);
      toast.success("Internship deleted.");
      if (selectedInternshipId === internshipId) {
        setSelectedInternshipId("");
      }
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete internship");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(applicationId: string) {
    const status = statusUpdate[applicationId];
    if (!status) {
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.patch(`/applications/${applicationId}/status`, { status }, token);
      toast.success("Application status updated.");
      setRefreshTick((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/feedback", feedbackForm, token);
      toast.success("Feedback submitted.");
      setFeedbackForm({ applicationId: "", strengths: "", weaknesses: "", rating: 3, notes: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Feedback submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Company Dashboard</h1>

      <article className="card-surface">
        <h2 className="mb-3 font-semibold text-white">Create Internship</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateInternship}>
          <input className="field-input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input className="field-input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
          <input className="field-input" placeholder="Duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
          <input className="field-input" placeholder="Stipend" value={form.stipend} onChange={(e) => setForm({ ...form, stipend: e.target.value })} required />
          <input className="field-input md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input className="field-input" placeholder="Required skills (comma separated)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
          <input className="field-input" placeholder="Preferred skills (comma separated)" value={form.preferredSkills} onChange={(e) => setForm({ ...form, preferredSkills: e.target.value })} />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-[#00E58D] to-[#12CBE2] px-3 py-2 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(0,255,136,0.2)] disabled:opacity-50 md:col-span-2"
          >
            {submitting ? "Saving..." : "Create Internship"}
          </button>
        </form>
      </article>

      <article className="card-surface">
        <h2 className="mb-3 font-semibold text-white">Manage Internships</h2>
        {internshipState.loading && <SkeletonCard lines={4} />}
        {internshipState.error && <ErrorState message={internshipState.error} />}
        {internshipState.data && internshipState.data.items.length === 0 && <EmptyState message="Create your first internship listing" />}
        {internshipState.data && internshipState.data.items.length > 0 && (
          <div className="space-y-2 text-sm">
            {internshipState.data.items.map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-3">
                <button type="button" className="text-left text-white/85 hover:text-white" onClick={() => setSelectedInternshipId(item._id)}>
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="text-white/55">{item.location} • {item.status}</p>
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-500/40 px-2 py-1 text-sm text-red-400 hover:bg-red-500/10"
                  onClick={() => handleDeleteInternship(item._id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="card-surface">
        <h2 className="mb-3 font-semibold text-white">Applicants</h2>
        {!selectedInternshipId && <EmptyState message="Select an internship to view applicants." />}
        {selectedInternshipId && applicantState.loading && <SkeletonCard lines={4} />}
        {selectedInternshipId && applicantState.error && <ErrorState message={applicantState.error} />}
        {selectedInternshipId && applicantState.data && applicantState.data.items.length === 0 && <EmptyState message="No applicants yet" />}
        {selectedInternshipId && applicantState.data && applicantState.data.items.length > 0 && (
          <div className="space-y-3 text-sm text-white/85">
            {applicantState.data.items.map((applicant) => (
              <div key={applicant.applicationId} className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-3">
                <p className="font-medium text-white">{applicant.name || "Unnamed applicant"}</p>
                <p>Skills: {applicant.skills.join(", ") || "None"}</p>
                <p>Resume score: {applicant.resumeScore ?? "Not available"}</p>
                <p>Status: {applicant.status}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    className="field-select max-w-[11rem] py-1.5 text-xs"
                    value={statusUpdate[applicant.applicationId] ?? applicant.status}
                    onChange={(event) => setStatusUpdate({ ...statusUpdate, [applicant.applicationId]: event.target.value as Application["status"] })}
                  >
                    <option value="applied">applied</option>
                    <option value="shortlisted">shortlisted</option>
                    <option value="test">test</option>
                    <option value="interview">interview</option>
                    <option value="selected">selected</option>
                    <option value="rejected">rejected</option>
                  </select>
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white/85 hover:border-white/20"
                    onClick={() => handleStatusUpdate(applicant.applicationId)}
                  >
                    Update Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="card-surface">
        <h2 className="mb-3 font-semibold text-white">Add Feedback</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleFeedbackSubmit}>
          <input className="field-input" placeholder="Application ID" value={feedbackForm.applicationId} onChange={(e) => setFeedbackForm({ ...feedbackForm, applicationId: e.target.value })} required />
          <input className="field-input" placeholder="Strengths" value={feedbackForm.strengths} onChange={(e) => setFeedbackForm({ ...feedbackForm, strengths: e.target.value })} />
          <input className="field-input" placeholder="Weaknesses" value={feedbackForm.weaknesses} onChange={(e) => setFeedbackForm({ ...feedbackForm, weaknesses: e.target.value })} />
          <input className="field-input" type="number" min={1} max={5} value={feedbackForm.rating} onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })} />
          <textarea className="field-input min-h-[88px] resize-y md:col-span-2" placeholder="Notes" value={feedbackForm.notes} onChange={(e) => setFeedbackForm({ ...feedbackForm, notes: e.target.value })} />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2 text-sm font-semibold text-white/85 hover:border-white/20 disabled:opacity-50 md:col-span-2"
          >
            Submit Feedback
          </button>
        </form>
      </article>
    </section>
  );
}
