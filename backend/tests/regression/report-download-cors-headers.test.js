const request = require("supertest");
const app = require("../../src/app");
const { createAdmin, authHeader } = require("../helpers/factories");

// Regression: frontend and backend are always different origins (different
// ports even in local dev), and the browser's fetch() strips any response
// header that isn't CORS-safelisted or explicitly exposed. X-Report-Number
// (reports-portal.ts reads it to name the downloaded PDF) was being sent by
// every report-download route but never exposed, so response.headers.get(
// "X-Report-Number") was always null and every downloaded report silently
// fell back to the same generic "InternAI-Report.pdf" filename. Fixed by
// adding exposedHeaders to the cors() config in app.js.
describe("Report downloads expose X-Report-Number across origins", () => {
  test("platform-statistics response declares X-Report-Number in Access-Control-Expose-Headers", async () => {
    const admin = await createAdmin({ email: `cors.admin.${Date.now()}@test.com` });
    const res = await request(app)
      .get("/api/admin/reports/platform-statistics")
      .set(authHeader(admin))
      .set("Origin", "http://localhost:3000");

    expect(res.status).toBe(200);
    expect(res.headers["x-report-number"]).toBeTruthy();
    expect(res.headers["access-control-expose-headers"]).toContain("X-Report-Number");
  });
});
