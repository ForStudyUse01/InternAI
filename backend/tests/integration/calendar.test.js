const request = require("supertest");
const app = require("../../src/app");
const { createInternWithProfile, authHeader } = require("../helpers/factories");

describe("Calendar entries API", () => {
  test("requires authentication", async () => {
    const res = await request(app).get("/api/calendar/entries");
    expect(res.status).toBe(401);
  });

  test("creates a sticker entry", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(user))
      .send({ dateKey: "2026-01-15", entryType: "sticker", emoji: "🎉" });

    expect(res.status).toBe(201);
    expect(res.body.data.entry.emoji).toBe("🎉");
  });

  test("rejects a sticker emoji outside the allowed set", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(user))
      .send({ dateKey: "2026-01-15", entryType: "sticker", emoji: "🚀" });

    expect(res.status).toBe(400);
  });

  test("creates a note entry", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(user))
      .send({ dateKey: "2026-01-16", entryType: "note", content: "Interview prep" });

    expect(res.status).toBe(201);
    expect(res.body.data.entry.content).toBe("Interview prep");
  });

  test("rejects an empty note", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(user))
      .send({ dateKey: "2026-01-16", entryType: "note", content: "   " });

    expect(res.status).toBe(400);
  });

  test("rejects a note exceeding the max length", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(user))
      .send({ dateKey: "2026-01-16", entryType: "note", content: "a".repeat(501) });

    expect(res.status).toBe(400);
  });

  test("rejects a malformed dateKey", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(user))
      .send({ dateKey: "15-01-2026", entryType: "note", content: "Test" });

    expect(res.status).toBe(400);
  });

  test("lists only the authenticated user's own entries (no cross-user leakage)", async () => {
    const { user: userA } = await createInternWithProfile({ user: { email: "cal.a@test.com" } });
    const { user: userB } = await createInternWithProfile({ user: { email: "cal.b@test.com" } });

    await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(userA))
      .send({ dateKey: "2026-02-01", entryType: "note", content: "A's note" });
    await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(userB))
      .send({ dateKey: "2026-02-01", entryType: "note", content: "B's note" });

    const res = await request(app).get("/api/calendar/entries").set(authHeader(userA));
    expect(res.status).toBe(200);
    expect(res.body.data.entries).toHaveLength(1);
    expect(res.body.data.entries[0].content).toBe("A's note");
  });

  test("updates own entry", async () => {
    const { user } = await createInternWithProfile();
    const created = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(user))
      .send({ dateKey: "2026-01-20", entryType: "note", content: "Original" });
    const entryId = created.body.data.entry._id;

    const res = await request(app)
      .patch(`/api/calendar/entries/${entryId}`)
      .set(authHeader(user))
      .send({ content: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.entry.content).toBe("Updated");
  });

  test("cannot update another user's entry (IDOR)", async () => {
    const { user: owner } = await createInternWithProfile({ user: { email: "cal.owner@test.com" } });
    const { user: attacker } = await createInternWithProfile({ user: { email: "cal.attacker@test.com" } });

    const created = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(owner))
      .send({ dateKey: "2026-01-21", entryType: "note", content: "Owner's note" });
    const entryId = created.body.data.entry._id;

    const res = await request(app)
      .patch(`/api/calendar/entries/${entryId}`)
      .set(authHeader(attacker))
      .send({ content: "Hijacked" });

    expect(res.status).toBe(404);
  });

  test("deletes own entry", async () => {
    const { user } = await createInternWithProfile();
    const created = await request(app)
      .post("/api/calendar/entries")
      .set(authHeader(user))
      .send({ dateKey: "2026-01-22", entryType: "note", content: "To delete" });
    const entryId = created.body.data.entry._id;

    const res = await request(app).delete(`/api/calendar/entries/${entryId}`).set(authHeader(user));
    expect(res.status).toBe(200);
  });

  test("returns 404 deleting a non-existent entry", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .delete("/api/calendar/entries/507f1f77bcf86cd799439011")
      .set(authHeader(user));
    expect(res.status).toBe(404);
  });
});
