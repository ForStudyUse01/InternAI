import { test, expect } from "../fixtures/roles.fixture";
import { FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";

const BACKEND_URL = "http://localhost:5000";

// Memoized across every call in this file -- workers:1/fullyParallel:false
// means tests run serially in one process, so a module-level cache is safe
// (same pattern loginAsRoleViaApi uses per-worker in session.ts) and cuts
// repeated login-fixture-request pressure against authLimiter (30 req/15min
// per IP, shared by every login/signup/refresh in the suite).
let cachedInternHeaders: Record<string, string> | null = null;
async function getInternHeaders(request: import("@playwright/test").APIRequestContext) {
  if (cachedInternHeaders) return cachedInternHeaders;
  const loginRes = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
    data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
  });
  // Same check session.ts's own fetchSession makes -- without it, a 429 here
  // (authLimiter) surfaces 15s later as a confusing "row not found" timeout
  // in whichever test happens to seed first, instead of a clear cause.
  if (!loginRes.ok()) {
    throw new Error(`Intern login fixture failed: ${loginRes.status()} ${await loginRes.text()}`);
  }
  const loginBody = await loginRes.json();
  cachedInternHeaders = { Authorization: `Bearer ${loginBody.data.accessToken || loginBody.data.token}` };
  return cachedInternHeaders;
}

async function seedPendingCertification(request: import("@playwright/test").APIRequestContext) {
  const headers = await getInternHeaders(request);
  const courseName = `E2E Modal Cert ${Date.now()}`;
  await request.post(`${BACKEND_URL}/api/intern/certifications`, {
    headers,
    multipart: {
      // Buffer embeds courseName -- certification.service.js dedupes by file
      // content hash separately from courseName/provider/date, so a fixed
      // buffer would collide across repeated runs.
      certificateFile: { name: "e2e-cert.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n${courseName}\n%%EOF`) },
      courseName,
      skillCategory: "Web Development",
      provider: "E2E Test Provider",
      completionDate: new Date().toISOString().slice(0, 10)
    }
  });
  return courseName;
}

// Both Modal (variant="dialog"/"drawer") and ConfirmDialog render
// role="dialog" aria-modal="true" (verified directly against
// components/ui/modal.tsx and confirm-dialog.tsx) -- this exercises the
// "Review Certification" Modal (admin-certification-review.tsx), which also
// gives Escape-to-close and Cancel-to-close for free.
test.describe("Modal mechanics: Review Certification dialog", () => {
  test("opens via Escape and Cancel, and leaves state untouched when cancelled", async ({ request, adminSuperPage }) => {
    const courseName = await seedPendingCertification(request);
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });

    await row.getByRole("button", { name: "Review", exact: true }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Review Certification");

    await adminSuperPage.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Row is unchanged -- still pending, still reviewable.
    await expect(row.getByRole("button", { name: "Review", exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Review", exact: true }).click();
    await adminSuperPage.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await expect(adminSuperPage.getByRole("dialog")).toBeHidden();
    await expect(row.getByRole("button", { name: "Review", exact: true })).toBeVisible();
  });

  test("focus enters the dialog on open and returns to the trigger button on close", async ({ request, adminSuperPage }) => {
    const courseName = await seedPendingCertification(request);
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });

    const reviewButton = row.getByRole("button", { name: "Review", exact: true });
    await reviewButton.click();
    const dialog = adminSuperPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Focus must land somewhere inside the dialog, not stay on the page body.
    await expect(dialog.locator(":focus")).toHaveCount(1);

    await adminSuperPage.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(reviewButton).toBeFocused();
  });
});

test.describe("Modal mechanics: Certificate Preview dialog", () => {
  test("opens the certificate preview and closes via Escape", async ({ request, adminSuperPage }) => {
    const courseName = await seedPendingCertification(request);
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });

    await row.getByRole("button", { name: `Preview ${courseName}` }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Certificate Preview");

    await adminSuperPage.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Previewing is read-only -- row is still pending and reviewable.
    await expect(row.getByRole("button", { name: "Review", exact: true })).toBeVisible();
  });

  test("a preview request that fails surfaces an error and does not open the preview dialog", async ({ request, adminSuperPage }) => {
    const courseName = await seedPendingCertification(request);
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });

    await adminSuperPage.route("**/api/admin/certifications/*/file*", (route) =>
      route.fulfill({ status: 404, json: { message: "Certificate file not found" } })
    );
    await row.getByRole("button", { name: `Preview ${courseName}` }).click();
    // preview() catches the fetch failure and sets the page-level error
    // state without ever calling setPreviewUrl, so the Modal's `open` stays
    // false -- scoped to <main> to avoid Next.js's own role="alert" route-
    // announcer div.
    await expect(adminSuperPage.locator("main").getByRole("alert")).toContainText("Certificate file not found");
    await expect(adminSuperPage.getByRole("dialog")).toHaveCount(0);

    // Clean up.
    await row.getByRole("button", { name: "Review", exact: true }).click();
    await adminSuperPage.getByRole("dialog").getByLabel("Review remarks").fill("E2E test cleanup rejection.");
    await adminSuperPage.getByRole("dialog").getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });

  test("previewing a second certificate after closing the first shows fresh content, not stale state", async ({ request, adminSuperPage }) => {
    const courseNameA = await seedPendingCertification(request);
    const courseNameB = await seedPendingCertification(request);
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const rowA = adminSuperPage.getByRole("row", { name: new RegExp(courseNameA) });
    const rowB = adminSuperPage.getByRole("row", { name: new RegExp(courseNameB) });
    await expect(rowA).toBeVisible({ timeout: 15000 });
    await expect(rowB).toBeVisible({ timeout: 15000 });

    // Note: the two previews can't be opened back-to-back without closing
    // the first -- the Modal's full-viewport backdrop (role="presentation",
    // inset-0, z-[90]) genuinely blocks clicks on anything behind it, same
    // as a real user would be blocked. So this exercises close-then-reopen.
    const dialog = adminSuperPage.getByRole("dialog");
    await rowA.getByRole("button", { name: `Preview ${courseNameA}` }).click();
    await expect(dialog).toBeVisible();
    const firstSrc = await dialog.locator("iframe, img").getAttribute("src");
    await adminSuperPage.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await rowB.getByRole("button", { name: `Preview ${courseNameB}` }).click();
    await expect(dialog).toBeVisible();
    const secondSrc = await dialog.locator("iframe, img").getAttribute("src");
    expect(secondSrc).toBeTruthy();
    // A fresh object URL for the second file, not the first preview's
    // (revoked) one -- proves preview() isn't leaking stale blob state.
    expect(secondSrc).not.toBe(firstSrc);
    await adminSuperPage.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Clean up both.
    for (const [row, name] of [[rowA, courseNameA], [rowB, courseNameB]] as const) {
      await row.getByRole("button", { name: "Review", exact: true }).click();
      await adminSuperPage.getByRole("dialog").getByLabel("Review remarks").fill("E2E test cleanup rejection.");
      await adminSuperPage.getByRole("dialog").getByRole("button", { name: "Reject", exact: true }).click();
      await expect(adminSuperPage.getByRole("row", { name: new RegExp(name) })).not.toBeVisible();
    }
  });

  test("certificate preview dialog stays usable on a mobile viewport", async ({ request, adminSuperPage }) => {
    const courseName = await seedPendingCertification(request);
    await adminSuperPage.setViewportSize({ width: 375, height: 812 });
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });

    await row.getByRole("button", { name: `Preview ${courseName}` }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
    await adminSuperPage.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Clean up.
    await row.getByRole("button", { name: "Review", exact: true }).click();
    await adminSuperPage.getByRole("dialog").getByLabel("Review remarks").fill("E2E test cleanup rejection.");
    await adminSuperPage.getByRole("dialog").getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });
});

test.describe("Modal mechanics: Review Certification dialog focus trap", () => {
  test("Tab cycling stays contained within the dialog", async ({ request, adminSuperPage }) => {
    const courseName = await seedPendingCertification(request);
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Review", exact: true }).click();

    const dialog = adminSuperPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 15; i++) {
      await adminSuperPage.keyboard.press("Tab");
      await expect(dialog.locator(":focus")).toHaveCount(1);
    }

    await adminSuperPage.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Clean up.
    await row.getByRole("button", { name: "Review", exact: true }).click();
    await adminSuperPage.getByRole("dialog").getByLabel("Review remarks").fill("E2E test cleanup rejection.");
    await adminSuperPage.getByRole("dialog").getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });
});
