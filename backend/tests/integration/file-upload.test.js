const request = require("supertest");
const app = require("../../src/app");
const { createInternWithProfile, createCompanyWithProfile, authHeader } = require("../helpers/factories");

describe("POST /api/intern/resume/upload", () => {
  test("accepts a valid plain-text resume with extractable content", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/intern/resume/upload")
      .set(authHeader(user))
      .attach("resume", Buffer.from("Jane Doe\nSoftware Engineer\nSkills: React, Node.js, MongoDB"), {
        filename: "resume.txt",
        contentType: "text/plain"
      });

    expect(res.status).toBe(200);
  });

  test("rejects an unsupported file type (.exe)", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/intern/resume/upload")
      .set(authHeader(user))
      .attach("resume", Buffer.from("MZ fake exe content"), {
        filename: "resume.exe",
        contentType: "application/x-msdownload"
      });

    expect(res.status).toBe(400);
  });

  test("rejects a mismatched extension/mimetype pair (.pdf extension, image mimetype)", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/intern/resume/upload")
      .set(authHeader(user))
      .attach("resume", Buffer.from("not really a pdf"), {
        filename: "resume.pdf",
        contentType: "image/png"
      });

    expect(res.status).toBe(400);
  });

  test("rejects a file exceeding the 5MB size limit", async () => {
    const { user } = await createInternWithProfile();
    const oversized = Buffer.alloc(6 * 1024 * 1024, "a");
    const res = await request(app)
      .post("/api/intern/resume/upload")
      .set(authHeader(user))
      .attach("resume", oversized, { filename: "resume.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
  });

  test("rejects an empty file with no attachment field at all", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app).post("/api/intern/resume/upload").set(authHeader(user));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("requires authentication", async () => {
    const res = await request(app)
      .post("/api/intern/resume/upload")
      .attach("resume", Buffer.from("%PDF-1.4"), { filename: "resume.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/intern/certifications", () => {
  const validFields = {
    courseName: "Advanced Node.js",
    skillCategory: "Backend",
    provider: "Test Academy",
    completionDate: "2023-01-15"
  };

  test("rejects submission with no certificate document attached", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/intern/certifications")
      .set(authHeader(user))
      .field(validFields);

    expect(res.status).toBe(400);
  });

  test("accepts a valid PDF certificate", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/intern/certifications")
      .set(authHeader(user))
      .field(validFields)
      .attach("certificateFile", Buffer.from("%PDF-1.4 fake pdf content"), {
        filename: "cert.pdf",
        contentType: "application/pdf"
      });

    expect(res.status).toBe(201);
  });

  test("accepts a valid DOCX certificate", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/intern/certifications")
      .set(authHeader(user))
      .field(validFields)
      .attach("certificateFile", Buffer.from("fake docx content"), {
        filename: "cert.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });

    expect(res.status).toBe(201);
  });

  test("accepts a valid WEBP certificate", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/intern/certifications")
      .set(authHeader(user))
      .field(validFields)
      .attach("certificateFile", Buffer.from("fake webp bytes"), {
        filename: "cert.webp",
        contentType: "image/webp"
      });

    expect(res.status).toBe(201);
  });

  test("rejects an unsupported file type (.exe)", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/intern/certifications")
      .set(authHeader(user))
      .field(validFields)
      .attach("certificateFile", Buffer.from("MZ fake exe content"), {
        filename: "cert.exe",
        contentType: "application/x-msdownload"
      });

    expect(res.status).toBe(400);
  });

  test("rejects a certificate file exceeding the 10MB size limit", async () => {
    const { user } = await createInternWithProfile();
    const oversized = Buffer.alloc(11 * 1024 * 1024, "a");
    const res = await request(app)
      .post("/api/intern/certifications")
      .set(authHeader(user))
      .field(validFields)
      .attach("certificateFile", oversized, { filename: "cert.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
  });

  test("requires authentication", async () => {
    const res = await request(app)
      .post("/api/intern/certifications")
      .field(validFields)
      .attach("certificateFile", Buffer.from("%PDF-1.4"), { filename: "cert.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/company/profile/logo", () => {
  test("rejects an SVG upload (stored-XSS-via-upload vector)", async () => {
    const { user } = await createCompanyWithProfile();
    const res = await request(app)
      .post("/api/company/profile/logo")
      .set(authHeader(user))
      .attach("logo", Buffer.from("<svg onload=\"alert(1)\"></svg>"), {
        filename: "logo.svg",
        contentType: "image/svg+xml"
      });

    expect(res.status).toBe(400);
  });

  test("accepts a valid PNG logo", async () => {
    const { user } = await createCompanyWithProfile();
    const res = await request(app)
      .post("/api/company/profile/logo")
      .set(authHeader(user))
      .attach("logo", Buffer.from("fake png bytes"), { filename: "logo.png", contentType: "image/png" });

    expect(res.status).toBeLessThan(400);
  });

  test("rejects a logo exceeding the 2MB size limit", async () => {
    const { user } = await createCompanyWithProfile();
    const oversized = Buffer.alloc(3 * 1024 * 1024, "a");
    const res = await request(app)
      .post("/api/company/profile/logo")
      .set(authHeader(user))
      .attach("logo", oversized, { filename: "logo.png", contentType: "image/png" });

    expect(res.status).toBe(400);
  });

  test("an intern cannot upload a company logo (role gate)", async () => {
    const { user } = await createInternWithProfile();
    const res = await request(app)
      .post("/api/company/profile/logo")
      .set(authHeader(user))
      .attach("logo", Buffer.from("fake png bytes"), { filename: "logo.png", contentType: "image/png" });

    expect(res.status).toBe(403);
  });
});
