import { test, expect } from "../fixtures/roles.fixture";
import { FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";

const BACKEND_URL = "http://localhost:5000";

async function internAuthHeader(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
    data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
  });
  const body = await res.json();
  return { Authorization: `Bearer ${body.data.accessToken || body.data.token}` };
}

test.describe("Student workflow: apply to an internship", () => {
  test("applying requires (and, once set, uses) a resume + professional summary", async ({ request, internPage }) => {
    // Idempotent setup: applyToInternship (intern.controller.js) requires a
    // non-empty resume.filePath and profile.summary before it'll accept an
    // application. Both are safe to (re-)submit -- PUT /profile overwrites
    // summary, POST /resume/upload always accepts a fresh file -- so this
    // test stays repeatable across multiple suite runs rather than depending
    // on the fixture's one-time-only "nothing set yet" state.
    const headers = await internAuthHeader(request);
    // The upload below merges the parsed resume (name "Aarav Sharma", a
    // B.Tech education entry) straight onto the shared e2e.intern profile --
    // snapshot the identity fields it touches and restore them afterwards,
    // or later name-dependent specs (admin user-details modal) fail on the
    // NEXT suite run. Same convention as resume-parser.regression.spec.ts.
    const before = await (await request.get(`${BACKEND_URL}/api/intern/profile`, { headers })).json();
    const beforeProfile = before.data.profile;
    try {
      await request.put(`${BACKEND_URL}/api/intern/profile`, {
        headers,
        data: { summary: "Aspiring software engineer skilled in React and Node.js, eager to contribute to real-world products." }
      });
      const uploadRes = await request.post(`${BACKEND_URL}/api/intern/resume/upload`, {
        headers,
        multipart: {
          resume: {
            name: "e2e-test-resume.txt",
            mimeType: "text/plain",
            buffer: Buffer.from(
              "Aarav Sharma\nAspiring Software Engineer\n\nSkills: React, Node.js, TypeScript, MongoDB\n\nEducation: B.Tech Computer Science\n"
            )
          }
        }
      });
      expect(uploadRes.ok()).toBeTruthy();

      await internPage.goto("/dashboard/intern/internships/search");
      const applyButtons = internPage.getByRole("button", { name: /^(Apply|Applied)$/ });
      const count = await applyButtons.count();
      test.skip(count === 0, "No internship listings visible in this dev DB run -- nothing to apply to.");

      const first = applyButtons.first();
      const label = await first.textContent();
      if (label?.trim() === "Applied") {
        // Already applied in a previous run of this same repeatable test --
        // confirm the persisted end-state instead of re-submitting (the real
        // API already rejects a duplicate application with a 409).
        await expect(first).toBeDisabled();
      } else {
        await first.click();
        await expect(internPage.getByRole("button", { name: "Apply Now" })).toBeVisible();
        await internPage.getByRole("button", { name: "Apply Now" }).click();
        await expect(internPage.getByText(/application submitted/i)).toBeVisible();
      }

      await internPage.goto("/dashboard/intern/applications");
      await expect(internPage.locator("body")).not.toContainText(/something went wrong/i);
    } finally {
      const restoreRes = await request.put(`${BACKEND_URL}/api/intern/profile`, {
        headers,
        data: {
          fullName: beforeProfile.fullName || "E2E Test Intern",
          mobile: beforeProfile.mobile || "9999900001",
          educationDetails: beforeProfile.educationDetails || []
        }
      });
      expect(restoreRes.ok()).toBeTruthy();
    }
  });
});

test.describe("Student workflow: profile edit preserves multi-entry certification/course data", () => {
  test("saving the single-entry edit form does not delete additional certification/course entries", async ({ request, internPage }) => {
    // Regression: the edit form only ever exposes entry [0] for
    // certifications/courses, but the profile can have more (e.g. from
    // resume parsing). Saving used to replace the whole array with just
    // that one edited entry, silently deleting the rest.
    const headers = await internAuthHeader(request);
    const before = await (await request.get(`${BACKEND_URL}/api/intern/profile`, { headers })).json();
    const beforeProfile = before.data.profile;

    try {
      const seedRes = await request.put(`${BACKEND_URL}/api/intern/profile`, {
        headers,
        data: {
          summary: "Aspiring software engineer skilled in React and Node.js, eager to contribute to real-world products.",
          certificationEntries: [
            { name: "Cert One", issuer: "Issuer One", year: "2023", certificateUrl: "", verificationLink: "" },
            { name: "Cert Two", issuer: "Issuer Two", year: "2022", certificateUrl: "", verificationLink: "" }
          ],
          courseEntries: [
            { courseName: "Course One", platform: "Platform One", completionDate: "2023", certificateUrl: "", verificationLink: "" },
            { courseName: "Course Two", platform: "Platform Two", completionDate: "2022", certificateUrl: "", verificationLink: "" }
          ]
        }
      });
      expect(seedRes.ok()).toBeTruthy();

      await internPage.goto("/dashboard/intern/profile/edit");
      // The edit form is sectioned (EDIT_SECTIONS in profile/edit/page.tsx)
      // and opens on "Personal Information" -- the certification fields only
      // exist in the DOM once the "Courses & Certifications" section is
      // active.
      await internPage.getByRole("button", { name: "Courses & Certifications", exact: true }).click();
      // The form only shows entry [0] -- confirm it loaded before saving.
      await expect(internPage.getByLabel("Certification Name")).toHaveValue("Cert One");
      await internPage.getByRole("button", { name: "Save Changes" }).click();
      await expect(internPage.getByText(/profile updated/i)).toBeVisible();

      const after = await (await request.get(`${BACKEND_URL}/api/intern/profile`, { headers })).json();
      const persisted = after.data.profile;
      expect(persisted.certificationEntries).toHaveLength(2);
      expect(persisted.certificationEntries[1].name).toBe("Cert Two");
      expect(persisted.courseEntries).toHaveLength(2);
      expect(persisted.courseEntries[1].courseName).toBe("Course Two");
    } finally {
      await request.put(`${BACKEND_URL}/api/intern/profile`, {
        headers,
        data: {
          summary: beforeProfile.summary || beforeProfile.bio || "",
          certificationEntries: beforeProfile.certificationEntries || [],
          courseEntries: beforeProfile.courseEntries || []
        }
      });
    }
  });
});

test.describe("Student workflow: save/unsave an internship", () => {
  test("toggling save on an internship updates the button and reverts cleanly", async ({ internPage }) => {
    await internPage.goto("/dashboard/intern/internships/search");
    const saveButtons = internPage.getByRole("button", { name: /^(Save|Unsave)$/ });
    const count = await saveButtons.count();
    test.skip(count === 0, "No internship listings visible in this dev DB run -- nothing to save.");

    const first = saveButtons.first();
    const initialLabel = (await first.textContent())?.trim();
    await first.click();
    await expect(first).toHaveText(initialLabel === "Save" ? "Unsave" : "Save");
    // Revert -- leave the shared fixture's saved-internships state as found.
    await first.click();
    await expect(first).toHaveText(initialLabel === "Save" ? "Save" : "Unsave");
  });
});
