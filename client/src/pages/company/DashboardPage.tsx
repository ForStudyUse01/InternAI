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
      <h1 className="text-2xl font-semibold">Company Dashboard</h1>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Create Internship</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateInternship}>
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Stipend" value={form.stipend} onChange={(e) => setForm({ ...form, stipend: e.target.value })} required />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Required skills (comma separated)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Preferred skills (comma separated)" value={form.preferredSkills} onChange={(e) => setForm({ ...form, preferredSkills: e.target.value })} />
          <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60 md:col-span-2">
            {submitting ? "Saving..." : "Create Internship"}
          </button>
        </form>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Manage Internships</h2>
        {internshipState.loading && <SkeletonCard lines={4} />}
        {internshipState.error && <ErrorState message={internshipState.error} />}
        {internshipState.data && internshipState.data.items.length === 0 && <EmptyState message="Create your first internship listing" />}
        {internshipState.data && internshipState.data.items.length > 0 && (
          <div className="space-y-2 text-sm">
            {internshipState.data.items.map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded border border-slate-200 p-3">
                <button type="button" className="text-left" onClick={() => setSelectedInternshipId(item._id)}>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-slate-500">{item.location} • {item.status}</p>
                </button>
                <button type="button" className="rounded border border-red-200 px-2 py-1 text-red-600" onClick={() => handleDeleteInternship(item._id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Applicants</h2>
        {!selectedInternshipId && <EmptyState message="Select an internship to view applicants." />}
        {selectedInternshipId && applicantState.loading && <SkeletonCard lines={4} />}
        {selectedInternshipId && applicantState.error && <ErrorState message={applicantState.error} />}
        {selectedInternshipId && applicantState.data && applicantState.data.items.length === 0 && <EmptyState message="No applicants yet" />}
        {selectedInternshipId && applicantState.data && applicantState.data.items.length > 0 && (
          <div className="space-y-3 text-sm">
            {applicantState.data.items.map((applicant) => (
              <div key={applicant.applicationId} className="rounded border border-slate-200 p-3">
                <p className="font-medium">{applicant.name || "Unnamed applicant"}</p>
                <p>Skills: {applicant.skills.join(", ") || "None"}</p>
                <p>Resume score: {applicant.resumeScore ?? "Not available"}</p>
                <p>Status: {applicant.status}</p>
                <div className="mt-2 flex gap-2">
                  <select
                    className="rounded border border-slate-300 px-2 py-1"
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
                    className="rounded border border-slate-300 px-2 py-1"
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

      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Add Feedback</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleFeedbackSubmit}>
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Application ID" value={feedbackForm.applicationId} onChange={(e) => setFeedbackForm({ ...feedbackForm, applicationId: e.target.value })} required />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Strengths" value={feedbackForm.strengths} onChange={(e) => setFeedbackForm({ ...feedbackForm, strengths: e.target.value })} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Weaknesses" value={feedbackForm.weaknesses} onChange={(e) => setFeedbackForm({ ...feedbackForm, weaknesses: e.target.value })} />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" type="number" min={1} max={5} value={feedbackForm.rating} onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })} />
          <textarea className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Notes" value={feedbackForm.notes} onChange={(e) => setFeedbackForm({ ...feedbackForm, notes: e.target.value })} />
          <button type="submit" disabled={submitting} className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60 md:col-span-2">
            Submit Feedback
          </button>
        </form>
      </article>
    </section>
  );
}
