const request = require("supertest");
const app = require("../../src/app");
const {
  createUser,
  createAdmin,
  createInternWithProfile,
  createCompanyWithProfile,
  createInternship,
  createApplication,
  authHeader
} = require("../helpers/factories");

describe("Role-based route gating", () => {
  test("intern-only route rejects a company-role user", async () => {
    const { user: companyUser } = await createCompanyWithProfile();
    const res = await request(app).get("/api/intern/profile").set(authHeader(companyUser));
    expect(res.status).toBe(403);
  });

  test("company-only route rejects an intern-role user", async () => {
    const { user: internUser } = await createInternWithProfile();
    const res = await request(app).get("/api/company/profile").set(authHeader(internUser));
    expect(res.status).toBe(403);
  });

  test("admin-only route rejects a non-admin user entirely", async () => {
    const { user: internUser } = await createInternWithProfile();
    const res = await request(app).get("/api/admin/metrics").set(authHeader(internUser));
    expect(res.status).toBe(403);
  });

  test("admin route requiring a specific permission rejects an admin without it", async () => {
    // verification_admin has admin:company:verify etc. but not admin:user:view
    const admin = await createAdmin({ email: "verification.admin@test.com", adminRole: "verification_admin" });
    const res = await request(app).get("/api/admin/users").set(authHeader(admin));
    expect(res.status).toBe(403);
  });

  test("admin route succeeds for an admin with the required permission", async () => {
    const admin = await createAdmin({ email: "super.admin.users@test.com", adminRole: "super_admin" });
    const res = await request(app).get("/api/admin/users").set(authHeader(admin));
    expect(res.status).toBe(200);
  });

  test("candidate search rejects an intern (company/admin only)", async () => {
    const { user: internUser } = await createInternWithProfile();
    const res = await request(app).get("/api/candidates/search").set(authHeader(internUser));
    expect(res.status).toBe(403);
  });
});

describe("IDOR protection on /api/applications/:id", () => {
  async function buildApplicationFixture() {
    const { user: internUser, profile: internProfile } = await createInternWithProfile({
      user: { email: "owner.intern@test.com" }
    });
    const { user: companyUser, profile: companyProfile } = await createCompanyWithProfile({
      user: { email: "owner.company@test.com" }
    });
    const internship = await createInternship(companyProfile);
    const application = await createApplication({ internProfile, internship, companyProfile });
    return { internUser, internProfile, companyUser, companyProfile, internship, application };
  }

  test("the owning intern can access their own application", async () => {
    const { internUser, application } = await buildApplicationFixture();
    const res = await request(app)
      .get(`/api/applications/${application._id}`)
      .set(authHeader(internUser));
    expect(res.status).toBe(200);
  });

  test("a different intern cannot access someone else's application (IDOR)", async () => {
    const { application } = await buildApplicationFixture();
    const { user: otherIntern } = await createInternWithProfile({ user: { email: "other.intern@test.com" } });

    const res = await request(app)
      .get(`/api/applications/${application._id}`)
      .set(authHeader(otherIntern));
    expect(res.status).toBe(403);
  });

  test("a different company cannot access another company's application (IDOR)", async () => {
    const { application } = await buildApplicationFixture();
    const { user: otherCompanyUser } = await createCompanyWithProfile({
      user: { email: "other.company@test.com" }
    });

    const res = await request(app)
      .get(`/api/applications/${application._id}`)
      .set(authHeader(otherCompanyUser));
    expect(res.status).toBe(403);
  });

  test("the owning company can access the application", async () => {
    const { companyUser, application } = await buildApplicationFixture();
    const res = await request(app)
      .get(`/api/applications/${application._id}`)
      .set(authHeader(companyUser));
    expect(res.status).toBe(200);
  });

  test("admin can access any application", async () => {
    const { application } = await buildApplicationFixture();
    const admin = await createAdmin({ email: "admin.appaccess@test.com" });

    const res = await request(app)
      .get(`/api/applications/${application._id}`)
      .set(authHeader(admin));
    expect(res.status).toBe(200);
  });

  test("returns 404 for a well-formed id that does not exist", async () => {
    const { internUser } = await buildApplicationFixture();
    const res = await request(app)
      .get("/api/applications/507f1f77bcf86cd799439011")
      .set(authHeader(internUser));
    expect(res.status).toBe(404);
  });

  test("returns 400 for a malformed application id", async () => {
    const { internUser } = await buildApplicationFixture();
    const res = await request(app)
      .get("/api/applications/not-a-valid-object-id")
      .set(authHeader(internUser));
    expect(res.status).toBe(400);
  });

  test("resume endpoint blocks a non-owning intern (IDOR)", async () => {
    const { application } = await buildApplicationFixture();
    const { user: otherIntern } = await createInternWithProfile({ user: { email: "resume.other.intern@test.com" } });

    const res = await request(app)
      .get(`/api/applications/${application._id}/resume`)
      .set(authHeader(otherIntern));
    expect(res.status).toBe(403);
  });
});
