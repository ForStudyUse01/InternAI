const { collectSourceData } = require("../../src/modules/portfolio/services/portfolio.service");

// Regression test for a real bug: the portfolio's certifications section used
// to blend admin-verified certs with resume-parsed/manual/legacy ones, so a
// public portfolio could show an unverified, self-reported claim next to (or
// instead of) a real, admin-approved credential. Portfolio content must
// surface ONLY verifiedCertificationEntries -- the mirror certification
// review keeps in sync when an admin approves a certification.
describe("portfolio collectSourceData - certifications", () => {
  test("includes only admin-verified certifications, dropping resume-parsed/manual/legacy ones", () => {
    const profile = {
      fullName: "Test Intern",
      email: "intern@example.com",
      profileSections: { certifications: [{ name: "Self-Reported Cert", issuer: "Nobody", year: "2022" }] },
      certificationEntries: [{ name: "Resume Parsed Cert", issuer: "SomeSite", year: "2021" }],
      certifications: ["Legacy Cert String"],
      verifiedCertificationEntries: [
        { name: "AWS Certified Developer", issuer: "Amazon", year: "2024", verificationStatus: "verified" }
      ],
      resume: { parsed: { certifications: [{ name: "Parsed From Resume", issuer: "X", year: "2020" }] } }
    };

    const source = collectSourceData(profile);

    expect(source.certifications).toEqual([
      { name: "AWS Certified Developer", issuer: "Amazon", year: "2024", verified: true }
    ]);
  });

  test("returns an empty list when no certifications have been admin-verified yet", () => {
    const profile = {
      fullName: "Test Intern",
      email: "intern@example.com",
      profileSections: { certifications: [{ name: "Self-Reported Cert", issuer: "Nobody", year: "2022" }] },
      certifications: ["Legacy Cert String"],
      verifiedCertificationEntries: []
    };

    const source = collectSourceData(profile);
    expect(source.certifications).toEqual([]);
  });

  test("dedupes verified certifications that share the same name", () => {
    const profile = {
      fullName: "Test Intern",
      email: "intern@example.com",
      verifiedCertificationEntries: [
        { name: "AWS Certified Developer", issuer: "Amazon", year: "2023" },
        { name: "AWS Certified Developer", issuer: "Amazon", year: "2024" }
      ]
    };

    const source = collectSourceData(profile);
    expect(source.certifications).toHaveLength(1);
  });
});
