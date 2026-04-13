/**
 * Full-stack API E2E against an in-memory MongoDB (no Docker).
 * Run: E2E_REVEAL_OTP=true npx tsx scripts/e2e-local.ts
 */
import { createServer, type Server } from "node:http";
import fs from "node:fs";
import path from "node:path";

process.env.E2E_REVEAL_OTP = "true";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "e2e-jwt-secret-must-be-at-least-32-chars";
process.env.OTP_PROVIDER = "mock";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.RESUME_UPLOAD_DIR = path.join(process.cwd(), "uploads", "resumes-e2e");

const MINIMAL_PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj<<>>endobj",
    "2 0 obj<</Length 16>>stream",
    "BT /F1 12 Tf ET",
    "endstream",
    "endobj",
    "3 0 obj<</Type/Catalog/Pages 4 0 R>>endobj",
    "4 0 obj<</Type/Pages/Kids[5 0 R]/Count 1>>endobj",
    "5 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 4 0 R>>endobj",
    "xref",
    "0 6",
    "trailer<</Size 6/Root 3 0 R>>",
    "startxref",
    "120",
    "%%EOF",
  ].join("\n")
);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

async function main(): Promise<void> {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();

  const { calculateRecommendationForInternship } = await import("../src/services/recommendations/recommendations.service");
  const r1 = calculateRecommendationForInternship(["python"], ["python", "java"], []);
  assert(r1.requiredMatch === 50 && r1.overallScore === 50, `rec case1: got ${JSON.stringify(r1)}`);
  const r2 = calculateRecommendationForInternship(["python", "java"], ["python"], ["docker"]);
  assert(r2.requiredMatch === 100 && r2.preferredMatch === 0 && r2.overallScore === 80, `rec case2: got ${JSON.stringify(r2)}`);
  const r3 = calculateRecommendationForInternship(["JS"], ["javascript"], []);
  assert(r3.requiredMatch === 100, `rec case3 alias: got ${JSON.stringify(r3)}`);

  const { connectDatabase } = await import("../src/config/db");
  const { app } = await import("../src/app");
  await connectDatabase();

  const server = await new Promise<Server>((resolve) => {
    const s = createServer(app);
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
  const addr = server.address();
  assert(addr && typeof addr === "object", "server address");
  const port = addr.port;
  const base = `http://127.0.0.1:${port}/api/v1`;

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const internEmail = `intern-${suffix}@e2e.test`;
  const internUnverifiedEmail = `intern2-${suffix}@e2e.test`;
  const companyEmail = `company-${suffix}@e2e.test`;
  const password = "E2E_Strong_Pass_1";
  let mobileSeq = 0;
  const uniqueMobile = () => `+1555${String(Date.now()).slice(-7)}${(mobileSeq++).toString().padStart(2, "0")}`;

  async function jsonFetch(
    method: string,
    pathname: string,
    init?: { body?: unknown; token?: string; multipart?: FormData }
  ): Promise<{ status: number; json: unknown }> {
    const headers: Record<string, string> = {};
    if (init?.token) {
      headers.Authorization = `Bearer ${init.token}`;
    }
    let body: BodyInit | undefined;
    if (init?.multipart) {
      body = init.multipart;
    } else if (init?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(init.body);
    }
    const res = await fetch(`${base}${pathname}`, { method, headers, body });
    const json = (await res.json()) as unknown;
    return { status: res.status, json };
  }

  const { e2ePeekOtp } = await import("../src/services/otp/e2e-otp-ledger");

  const companySignup = await jsonFetch("POST", "/auth/signup/company", {
    body: {
      companyName: "E2E Co",
      officialEmail: companyEmail,
      mobileNumber: uniqueMobile(),
      password,
      confirmPassword: password,
    },
  });
  assert(companySignup.status === 201, "company signup");

  const companyOtp = e2ePeekOtp(companyEmail);
  await jsonFetch("POST", "/verification/verify-otp", {
    body: { identifier: companyEmail, otp: companyOtp },
  });

  const companyLogin = await jsonFetch("POST", "/auth/login", {
    body: { email: companyEmail, password },
  });
  const companyToken = (companyLogin.json as { data?: { token?: string } }).data?.token;
  assert(companyToken, "company token");

  const internshipBody = {
    title: "E2E Internship",
    description: "Test role",
    location: "Remote",
    duration: "3mo",
    stipend: "1000",
    requiredSkills: ["alpha", "beta"],
    preferredSkills: ["gamma"],
    status: "open",
  };

  const createJob = await jsonFetch("POST", "/internships/", { token: companyToken, body: internshipBody });
  assert(createJob.status === 201, `create internship ${createJob.status}`);
  const internshipId = (createJob.json as { data?: { _id?: string } }).data?._id;
  assert(internshipId, "internship id");

  const signupUnverified = await jsonFetch("POST", "/auth/signup/intern", {
    body: {
      fullName: "E2E Unverified",
      email: internUnverifiedEmail,
      mobileNumber: uniqueMobile(),
      password,
      confirmPassword: password,
    },
  });
  assert(signupUnverified.status === 201, "intern2 signup");
  const blockedLogin = await jsonFetch("POST", "/auth/login", {
    body: { email: internUnverifiedEmail, password },
  });
  assert(blockedLogin.status === 403, "unverified login blocked");

  const signupIntern = await jsonFetch("POST", "/auth/signup/intern", {
    body: {
      fullName: "E2E Intern",
      email: internEmail,
      mobileNumber: uniqueMobile(),
      password,
      confirmPassword: password,
    },
  });
  assert(signupIntern.status === 201, `intern signup ${signupIntern.status}`);

  const badOtp = await jsonFetch("POST", "/verification/verify-otp", {
    body: { identifier: internEmail, otp: "000000" },
  });
  assert(badOtp.status === 400, "invalid OTP should be rejected");

  const otp = e2ePeekOtp(internEmail);
  const verify = await jsonFetch("POST", "/verification/verify-otp", {
    body: { identifier: internEmail, otp },
  });
  assert(verify.status === 200, `verify otp ${verify.status}`);

  const unknownLogin = await jsonFetch("POST", "/auth/login", {
    body: { email: `other-${suffix}@e2e.test`, password },
  });
  assert(unknownLogin.status === 401, "unknown user login");

  const internLoginOk = await jsonFetch("POST", "/auth/login", {
    body: { email: internEmail, password },
  });
  assert(internLoginOk.status === 200, "intern login after verify");

  const internToken = (internLoginOk.json as { data?: { token?: string } }).data?.token;
  assert(internToken, "intern token");

  const uploadDir = process.env.RESUME_UPLOAD_DIR ?? "";
  fs.mkdirSync(uploadDir, { recursive: true });

  const fd = new FormData();
  fd.append("resume", new Blob([MINIMAL_PDF], { type: "application/pdf" }), "resume.pdf");
  fd.append("manualSkills", "alpha");

  const upload = await jsonFetch("POST", "/resume/upload", { token: internToken, multipart: fd });
  assert(upload.status === 201, `resume upload ${upload.status} ${JSON.stringify(upload.json)}`);

  const parsed = await jsonFetch("GET", "/resume/parsed", { token: internToken });
  assert(parsed.status === 200, "parsed resume");
  const parsedData = (parsed.json as { data?: { skills?: string[]; resumeScore?: number } }).data;
  assert(parsedData?.skills?.includes("alpha"), "parsed skills include manual");

  const firstScore = parsedData?.resumeScore ?? 0;

  const patchSkills = await jsonFetch("PATCH", "/resume/manual-skills", {
    token: internToken,
    body: { skills: ["alpha", "beta", "gamma", "delta", "epsilon"] },
  });
  assert(patchSkills.status === 200, "manual skills patch");
  const newScore = (patchSkills.json as { data?: { score?: { score?: number } } }).data?.score?.score ?? 0;
  assert(newScore > firstScore, `score should increase: ${firstScore} -> ${newScore}`);

  const rec = await jsonFetch("GET", "/recommendations/", { token: internToken });
  assert(rec.status === 200, "recommendations");
  const recItems = (rec.json as { data?: { items?: { overallScore: number; internship: { id: string } }[] } }).data?.items ?? [];
  const match = recItems.find((i) => i.internship.id === internshipId);
  assert(match && match.overallScore === 100, `expected overall 100, got ${JSON.stringify(match)}`);

  const apply1 = await jsonFetch("POST", "/applications/", {
    token: internToken,
    body: { internshipId },
  });
  assert(apply1.status === 201, `apply ${apply1.status}`);
  const applicationId = (apply1.json as { data?: { _id?: string } }).data?._id;
  assert(applicationId, "application id");

  const dup = await jsonFetch("POST", "/applications/", {
    token: internToken,
    body: { internshipId },
  });
  assert(dup.status === 409, "duplicate apply blocked");

  const badTransition = await jsonFetch("PATCH", `/applications/${applicationId}/status`, {
    token: companyToken,
    body: { status: "interview" },
  });
  assert(badTransition.status === 400, "invalid transition rejected");

  const okTransition = await jsonFetch("PATCH", `/applications/${applicationId}/status`, {
    token: companyToken,
    body: { status: "shortlisted" },
  });
  assert(okTransition.status === 200, "shortlist ok");

  const feedback = await jsonFetch("POST", "/feedback/", {
    token: companyToken,
    body: {
      applicationId,
      strengths: "Solid skills",
      weaknesses: "None",
      rating: 4,
      notes: "Good fit",
    },
  });
  assert(feedback.status === 201, `feedback ${feedback.status}`);

  const health = await jsonFetch("GET", "/health");
  assert(health.status === 200, "health");

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
  await mongo.stop();

  // eslint-disable-next-line no-console
  console.log("E2E local: all checks passed.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
