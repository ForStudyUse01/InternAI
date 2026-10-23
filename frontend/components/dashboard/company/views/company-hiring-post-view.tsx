"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { Empty, field, fieldArea } from "@/components/dashboard/company/company-dashboard-shared";

export type CompanyPostInternshipFormState = {
  role: string;
  department: string;
  internshipType: string;
  mode: string;
  location: string;
  duration: string;
  startDate: string;
  applicationDeadline: string;
  stipend: string;
  perks: string;
  openings: string;
  skillsRequired: string;
  prioritySkills: string;
  description: string;
  responsibilities: string;
  eligibilityCriteria: string;
  educationQualification: string;
  degreePreferences: string;
  minimumCgpa: string;
  experienceRequirement: string;
  selectionProcess: string;
  interviewRoundsInfo: string;
  additionalInstructions: string;
  hrContact: string;
};

type CompanyPostInternshipViewProps = {
  isHrScoped: boolean;
  createInternship: (event: React.FormEvent<HTMLFormElement>) => void;
  postForm: CompanyPostInternshipFormState;
  setPostForm: React.Dispatch<React.SetStateAction<CompanyPostInternshipFormState>>;
  saving: boolean;
};

export function CompanyPostInternshipView({ isHrScoped, createInternship, postForm, setPostForm, saving }: CompanyPostInternshipViewProps) {
  if (isHrScoped) {
    return (
      <SectionPanel title="Post Internship" subtitle="HR workspace can manage assigned internships only.">
        <Empty text="Internship creation is restricted to CEO/Company Admin." />
      </SectionPanel>
    );
  }
  return (
    <SectionPanel title="Post Internship" subtitle="Create a formal internship posting with complete role details.">
      <form className="space-y-6" onSubmit={createInternship}>
        <Card title="Basic Internship Information">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input aria-label="Internship Title" className={field} placeholder="Internship Title" value={postForm.role} onChange={(e) => setPostForm((p) => ({ ...p, role: e.target.value }))} />
            <input aria-label="Department / Domain" className={field} placeholder="Department / Domain" value={postForm.department} onChange={(e) => setPostForm((p) => ({ ...p, department: e.target.value }))} />
            <input aria-label="Internship Type" className={field} placeholder="Internship Type" value={postForm.internshipType} onChange={(e) => setPostForm((p) => ({ ...p, internshipType: e.target.value }))} />
            <input aria-label="Work Mode (remote/on-site/hybrid)" className={field} placeholder="Work Mode (remote/on-site/hybrid)" value={postForm.mode} onChange={(e) => setPostForm((p) => ({ ...p, mode: e.target.value }))} />
            <input aria-label="Location" className={field} placeholder="Location" value={postForm.location} onChange={(e) => setPostForm((p) => ({ ...p, location: e.target.value }))} />
            <input aria-label="Duration (e.g. 3 months)" className={field} placeholder="Duration (e.g. 3 months)" value={postForm.duration} onChange={(e) => setPostForm((p) => ({ ...p, duration: e.target.value }))} />
            <input aria-label="Start Date" type="date" className={field} value={postForm.startDate} onChange={(e) => setPostForm((p) => ({ ...p, startDate: e.target.value }))} />
            <input aria-label="Application Deadline" type="date" className={field} value={postForm.applicationDeadline} onChange={(e) => setPostForm((p) => ({ ...p, applicationDeadline: e.target.value }))} />
          </div>
        </Card>

        <Card title="Compensation & Openings">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input aria-label="Stipend" className={field} placeholder="Stipend" value={postForm.stipend} onChange={(e) => setPostForm((p) => ({ ...p, stipend: e.target.value }))} />
            <input aria-label="Perks / Benefits" className={field} placeholder="Perks / Benefits" value={postForm.perks} onChange={(e) => setPostForm((p) => ({ ...p, perks: e.target.value }))} />
            <input aria-label="Number of Openings" type="number" min={1} className={field} placeholder="Number of Openings" value={postForm.openings} onChange={(e) => setPostForm((p) => ({ ...p, openings: e.target.value }))} />
          </div>
        </Card>

        <Card title="Role Information">
          <div className="grid gap-3 sm:grid-cols-2">
            <textarea aria-label="Job Description" className={`${fieldArea} min-h-24 sm:col-span-2`} placeholder="Job Description" value={postForm.description} onChange={(e) => setPostForm((p) => ({ ...p, description: e.target.value }))} />
            <textarea aria-label="Roles & Responsibilities" className={`${fieldArea} min-h-24 sm:col-span-2`} placeholder="Roles & Responsibilities" value={postForm.responsibilities} onChange={(e) => setPostForm((p) => ({ ...p, responsibilities: e.target.value }))} />
            <input aria-label="Required Skills (comma separated)" className={field} placeholder="Required Skills (comma separated)" value={postForm.skillsRequired} onChange={(e) => setPostForm((p) => ({ ...p, skillsRequired: e.target.value }))} />
            <input aria-label="Preferred Skills (comma separated)" className={field} placeholder="Preferred Skills (comma separated)" value={postForm.prioritySkills} onChange={(e) => setPostForm((p) => ({ ...p, prioritySkills: e.target.value }))} />
            <textarea aria-label="Eligibility Criteria" className={`${fieldArea} min-h-20 sm:col-span-2`} placeholder="Eligibility Criteria" value={postForm.eligibilityCriteria} onChange={(e) => setPostForm((p) => ({ ...p, eligibilityCriteria: e.target.value }))} />
          </div>
        </Card>

        <Card title="Candidate Preferences & Process">
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Education Qualification" className={field} placeholder="Education Qualification" value={postForm.educationQualification} onChange={(e) => setPostForm((p) => ({ ...p, educationQualification: e.target.value }))} />
            <input aria-label="Branch / Degree Preferences" className={field} placeholder="Branch / Degree Preferences" value={postForm.degreePreferences} onChange={(e) => setPostForm((p) => ({ ...p, degreePreferences: e.target.value }))} />
            <input aria-label="Minimum CGPA (if applicable)" className={field} placeholder="Minimum CGPA (if applicable)" value={postForm.minimumCgpa} onChange={(e) => setPostForm((p) => ({ ...p, minimumCgpa: e.target.value }))} />
            <input aria-label="Experience Requirement" className={field} placeholder="Experience Requirement" value={postForm.experienceRequirement} onChange={(e) => setPostForm((p) => ({ ...p, experienceRequirement: e.target.value }))} />
            <textarea aria-label="Selection Process" className={`${fieldArea} min-h-20 sm:col-span-2`} placeholder="Selection Process" value={postForm.selectionProcess} onChange={(e) => setPostForm((p) => ({ ...p, selectionProcess: e.target.value }))} />
            <textarea aria-label="Interview Rounds" className={`${fieldArea} min-h-20 sm:col-span-2`} placeholder="Interview Rounds" value={postForm.interviewRoundsInfo} onChange={(e) => setPostForm((p) => ({ ...p, interviewRoundsInfo: e.target.value }))} />
            <textarea aria-label="Additional Instructions" className={`${fieldArea} min-h-20 sm:col-span-2`} placeholder="Additional Instructions" value={postForm.additionalInstructions} onChange={(e) => setPostForm((p) => ({ ...p, additionalInstructions: e.target.value }))} />
            <input aria-label="HR Contact Details" className={`${field} sm:col-span-2`} placeholder="HR Contact Details" value={postForm.hrContact} onChange={(e) => setPostForm((p) => ({ ...p, hrContact: e.target.value }))} />
          </div>
        </Card>

        <Button type="submit" disabled={saving}>{saving ? "Posting..." : "Publish Internship"}</Button>
      </form>
    </SectionPanel>
  );
}
