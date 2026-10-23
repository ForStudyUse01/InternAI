const User = require("../../src/modules/authentication/models/User");
const { createUser } = require("../helpers/factories");

// Regression test for a real bug found while writing integration tests:
// User.verificationTokenHash had `default: null` alongside a unique+sparse
// index. MongoDB's sparse index still indexes an explicit null (it only
// excludes documents where the field is truly absent), so the second user
// ever created — with the field left at its default — collided on the
// unique constraint with E11000, breaking signup for every user after the
// first. Fixed by removing the default so the field stays genuinely unset.
describe("User model — verificationTokenHash unique sparse index", () => {
  test("multiple users can be created without setting verificationTokenHash", async () => {
    const u1 = await createUser({ email: "user1.regression@test.com", role: "intern" });
    const u2 = await createUser({ email: "user2.regression@test.com", role: "company" });
    const u3 = await createUser({ email: "user3.regression@test.com", role: "admin" });

    expect(u1.verificationTokenHash).toBeUndefined();
    expect(u2.verificationTokenHash).toBeUndefined();
    expect(u3.verificationTokenHash).toBeUndefined();
    await expect(User.countDocuments()).resolves.toBe(3);
  });

  test("the unique constraint still rejects two users actually sharing a token hash", async () => {
    await createUser({ email: "tokenholder1@test.com", role: "intern", verificationTokenHash: "shared-hash" });
    await expect(
      createUser({ email: "tokenholder2@test.com", role: "intern", verificationTokenHash: "shared-hash" })
    ).rejects.toThrow(/duplicate key|E11000/);
  });
});
