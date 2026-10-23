import { test, expect } from "../fixtures/roles.fixture";
import { FIXTURE_CREDENTIALS } from "../fixtures/roles.fixture";

const BACKEND_URL = "http://localhost:5000";

test.describe("Admin workflow: certification submit + review", () => {
  test("intern submits a certification, admin approves it", async ({ request, adminSuperPage }) => {
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
      data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
    });
    const loginBody = await loginRes.json();
    const internHeaders = { Authorization: `Bearer ${loginBody.data.accessToken || loginBody.data.token}` };

    const courseName = `E2E Workflow Cert ${Date.now()}`;
    const submitRes = await request.post(`${BACKEND_URL}/api/intern/certifications`, {
      headers: internHeaders,
      multipart: {
        certificateFile: {
          name: "e2e-cert.pdf",
          mimeType: "application/pdf",
          // Content embeds courseName so each submission's file hash is
          // unique (certification.service.js also dedupes by file content
          // hash, separately from the courseName/provider/date dedupe) --
          // a fixed buffer would collide with itself on a Playwright retry.
          buffer: Buffer.from(`%PDF-1.4\n${courseName}\n%%EOF`)
        },
        courseName,
        skillCategory: "Web Development",
        provider: "E2E Test Provider",
        completionDate: new Date().toISOString().slice(0, 10)
      }
    });
    expect(submitRes.ok()).toBeTruthy();

    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });

    // exact:true matters here -- "Review" is a substring of the adjacent
    // "Preview {courseName}" button's accessible name, so Playwright's
    // default substring name-match would resolve to both.
    await row.getByRole("button", { name: "Review", exact: true }).click();
    await adminSuperPage.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });

  // Verification Admin owns admin:certification:review (ROLE_PERMISSIONS,
  // roles.js) -- every other test in this file exercises this action as
  // Super Admin only, which never actually proves Verification Admin's own
  // grant works. Same flow as the Super Admin test above, different fixture.
  test("intern submits a certification, Verification Admin approves it", async ({ request, adminVerificationPage }) => {
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
      data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
    });
    const loginBody = await loginRes.json();
    const internHeaders = { Authorization: `Bearer ${loginBody.data.accessToken || loginBody.data.token}` };

    const courseName = `E2E Verification Admin Cert ${Date.now()}`;
    const submitRes = await request.post(`${BACKEND_URL}/api/intern/certifications`, {
      headers: internHeaders,
      multipart: {
        certificateFile: {
          name: "e2e-cert.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from(`%PDF-1.4\n${courseName}\n%%EOF`)
        },
        courseName,
        skillCategory: "Web Development",
        provider: "E2E Test Provider",
        completionDate: new Date().toISOString().slice(0, 10)
      }
    });
    expect(submitRes.ok()).toBeTruthy();

    await adminVerificationPage.goto("/dashboard/admin/certification-review");
    const row = adminVerificationPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });

    await row.getByRole("button", { name: "Review", exact: true }).click();
    await adminVerificationPage.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(adminVerificationPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });
});

test.describe("Admin workflow: certification review edge cases", () => {
  // Memoized across every test in this block -- workers:1/fullyParallel:false
  // means these run serially in one process, so a plain module-level cache
  // is safe (same pattern loginAsRoleViaApi uses per-worker in session.ts).
  // Cuts this block's login-fixture-request footprint from one per test to
  // one for the whole block, which matters because authLimiter (30 req/15min
  // per IP) is shared across every login/signup/refresh in the suite.
  let cachedInternHeaders: Record<string, string> | null = null;
  async function getInternHeaders(request: import("@playwright/test").APIRequestContext) {
    if (cachedInternHeaders) return cachedInternHeaders;
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/intern/login`, {
      data: { email: FIXTURE_CREDENTIALS.intern.email, password: FIXTURE_CREDENTIALS.intern.password }
    });
    // Same check session.ts's own fetchSession makes -- without it, a 429
    // here (authLimiter) surfaces later as a confusing element-not-found
    // timeout in whichever test seeds first, instead of a clear cause.
    if (!loginRes.ok()) {
      throw new Error(`Intern login fixture failed: ${loginRes.status()} ${await loginRes.text()}`);
    }
    const loginBody = await loginRes.json();
    cachedInternHeaders = { Authorization: `Bearer ${loginBody.data.accessToken || loginBody.data.token}` };
    return cachedInternHeaders;
  }

  async function submitCertification(request: import("@playwright/test").APIRequestContext, suffix: string) {
    const headers = await getInternHeaders(request);
    const courseName = `E2E ${suffix} ${Date.now()}`;
    await request.post(`${BACKEND_URL}/api/intern/certifications`, {
      headers,
      multipart: {
        // Content embeds courseName so each submission's file hash is unique
        // (certification.service.js dedupes by file content hash separately
        // from the courseName/provider/date dedupe).
        certificateFile: { name: "e2e-cert.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n${courseName}\n%%EOF`) },
        courseName,
        skillCategory: "Web Development",
        provider: "E2E Test Provider",
        completionDate: new Date().toISOString().slice(0, 10)
      }
    });
    return courseName;
  }

  test("approving with an optional remarks note persists it and shows it under the Verified filter", async ({ request, adminSuperPage }) => {
    const courseName = await submitCertification(request, "Optional Remarks Cert");
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Review", exact: true }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill("Verified against issuer registry.");
    await dialog.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();

    await adminSuperPage.getByRole("combobox", { name: "Filter certification status" }).selectOption("verified");
    const verifiedRow = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(verifiedRow).toBeVisible({ timeout: 15000 });
    await expect(verifiedRow.getByText("Verified against issuer registry.")).toBeVisible();
    // No Review button once a decision has been made -- the only guard
    // against re-reviewing is backend-side (see the duplicate-review tests
    // below); the UI simply stops offering the action.
    await expect(verifiedRow.getByRole("button", { name: "Review", exact: true })).toHaveCount(0);
  });

  test("a verified certification cannot be reviewed again (duplicate-approval prevention)", async ({ request, adminSuperPage }) => {
    const courseName = await submitCertification(request, "Duplicate Approve Cert");
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Review", exact: true }).click();
    await adminSuperPage.getByRole("dialog").getByRole("button", { name: "Approve", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();

    // No UI affordance re-opens a decided review, so this hits the backend
    // guard directly -- exactly what a second concurrent admin tab would
    // trigger. Reuses adminSuperPage's already-established session (no extra
    // login) via the same localStorage key session.ts writes to.
    const adminToken = await adminSuperPage.evaluate(() => localStorage.getItem("internai.auth.token"));
    const listRes = await request.get(
      `${BACKEND_URL}/api/admin/certifications?status=verified&q=${encodeURIComponent(courseName)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const listBody = await listRes.json();
    const certificationId = listBody.certifications[0]._id;

    const secondReview = await request.patch(`${BACKEND_URL}/api/admin/certifications/${certificationId}/review`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "verified", reviewNotes: "second attempt" }
    });
    expect(secondReview.status()).toBe(400);
    const secondBody = await secondReview.json();
    expect(secondBody.message).toMatch(/only pending certifications can be reviewed/i);
  });

  test("a rejected certification cannot be reviewed again (duplicate-rejection prevention)", async ({ request, adminSuperPage }) => {
    const courseName = await submitCertification(request, "Duplicate Reject Cert");
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Review", exact: true }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill("Initial rejection.");
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();

    const adminToken = await adminSuperPage.evaluate(() => localStorage.getItem("internai.auth.token"));
    const listRes = await request.get(
      `${BACKEND_URL}/api/admin/certifications?status=rejected&q=${encodeURIComponent(courseName)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const listBody = await listRes.json();
    const certificationId = listBody.certifications[0]._id;

    const secondReview = await request.patch(`${BACKEND_URL}/api/admin/certifications/${certificationId}/review`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "rejected", rejectionReason: "second attempt" }
    });
    expect(secondReview.status()).toBe(400);
    const secondBody = await secondReview.json();
    expect(secondBody.message).toMatch(/only pending certifications can be reviewed/i);
  });

  test("a rejection reason survives a full page reload", async ({ request, adminSuperPage }) => {
    const courseName = await submitCertification(request, "Reload Persistence Cert");
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Review", exact: true }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await dialog.getByLabel("Review remarks").fill("Certificate does not match issuer records.");
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();

    await adminSuperPage.reload();
    await adminSuperPage.getByRole("combobox", { name: "Filter certification status" }).selectOption("rejected");
    const rejectedRow = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(rejectedRow).toBeVisible({ timeout: 15000 });
    await expect(rejectedRow.getByText("Certificate does not match issuer records.")).toBeVisible();
  });

  test("search matches by course/provider/category only, not by student name -- matching the search field's own placeholder", async ({ request, adminSuperPage }) => {
    const courseName = await submitCertification(request, "Name Search Scope Cert");
    await adminSuperPage.goto("/dashboard/admin/certification-review");
    const row = adminSuperPage.getByRole("row", { name: new RegExp(courseName) });
    await expect(row).toBeVisible({ timeout: 15000 });

    // "E2E Test Intern" is the e2e.intern fixture's real InternProfile.fullName
    // (seed-e2e-fixtures.js), shown as the row's own Student cell. The
    // backend's $or (certification.service.js listCertificationsForAdmin)
    // only regexes courseName/provider/skillCategory -- it never resolves the
    // populated user/internProfile refs into the search filter. This matches
    // exactly what the search input's own placeholder promises ("Search by
    // course, provider, or category..."); it never claims to search by
    // student name, so this is documented, intentional scope, not a bug.
    await adminSuperPage.getByPlaceholder(/search by course, provider, or category/i).fill("E2E Test Intern");
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).toBeHidden();

    // Clean up -- clear the search and reject so this fresh cert doesn't linger.
    await adminSuperPage.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Review", exact: true }).click();
    await adminSuperPage.getByRole("dialog").getByLabel("Review remarks").fill("E2E test cleanup rejection.");
    await adminSuperPage.getByRole("dialog").getByRole("button", { name: "Reject", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: new RegExp(courseName) })).not.toBeVisible();
  });
});

test.describe("Admin workflow: company verify/unverify", () => {
  test("unverifying then re-verifying the E2E test company round-trips cleanly", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/companies");
    const search = adminSuperPage.getByPlaceholder(/search/i).first();
    if (await search.count()) {
      await search.fill("E2E Test Company");
      await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
    }

    const card = adminSuperPage.locator("text=E2E Test Company").first();
    test.skip((await card.count()) === 0, "E2E Test Company not visible in admin companies view.");

    // exact:true throughout -- "Verify" is a substring of "Unverify", so a
    // non-exact name match would resolve to both buttons.
    const unverifyButton = adminSuperPage.getByRole("button", { name: "Unverify", exact: true }).first();
    if (await unverifyButton.count()) {
      await unverifyButton.click();
      // A ConfirmDialog is expected here (confirm destructive-ish action) --
      // confirm it if present, otherwise the click itself already applied.
      const confirmButton = adminSuperPage.getByRole("dialog").getByRole("button", { name: /confirm|unverify/i });
      if (await confirmButton.count()) await confirmButton.click();
      await expect(adminSuperPage.getByRole("button", { name: "Verify", exact: true }).first()).toBeVisible();

      // Revert -- leave the shared fixture company's verification status as found.
      await adminSuperPage.getByRole("button", { name: "Verify", exact: true }).first().click();
      await expect(adminSuperPage.getByRole("button", { name: "Unverify", exact: true }).first()).toBeVisible();
    }
  });

  test("Suspend then re-verify round-trips the E2E test company back to verified", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/companies");
    const search = adminSuperPage.getByPlaceholder(/search/i).first();
    if (await search.count()) {
      await search.fill("E2E Test Company");
      await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
    }

    const card = adminSuperPage.locator("text=E2E Test Company").first();
    test.skip((await card.count()) === 0, "E2E Test Company not visible in admin companies view.");

    // Only proceed from a known "verified" starting point -- Suspend is not
    // offered otherwise, and this keeps the test independent of whatever
    // order other tests in this file happen to run in.
    const suspendButton = adminSuperPage.getByRole("button", { name: "Suspend", exact: true }).first();
    if (await suspendButton.count()) {
      await suspendButton.click();
      const dialog = adminSuperPage.getByRole("dialog");
      await expect(dialog).toContainText("Suspend E2E Test Company?");
      await dialog.getByRole("button", { name: "Suspend", exact: true }).click();
      await expect(dialog).toBeHidden();
      // StatusBadge renders the raw lowercase status value -- "capitalize"
      // in status-badge.tsx is a CSS-only text-transform, not a JS/DOM
      // change, so the actual text node is "suspended", not "Suspended".
      await expect(adminSuperPage.getByText("suspended", { exact: true }).first()).toBeVisible();

      // Revert -- suspended isn't verified, so Verify is offered again;
      // clicking it restores the original verified+badge state.
      await adminSuperPage.getByRole("button", { name: "Verify", exact: true }).first().click();
      await expect(adminSuperPage.getByRole("button", { name: "Unverify", exact: true }).first()).toBeVisible();
    }
  });

  test("search matches by contact name (recruiter), not just company name", async ({ adminSuperPage }) => {
    // CloudNest's seeded contactName is "Nisha Rao" (backend $or includes
    // contactName, admin.controller.js getCompanies) -- searching a fragment
    // of it should surface the company even though the query never appears
    // in companyName/companyEmail. Read-only, no state mutation.
    await adminSuperPage.goto("/dashboard/admin/verification");
    await adminSuperPage.getByPlaceholder(/search companies/i).fill("Nisha");
    await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
    await expect(adminSuperPage.getByText("CloudNest")).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Admin workflow: verification queue and rejection/suspension UI", () => {
  test("Verification Queue lists only pending companies, not verified ones", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/verification");
    await expect(adminSuperPage.getByText("pending", { exact: true }).first()).toBeVisible();
    await expect(adminSuperPage.getByText("Verified", { exact: true })).toHaveCount(0);
  });

  // CloudNest is a seeded pending fixture, distinct from "E2E Test Company"
  // (used by the verify/unverify round-trip test above) -- keeps this test's
  // blast radius isolated from that one. Searching first narrows the queue
  // to a single card, so page-level role locators are unambiguous --
  // matches the existing pattern in the verify/unverify test above.
  test("Reject reveals an inline reason field and can be collapsed without submitting", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/verification");
    await adminSuperPage.getByPlaceholder(/search companies/i).fill("CloudNest");
    await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
    // Wait for the filter to actually resolve (the list briefly shows a
    // loading skeleton with no company text at all) before deciding whether
    // to skip -- an immediate .count() here can misfire as "not found"
    // while still mid-request. Once "E2E Test Co" (the OTHER seeded pending
    // fixture -- distinct from the normally-verified "E2E Test Company") is
    // gone, the filter has settled and its Reject button can no longer make
    // the role locator below ambiguous.
    await expect(adminSuperPage.getByText("E2E Test Co")).toBeHidden({ timeout: 15000 });
    const card = adminSuperPage.locator("text=CloudNest").first();
    test.skip((await card.count()) === 0, "CloudNest fixture company not visible in verification queue.");

    await adminSuperPage.getByRole("button", { name: "Reject", exact: true }).click();
    const reasonField = adminSuperPage.getByLabel("Rejection reason");
    await expect(reasonField).toBeVisible();

    // Re-clicking Reject toggles the inline panel closed -- there is no
    // separate Cancel button (confirmed in admin-companies-view.tsx).
    await adminSuperPage.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(reasonField).toBeHidden();
    // Company is untouched -- still pending, Verify button still present.
    await expect(adminSuperPage.getByRole("button", { name: "Verify", exact: true })).toBeVisible();
  });

  test("Suspend opens a confirmation dialog that can be cancelled", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/verification");
    await adminSuperPage.getByPlaceholder(/search companies/i).fill("CloudNest");
    await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
    // See the comment in the Reject test above -- wait for the filter to
    // resolve before deciding whether to skip, not an instant .count().
    await expect(adminSuperPage.getByText("E2E Test Co")).toBeHidden({ timeout: 15000 });
    const card = adminSuperPage.locator("text=CloudNest").first();
    test.skip((await card.count()) === 0, "CloudNest fixture company not visible in verification queue.");

    await adminSuperPage.getByRole("button", { name: "Suspend", exact: true }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await expect(dialog).toContainText("Suspend CloudNest?");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    // Still pending, not suspended -- Suspend button (not Reactivate) still present.
    await expect(adminSuperPage.getByRole("button", { name: "Suspend", exact: true })).toBeVisible();
  });

  test("search narrows the verification queue", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/verification");
    await adminSuperPage.getByPlaceholder(/search companies/i).fill("zzzznonexistentzzzz9999");
    await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
    await expect(adminSuperPage.locator("body")).not.toContainText(/something went wrong/i);
    await expect(adminSuperPage.getByText("CloudNest")).toBeHidden();
  });

  // Full real round trip: reject CloudNest for real (persists status +
  // reason to the DB), confirm it, then restore it to "pending" via
  // Verify -> Unverify so every other test in this file keeps finding it in
  // its expected starting state. There is no direct "rejected -> pending"
  // button, so the restore path deliberately goes through "verified" first
  // (Unverify is the only control that sets status back to "pending" --
  // admin-dashboard-page.tsx handleVerify(company, "pending", ...)).
  test("Reject actually persists a rejection reason, and CloudNest is restored to pending afterwards", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/verification");
    await adminSuperPage.getByPlaceholder(/search companies/i).fill("CloudNest");
    await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
    await expect(adminSuperPage.getByText("E2E Test Co")).toBeHidden({ timeout: 15000 });
    const card = adminSuperPage.locator("text=CloudNest").first();
    test.skip((await card.count()) === 0, "CloudNest fixture company not visible in verification queue.");

    try {
      const reason = "E2E automated rejection check -- restored to pending by the same test.";
      await adminSuperPage.getByRole("button", { name: "Reject", exact: true }).click();
      await adminSuperPage.getByLabel("Rejection reason").fill(reason);
      await adminSuperPage.getByRole("button", { name: "Confirm Rejection", exact: true }).click();
      // Rejected is no longer pending -- it leaves the verification queue.
      await expect(adminSuperPage.getByText("CloudNest")).toBeHidden({ timeout: 15000 });

      // Confirm the rejection actually persisted (status + reason) on the
      // general Companies view, which shows every status.
      await adminSuperPage.goto("/dashboard/admin/companies");
      await adminSuperPage.getByPlaceholder(/search companies/i).fill("CloudNest");
      await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
      // Lowercase -- StatusBadge's "capitalize" is a CSS text-transform only,
      // the DOM text node is the raw lowercase status value.
      await expect(adminSuperPage.getByText("rejected", { exact: true }).first()).toBeVisible({ timeout: 15000 });
      await expect(adminSuperPage.getByText(`Reason: ${reason}`)).toBeVisible();

      // Restore -- rejected isn't verified, so Verify is offered; then Unverify
      // (confirmed) sets it back to "pending", its original state. This is the
      // 4th and 5th real backend round trip inside one test, so give each a
      // generous timeout rather than the 5s default.
      await adminSuperPage.getByRole("button", { name: "Verify", exact: true }).first().click();
      await expect(adminSuperPage.getByRole("button", { name: "Unverify", exact: true }).first()).toBeVisible({ timeout: 15000 });
      await adminSuperPage.getByRole("button", { name: "Unverify", exact: true }).first().click();
      const dialog = adminSuperPage.getByRole("dialog");
      await expect(dialog).toContainText("Unverify CloudNest?", { timeout: 15000 });
      await dialog.getByRole("button", { name: "Unverify", exact: true }).click();
      await expect(dialog).toBeHidden({ timeout: 15000 });

      // Full circle -- back in the pending queue.
      await adminSuperPage.goto("/dashboard/admin/verification");
      await adminSuperPage.getByPlaceholder(/search companies/i).fill("CloudNest");
      await adminSuperPage.getByRole("button", { name: "Search", exact: true }).click();
      // Wait for the filter to settle (see the comment on the same pattern
      // earlier in this file) before asserting on "Reject" -- otherwise the
      // still-unfiltered list can transiently show both CloudNest's AND
      // "E2E Test Co"'s Reject button, making the role locator ambiguous.
      await expect(adminSuperPage.getByText("E2E Test Co")).toBeHidden({ timeout: 15000 });
      await expect(adminSuperPage.getByRole("button", { name: "Reject", exact: true })).toBeVisible({ timeout: 15000 });
    } finally {
      // If any step above died mid-flight, CloudNest must not stay rejected:
      // two other specs (search-by-recruiter, pending-only queue) require it
      // pending. Restore through the API rather than the UI so the cleanup
      // cannot itself fail on whatever UI state the failure left behind.
      const token = await adminSuperPage.evaluate(() => window.localStorage.getItem("internai.auth.token"));
      const companiesRes = await adminSuperPage.request.get(`${BACKEND_URL}/api/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await companiesRes.json().catch(() => ({}));
      const list = body.companies || body.data?.companies || [];
      const cloudNest = list.find((c: { companyName?: string }) => c.companyName === "CloudNest");
      if (cloudNest && cloudNest.verificationStatus !== "pending") {
        await adminSuperPage.request.patch(`${BACKEND_URL}/api/admin/companies/${cloudNest._id}/verification`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { status: "pending", rejectionReason: "" }
        });
      }
    }
  });
});

test.describe("Admin workflow: user management actions", () => {
  test("changing an admin sub-role applies immediately and round-trips back", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    // No search field for admin rows specifically -- the role-change select's
    // accessible name is the user's CURRENT admin role (admin-dashboard-page.tsx),
    // so this only works while the fixture starts as Support Admin.
    const roleSelect = adminSuperPage.getByRole("combobox", { name: "Support Admin" });
    test.skip((await roleSelect.count()) === 0, "e2e.admin.support fixture row not visible (unexpected role or not seeded).");

    await roleSelect.selectOption("verification_admin");
    await expect(adminSuperPage.getByRole("combobox", { name: "Verification Admin" })).toBeVisible();
    await expect(adminSuperPage.getByText("Admin role updated")).toBeVisible();

    // Revert -- leave the shared fixture's admin role as found.
    await adminSuperPage.getByRole("combobox", { name: "Verification Admin" }).selectOption("support_admin");
    await expect(adminSuperPage.getByRole("combobox", { name: "Support Admin" })).toBeVisible();
  });

  // Deactivate/Activate is immediate (no ConfirmDialog) and toggles by
  // re-clicking the same button with a flipped label -- safe to round-trip,
  // but only on a generic seeded intern, never on an e2e.* login fixture
  // that other specs depend on being able to authenticate as.
  test("Deactivate/Activate toggles a non-fixture user's status, shows a success toast, and survives a reload", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    const search = adminSuperPage.getByPlaceholder(/search by email/i);
    await search.fill("studentmail.example");
    const row = adminSuperPage.getByRole("row", { name: /studentmail\.example/ }).first();
    test.skip((await row.count()) === 0, "No non-fixture seeded student found to safely toggle.");

    await row.getByRole("button", { name: "Deactivate", exact: true }).click();
    await expect(row.getByRole("button", { name: "Activate", exact: true })).toBeVisible();
    await expect(adminSuperPage.getByText("User deactivated")).toBeVisible();

    // Reload -- the flip must be a real DB write, not just client-side state.
    await adminSuperPage.reload();
    await search.fill("studentmail.example");
    await expect(adminSuperPage.getByRole("row", { name: /studentmail\.example/ }).first().getByRole("button", { name: "Activate", exact: true })).toBeVisible();

    // Revert -- leave the seeded account active as found.
    await adminSuperPage.getByRole("row", { name: /studentmail\.example/ }).first().getByRole("button", { name: "Activate", exact: true }).click();
    await expect(adminSuperPage.getByRole("row", { name: /studentmail\.example/ }).first().getByRole("button", { name: "Deactivate", exact: true })).toBeVisible();
    await expect(adminSuperPage.getByText("User activated")).toBeVisible();
  });

  test("Deactivate button is disabled for the row while its request is in flight (duplicate-action prevention)", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    await adminSuperPage.getByPlaceholder(/search by email/i).fill("studentmail.example");
    const row = adminSuperPage.getByRole("row", { name: /studentmail\.example/ }).first();
    test.skip((await row.count()) === 0, "No non-fixture seeded student found to safely toggle.");

    await adminSuperPage.route("**/api/admin/users/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 800));
      return route.continue();
    });

    const deactivateButton = row.getByRole("button", { name: "Deactivate", exact: true });
    await deactivateButton.click();
    await expect(deactivateButton).toBeDisabled();
    await expect(row.getByRole("button", { name: "Activate", exact: true })).toBeVisible({ timeout: 15000 });

    // Revert -- leave the seeded account active as found.
    await adminSuperPage.unroute("**/api/admin/users/*");
    await row.getByRole("button", { name: "Activate", exact: true }).click();
    await expect(row.getByRole("button", { name: "Deactivate", exact: true })).toBeVisible();
  });

  test("Soft Delete opens a confirmation dialog that can be cancelled", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    const search = adminSuperPage.getByPlaceholder(/search by email/i);
    await search.fill("studentmail.example");
    const row = adminSuperPage.getByRole("row", { name: /studentmail\.example/ }).first();
    test.skip((await row.count()) === 0, "No non-fixture seeded student found to safely target.");
    // The row's first cell is the select-checkbox, not the email -- read the
    // email from the checkbox's own "Select {email}" aria-label instead.
    const checkboxLabel = (await row.getByRole("checkbox").getAttribute("aria-label")) || "";
    const email = checkboxLabel.replace(/^Select /, "");

    await row.getByRole("button", { name: "Soft Delete", exact: true }).click();
    const dialog = adminSuperPage.getByRole("dialog");
    await expect(dialog).toContainText(`Soft delete ${email}?`);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    // Row is untouched -- still present, still has its action buttons.
    await expect(row.getByRole("button", { name: "Soft Delete", exact: true })).toBeVisible();
  });

  // "Toggle Role" flips a user's top-level role between company and intern
  // (admin-dashboard-page.tsx: handleUserRole(user, user.role === "company"
  // ? "intern" : "company")) -- unlike every other action here, this is not
  // confirmed safely reversible in place (role-specific profile data may not
  // round-trip), so it is deliberately not executed against any real
  // fixture. This only confirms the control renders for a company row.
  test("Toggle Role control is present on company rows (not executed -- see comment)", async ({ adminSuperPage }) => {
    await adminSuperPage.goto("/dashboard/admin/users");
    await adminSuperPage.getByPlaceholder(/search by email/i).fill("e2e-company-1784917328@example.com");
    const row = adminSuperPage.getByRole("row", { name: /e2e-company-1784917328@example\.com/ });
    test.skip((await row.count()) === 0, "Non-fixture seeded company row not found.");
    await expect(row.getByRole("button", { name: "Toggle Role", exact: true })).toBeVisible();
  });
});
