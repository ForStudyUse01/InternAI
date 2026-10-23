import fs from "fs";
import path from "path";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");

const BACKEND_URL = "http://localhost:5000";

async function internAuthHeader(request: APIRequestContext) {
  const res = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
    data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
  });
  const body = await res.json();
  return { Authorization: `Bearer ${body.data.accessToken || body.data.token}` };
}

// Resume upload always merges parsed data into the shared e2e.intern fixture
// (mergeParsedResumeIntoProfile has no "dry run" mode), so every test that
// uploads a resume snapshots the profile first and restores it in a
// `finally`, matching the revert-cleanly convention used elsewhere in this
// suite (see student.workflows.spec.ts's save/unsave test).
function buildRestorePayload(profile: Record<string, any>) {
  const payload: Record<string, unknown> = {
    fullName: profile.fullName || "",
    mobile: profile.mobile || "",
    skills: profile.skills || [],
    softSkills: profile.softSkills || [],
    summary: profile.summary || profile.bio || "",
    bio: profile.bio || "",
    address: profile.address || "",
    educationDetails: profile.educationDetails || [],
    courseEntries: profile.courseEntries || [],
    certificationEntries: profile.certificationEntries || [],
    profileSections: profile.profileSections || {}
  };
  // linkedinUrl/githubUrl/portfolioUrl are validated as real URLs whenever the
  // key is present at all -- omit them when the fixture didn't have one set,
  // or restoring would fail with "must be a valid URL" on an empty string.
  if (profile.linkedinUrl) payload.linkedinUrl = profile.linkedinUrl;
  if (profile.githubUrl) payload.githubUrl = profile.githubUrl;
  if (profile.portfolioUrl) payload.portfolioUrl = profile.portfolioUrl;
  return payload;
}

// Contact fields deliberately match the shared e2e.intern fixture's own
// email/mobile (not a distinct fake one): the resume-merge path writes the
// parsed contact info straight onto the profile, and profile.email has no
// allowed field on PUT /api/intern/profile to restore it through afterward
// (see buildRestorePayload) -- using the real values means the "restore"
// after this test is a no-op for contact fields instead of silent drift.
const FULL_RESUME_TEXT = `John Carter
Aspiring Full Stack Developer
Email: e2e.intern@internai-test.local
Phone: 9999900001
LinkedIn: https://linkedin.com/in/john-carter-dev
GitHub: https://github.com/john-carter-dev

Professional Summary
Motivated software engineer with hands-on experience building full-stack web applications using modern JavaScript frameworks.

Education
B.Tech in Computer Science, XYZ Institute of Technology, 2024

Skills
JavaScript, TypeScript, React, Node.js, MongoDB, Docker, AWS, Git

Experience
Software Engineering Intern, Acme Corp, 2023
Developed and deployed a customer-facing dashboard using React and Node.js, improving load times by 30 percent.

Projects
Task Manager App
Built a full-stack task management application using React, Node.js, and MongoDB with real-time updates. https://github.com/john-carter-dev/task-manager

Certifications
AWS Certified Cloud Practitioner, Amazon Web Services, 2023
`;

test.describe("Resume parser regression", () => {
  test("a full-featured resume is parsed correctly across every section and the result persists", async ({ request }) => {
    const headers = await internAuthHeader(request);
    const before = await (await request.get(`${BACKEND_URL}/api/intern/profile`, { headers })).json();
    const beforeProfile = before.data.profile;

    try {
      const uploadRes = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
        headers,
        multipart: { resume: { name: "full-resume.txt", mimeType: "text/plain", buffer: Buffer.from(FULL_RESUME_TEXT) } }
      });
      expect(uploadRes.ok()).toBeTruthy();
      const parsed = (await uploadRes.json()).data.parsed;

      // Contact
      expect(parsed.email).toBe("e2e.intern@internai-test.local");
      expect(parsed.mobile).toBe("9999900001");
      expect(parsed.links.some((l: string) => l.includes("linkedin.com/in/john-carter-dev"))).toBe(true);
      expect(parsed.links.some((l: string) => l.includes("github.com/john-carter-dev"))).toBe(true);

      // Education
      expect(parsed.education.length).toBeGreaterThan(0);
      const eduText = JSON.stringify(parsed.education).toLowerCase();
      expect(eduText).toMatch(/b\.?\s?tech/);
      expect(eduText).toContain("institute");

      // Skills
      const skillsLower = parsed.skills.map((s: string) => s.toLowerCase());
      for (const skill of ["javascript", "typescript", "react", "node.js", "mongodb", "docker", "aws", "git"]) {
        expect(skillsLower, `expected "${skill}" to be recognized`).toContain(skill);
      }

      // Experience
      expect(parsed.experience.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.experience)).toContain("Acme Corp");

      // Projects
      expect(parsed.projects.length).toBeGreaterThan(0);
      const projectText = JSON.stringify(parsed.projects).toLowerCase();
      expect(projectText).toContain("task manager");
      expect(projectText).toContain("github.com/john-carter-dev/task-manager");

      // Certifications
      expect(parsed.certifications.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.certifications).toLowerCase()).toContain("cloud practitioner");

      // Resume score generation
      const scoreRes = await request.get(`${BACKEND_URL}/api/intern/resume/score`, { headers });
      expect(scoreRes.ok()).toBeTruthy();

      // Persistence -- re-fetch from a clean GET, not just the upload response.
      const afterUpload = await (await request.get(`${BACKEND_URL}/api/intern/profile`, { headers })).json();
      const persistedProfile = afterUpload.data.profile;
      expect(persistedProfile.resume?.parsed?.email).toBe("e2e.intern@internai-test.local");
      expect(typeof persistedProfile.resume?.score).toBe("number");

      // Re-upload (duplicate upload) must succeed idempotently, not error.
      const reuploadRes = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
        headers,
        multipart: { resume: { name: "full-resume.txt", mimeType: "text/plain", buffer: Buffer.from(FULL_RESUME_TEXT) } }
      });
      expect(reuploadRes.ok()).toBeTruthy();
    } finally {
      await request.put(`${BACKEND_URL}/api/intern/profile`, { headers, data: buildRestorePayload(beforeProfile) });
    }
  });

  test("a resume with only a name and no other sections does not crash and returns empty sections, not fabricated data", async ({ request }) => {
    const headers = await internAuthHeader(request);
    const before = await (await request.get(`${BACKEND_URL}/api/intern/profile`, { headers })).json();
    const beforeProfile = before.data.profile;

    try {
      const res = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
        headers,
        multipart: { resume: { name: "sparse-resume.txt", mimeType: "text/plain", buffer: Buffer.from("Jamie Lee\n") } }
      });
      expect(res.ok()).toBeTruthy();
      const parsed = (await res.json()).data.parsed;
      expect(Array.isArray(parsed.education)).toBe(true);
      expect(Array.isArray(parsed.skills)).toBe(true);
      expect(Array.isArray(parsed.projects)).toBe(true);
      expect(Array.isArray(parsed.certifications)).toBe(true);
      expect(parsed.education.length).toBe(0);
      expect(parsed.skills.length).toBe(0);
    } finally {
      await request.put(`${BACKEND_URL}/api/intern/profile`, { headers, data: buildRestorePayload(beforeProfile) });
    }
  });

  test("a DOCX resume is parsed correctly (contact, education, skills, experience, projects, certifications, links)", async ({ request }) => {
    const headers = await internAuthHeader(request);
    const before = await (await request.get(`${BACKEND_URL}/api/intern/profile`, { headers })).json();
    const beforeProfile = before.data.profile;

    try {
      const buffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-resume.docx"));
      const uploadRes = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
        headers,
        multipart: {
          resume: {
            name: "sample-resume.docx",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            buffer
          }
        }
      });
      expect(uploadRes.ok()).toBeTruthy();
      const parsed = (await uploadRes.json()).data.parsed;

      expect(parsed.email).toBe("e2e.intern@internai-test.local");
      expect(parsed.mobile).toBe("9999900001");
      expect(parsed.links.some((l: string) => l.includes("linkedin.com/in/priya-nair-dev"))).toBe(true);

      expect(parsed.education.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.education).toLowerCase()).toContain("abc college");

      const skillsLower = parsed.skills.map((s: string) => s.toLowerCase());
      for (const skill of ["python", "django", "postgresql", "redis", "kubernetes"]) {
        expect(skillsLower, `expected "${skill}" to be recognized`).toContain(skill);
      }

      expect(parsed.experience.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.experience)).toContain("Globex Inc");

      expect(parsed.projects.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.projects).toLowerCase()).toContain("inventory tracker");

      expect(parsed.certifications.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.certifications).toLowerCase()).toContain("kubernetes administrator");
    } finally {
      await request.put(`${BACKEND_URL}/api/intern/profile`, { headers, data: buildRestorePayload(beforeProfile) });
    }
  });

  test("a PDF resume is parsed correctly (contact, education, skills, experience, projects, certifications, links)", async ({ request }) => {
    const headers = await internAuthHeader(request);
    const before = await (await request.get(`${BACKEND_URL}/api/intern/profile`, { headers })).json();
    const beforeProfile = before.data.profile;

    try {
      const buffer = fs.readFileSync(path.join(FIXTURES_DIR, "sample-resume.pdf"));
      const uploadRes = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
        headers,
        multipart: { resume: { name: "sample-resume.pdf", mimeType: "application/pdf", buffer } }
      });
      expect(uploadRes.ok()).toBeTruthy();
      const parsed = (await uploadRes.json()).data.parsed;

      expect(parsed.email).toBe("e2e.intern@internai-test.local");
      expect(parsed.mobile).toBe("9999900001");
      expect(parsed.links.some((l: string) => l.includes("github.com/marcus-webb-dev"))).toBe(true);

      expect(parsed.education.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.education).toLowerCase()).toContain("delta state university");

      const skillsLower = parsed.skills.map((s: string) => s.toLowerCase());
      for (const skill of ["java", "spring boot", "mysql", "docker", "aws"]) {
        expect(skillsLower, `expected "${skill}" to be recognized`).toContain(skill);
      }

      expect(parsed.experience.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.experience)).toContain("Initech");

      expect(parsed.projects.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.projects).toLowerCase()).toContain("order processing");

      expect(parsed.certifications.length).toBeGreaterThan(0);
      expect(JSON.stringify(parsed.certifications).toLowerCase()).toContain("developer associate");
    } finally {
      await request.put(`${BACKEND_URL}/api/intern/profile`, { headers, data: buildRestorePayload(beforeProfile) });
    }
  });

  test("rejects a disallowed file type (e.g. an image) with a clear 400, not a crash", async ({ request }) => {
    const headers = await internAuthHeader(request);
    const res = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
      headers,
      multipart: { resume: { name: "resume.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not a real image, just bytes") } }
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/unsupported file format/i);
  });

  test("rejects a file over the 5MB size limit", async ({ request }) => {
    const headers = await internAuthHeader(request);
    const oversized = Buffer.alloc(6 * 1024 * 1024, "a");
    const res = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
      headers,
      multipart: { resume: { name: "big-resume.txt", mimeType: "text/plain", buffer: oversized } }
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/exceeds the maximum allowed size/i);
  });

  test("a file with an allowed extension but unextractable content is rejected with a clear 400, not a server crash", async ({ request }) => {
    const headers = await internAuthHeader(request);
    // Valid extension/mimetype, but the bytes aren't a real PDF -- pdf-parse
    // fails to extract text, and the controller must surface a 400.
    const res = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
      headers,
      multipart: { resume: { name: "corrupt.pdf", mimeType: "application/pdf", buffer: Buffer.from("this is not a real PDF file") } }
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/could not extract text/i);
  });
});
