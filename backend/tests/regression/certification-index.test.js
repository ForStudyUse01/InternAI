const mongoose = require("mongoose");
const { Certification } = require("../../src/modules/students/models/Certification");
const { createInternWithProfile } = require("../helpers/factories");

// Regression test for a real bug: Certification's three partial unique
// indexes (credentialUrl, credentialId, certificateFile.fileHash) used
// `$ne: ""` inside partialFilterExpression. MongoDB only supports
// $eq/$gt/$gte/$lt/$lte/$type/$exists there — $ne is rejected, so these
// indexes silently failed to build in the background (autoIndex errors
// don't crash the app), meaning duplicate-credential protection was never
// actually enforced. Fixed by swapping to the equivalent `$gt: ""`.
describe("Certification model — partial unique indexes", () => {
  test("indexes build successfully (no invalid partialFilterExpression)", async () => {
    await Certification.init();
    const indexNames = (await Certification.collection.indexes()).map((i) => i.name);
    expect(indexNames).toEqual(
      expect.arrayContaining(["user_1_credentialUrl_1", "user_1_credentialId_1", "user_1_certificateFile.fileHash_1"])
    );
  });

  test("rejects a duplicate credentialUrl for the same user", async () => {
    const { profile } = await createInternWithProfile();
    const base = {
      user: profile.user,
      internProfile: profile._id,
      courseName: "Course",
      skillCategory: "Backend",
      provider: "Provider",
      completionDate: new Date(),
      credentialUrl: "https://credentials.example.com/abc"
    };
    await Certification.create(base);
    await expect(Certification.create(base)).rejects.toThrow(/duplicate key|E11000/);
  });

  test("allows two certifications with empty credentialUrl for the same user (partial index excludes them)", async () => {
    const { profile } = await createInternWithProfile();
    const base = {
      user: profile.user,
      internProfile: profile._id,
      courseName: "Course",
      skillCategory: "Backend",
      provider: "Provider",
      completionDate: new Date()
    };
    await expect(Certification.create(base)).resolves.toBeTruthy();
    await expect(Certification.create(base)).resolves.toBeTruthy();
  });
});
