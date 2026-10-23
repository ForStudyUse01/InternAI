const request = require("supertest");
const app = require("../../src/app");
const {
  createInternWithProfile,
  createCompanyWithProfile,
  createInternship,
  createApplication,
  authHeader
} = require("../helpers/factories");

async function buildFixture() {
  const { profile: internProfile } = await createInternWithProfile({ user: { email: "pipeline.intern@test.com" } });
  const { user: companyUser, profile: companyProfile } = await createCompanyWithProfile({
    user: { email: "pipeline.company@test.com" }
  });
  const internship = await createInternship(companyProfile);
  const application = await createApplication({ internProfile, internship, companyProfile });
  return { companyUser, application };
}

describe("PATCH /api/company/applications/:applicationId/stage", () => {
  test("allows a valid forward transition (applied -> shortlisted)", async () => {
    const { companyUser, application } = await buildFixture();
    const res = await request(app)
      .patch(`/api/company/applications/${application._id}/stage`)
      .set(authHeader(companyUser))
      .send({ status: "shortlisted" });

    expect(res.status).toBe(200);
    expect(res.body.data.application.status).toBe("shortlisted");
  });

  test("rejects an invalid/skipped transition (applied -> selected)", async () => {
    const { companyUser, application } = await buildFixture();
    const res = await request(app)
      .patch(`/api/company/applications/${application._id}/stage`)
      .set(authHeader(companyUser))
      .send({ status: "selected" });

    expect(res.status).toBe(400);
  });

  test("rejects an unknown status value", async () => {
    const { companyUser, application } = await buildFixture();
    const res = await request(app)
      .patch(`/api/company/applications/${application._id}/stage`)
      .set(authHeader(companyUser))
      .send({ status: "not_a_real_status" });

    expect(res.status).toBe(400);
  });

  test("rejects a missing status field", async () => {
    const { companyUser, application } = await buildFixture();
    const res = await request(app)
      .patch(`/api/company/applications/${application._id}/stage`)
      .set(authHeader(companyUser))
      .send({});

    expect(res.status).toBe(400);
  });

  test("a different company cannot update another company's application (IDOR)", async () => {
    const { application } = await buildFixture();
    const { user: otherCompany } = await createCompanyWithProfile({ user: { email: "other.pipeline.company@test.com" } });

    const res = await request(app)
      .patch(`/api/company/applications/${application._id}/stage`)
      .set(authHeader(otherCompany))
      .send({ status: "shortlisted" });

    expect(res.status).toBe(404);
  });

  test("an intern cannot update application stage (role gate)", async () => {
    const { application } = await buildFixture();
    const { user: internUser } = await createInternWithProfile({ user: { email: "pipeline.other.intern@test.com" } });

    const res = await request(app)
      .patch(`/api/company/applications/${application._id}/stage`)
      .set(authHeader(internUser))
      .send({ status: "shortlisted" });

    expect(res.status).toBe(403);
  });

  test("terminal statuses reject any further transition", async () => {
    const { companyUser, application } = await buildFixture();
    await request(app)
      .patch(`/api/company/applications/${application._id}/stage`)
      .set(authHeader(companyUser))
      .send({ status: "rejected" });

    const res = await request(app)
      .patch(`/api/company/applications/${application._id}/stage`)
      .set(authHeader(companyUser))
      .send({ status: "shortlisted" });

    expect(res.status).toBe(400);
  });
});
