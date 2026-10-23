import { describe, test, expect } from "vitest";
import { validateEmail, validatePhone, validateGST, validateUrl, validateLinkedInUrl, getPasswordStrength } from "@/lib/validation";

describe("validateEmail", () => {
  test("accepts valid emails", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });
  test("rejects malformed emails", () => {
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("missing@domain")).toBe(false);
    expect(validateEmail("@nouser.com")).toBe(false);
  });
});

describe("validatePhone", () => {
  test("accepts valid Indian 10-digit numbers starting 6-9", () => {
    expect(validatePhone("9876543210")).toBe(true);
    expect(validatePhone("6123456789")).toBe(true);
  });
  test("rejects numbers starting 0-5", () => {
    expect(validatePhone("5123456789")).toBe(false);
  });
  test("rejects wrong length", () => {
    expect(validatePhone("98765")).toBe(false);
    expect(validatePhone("98765432101")).toBe(false);
  });
});

describe("validateGST", () => {
  test("accepts a well-formed GSTIN", () => {
    expect(validateGST("27AAAAA0000A1Z5")).toBe(true);
  });
  test("is case-insensitive", () => {
    expect(validateGST("27aaaaa0000a1z5")).toBe(true);
  });
  test("rejects malformed GSTIN", () => {
    expect(validateGST("not-a-gst")).toBe(false);
  });
});

describe("validateUrl", () => {
  test("accepts a URL with protocol", () => {
    expect(validateUrl("https://example.com")).toBe(true);
  });
  test("accepts a bare domain (auto-prefixes https)", () => {
    expect(validateUrl("example.com")).toBe(true);
  });
  test("rejects a string with no dot in hostname", () => {
    expect(validateUrl("notadomain")).toBe(false);
  });
  test("rejects garbage input", () => {
    expect(validateUrl("::::")).toBe(false);
  });
});

describe("validateLinkedInUrl", () => {
  test("empty string is valid (optional field)", () => {
    expect(validateLinkedInUrl("")).toBe(true);
    expect(validateLinkedInUrl("   ")).toBe(true);
  });
  test("accepts a linkedin.com URL", () => {
    expect(validateLinkedInUrl("https://www.linkedin.com/in/janedoe")).toBe(true);
    expect(validateLinkedInUrl("linkedin.com/in/janedoe")).toBe(true);
  });
  test("rejects a non-linkedin URL", () => {
    expect(validateLinkedInUrl("https://twitter.com/janedoe")).toBe(false);
  });
});

describe("getPasswordStrength", () => {
  test("scores an all-lowercase short password as Weak", () => {
    expect(getPasswordStrength("abc").label).toBe("Weak");
  });
  test("scores a password with length+case+digit as Medium or better", () => {
    const result = getPasswordStrength("abcdefg1");
    expect(["Medium", "Strong"]).toContain(result.label);
  });
  test("scores a long password with all 4 character classes as Strong", () => {
    const result = getPasswordStrength("Abcdefg1!");
    expect(result.label).toBe("Strong");
    expect(result.score).toBe(4);
  });
  test("empty password scores 0 / Weak", () => {
    const result = getPasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("Weak");
  });
});
