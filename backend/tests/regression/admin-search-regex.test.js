const request = require("supertest");
const app = require("../../src/app");
const { createUser, createAdmin, authHeader } = require("../helpers/factories");

// Regression: admin search endpoints used to interpolate the raw query
// string into $regex. A query containing regex metacharacters ("(", "[",
// an unclosed group...) made MongoDB reject the whole find as an invalid
// regular expression, turning a harmless search into a 500. The fix
// escapes the term (escapeRegex in admin.controller.js), so metacharacters
// now match literally and simply return an empty result set.
describe("Admin search treats user input as literal text, not regex source", () => {
  let admin;

  beforeEach(async () => {
    admin = await createAdmin({ email: `regex.admin.${Date.now()}@test.com` });
  });

  test("GET /api/admin/users?q=( returns 200 with no matches, not a 500", async () => {
    const res = await request(app).get("/api/admin/users").query({ q: "(unclosed[bracket" }).set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.users).toEqual([]);
  });

  test("a dot in a user search matches literally, not as a wildcard", async () => {
    await createUser({ email: "regex.target@test.com" });
    // Would also match "regex.target" if the dot stayed a regex wildcard.
    await createUser({ email: "regexxtarget@test.com" });

    const res = await request(app).get("/api/admin/users").query({ q: "regex.target" }).set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.users.map((u) => u.email)).toEqual(["regex.target@test.com"]);
  });

  test("GET /api/admin/companies?q=( returns 200, not a 500", async () => {
    const res = await request(app).get("/api/admin/companies").query({ q: "(" }).set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.companies).toEqual([]);
  });

  test("GET /api/admin/activity-logs?q=( returns 200, not a 500", async () => {
    const res = await request(app).get("/api/admin/activity-logs").query({ q: "(" }).set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toEqual([]);
  });

  test("GET /api/admin/reports?q=( returns 200, not a 500", async () => {
    const res = await request(app).get("/api/admin/reports").query({ q: "(" }).set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.reports).toEqual([]);
  });
});
