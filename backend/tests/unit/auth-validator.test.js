const {
  requireEmail,
  requireInternSignup,
  requireCompanySignup,
  requireOtpVerify,
  requirePasswordReset
} = require("../../src/modules/authentication/validators/auth.validator");

function reqWithBody(body) {
  return { body };
}

describe("requireEmail", () => {
  test("valid email passes", () => {
    expect(requireEmail(reqWithBody({ email: "user@example.com" })).valid).toBe(true);
  });

  test("missing email fails with message", () => {
    const result = requireEmail(reqWithBody({}));
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/valid email/i);
  });

  test("malformed email fails", () => {
    expect(requireEmail(reqWithBody({ email: "not-an-email" })).valid).toBe(false);
  });
});

describe("requireInternSignup", () => {
  const validBody = {
    fullName: "Jane Doe",
    email: "jane@example.com",
    mobile: "9876543210",
    password: "Password123!"
  };

  test("accepts a fully valid signup payload", () => {
    expect(requireInternSignup(reqWithBody(validBody)).valid).toBe(true);
  });

  test("rejects when a required field is missing", () => {
    const { fullName, ...rest } = validBody;
    expect(requireInternSignup(reqWithBody(rest)).valid).toBe(false);
  });

  test("rejects mobile numbers not matching Indian 10-digit format", () => {
    expect(requireInternSignup(reqWithBody({ ...validBody, mobile: "12345" })).valid).toBe(false);
    expect(requireInternSignup(reqWithBody({ ...validBody, mobile: "1234567890" })).valid).toBe(false);
  });

  test("rejects passwords shorter than 8 characters", () => {
    expect(requireInternSignup(reqWithBody({ ...validBody, password: "short" })).valid).toBe(false);
  });

  test("rejects passwords longer than 128 characters", () => {
    expect(requireInternSignup(reqWithBody({ ...validBody, password: "a".repeat(129) })).valid).toBe(false);
  });

  test("rejects fullName longer than 120 characters", () => {
    expect(requireInternSignup(reqWithBody({ ...validBody, fullName: "a".repeat(121) })).valid).toBe(false);
  });

  test("boundary: exactly 8-character password is accepted", () => {
    expect(requireInternSignup(reqWithBody({ ...validBody, password: "abcdefgh" })).valid).toBe(true);
  });
});

describe("requireCompanySignup", () => {
  const validBody = {
    companyName: "Acme Inc",
    gst: "27AAAAA0000A1Z5",
    contactName: "John Contact",
    phone: "9876543210",
    address: "123 Street",
    description: "We build things.",
    password: "Password123!"
  };

  test("accepts a fully valid company signup payload", () => {
    expect(requireCompanySignup(reqWithBody(validBody)).valid).toBe(true);
  });

  test("rejects an invalid GSTIN format", () => {
    expect(requireCompanySignup(reqWithBody({ ...validBody, gst: "invalid-gst" })).valid).toBe(false);
  });

  test("is case-insensitive on GSTIN (lowercased input still validates)", () => {
    expect(requireCompanySignup(reqWithBody({ ...validBody, gst: "27aaaaa0000a1z5" })).valid).toBe(true);
  });

  test("rejects when any required field is missing", () => {
    const { description, ...rest } = validBody;
    expect(requireCompanySignup(reqWithBody(rest)).valid).toBe(false);
  });

  test("rejects description longer than 2000 characters", () => {
    expect(
      requireCompanySignup(reqWithBody({ ...validBody, description: "a".repeat(2001) })).valid
    ).toBe(false);
  });
});

describe("requireOtpVerify", () => {
  test("accepts valid email + 6-digit OTP", () => {
    expect(requireOtpVerify(reqWithBody({ email: "a@b.com", otp: "123456" })).valid).toBe(true);
  });

  test("rejects OTP that is not exactly 6 digits", () => {
    expect(requireOtpVerify(reqWithBody({ email: "a@b.com", otp: "12345" })).valid).toBe(false);
    expect(requireOtpVerify(reqWithBody({ email: "a@b.com", otp: "1234567" })).valid).toBe(false);
    expect(requireOtpVerify(reqWithBody({ email: "a@b.com", otp: "abcdef" })).valid).toBe(false);
  });

  test("message prioritizes email error over OTP error", () => {
    const result = requireOtpVerify(reqWithBody({ email: "bad", otp: "bad" }));
    expect(result.message).toMatch(/valid email/i);
  });
});

describe("requirePasswordReset", () => {
  test("accepts valid email + OTP + strong-enough password", () => {
    expect(
      requirePasswordReset(reqWithBody({ email: "a@b.com", otp: "123456", newPassword: "newpass1" })).valid
    ).toBe(true);
  });

  test("rejects password shorter than 8 characters", () => {
    expect(
      requirePasswordReset(reqWithBody({ email: "a@b.com", otp: "123456", newPassword: "short" })).valid
    ).toBe(false);
  });
});
