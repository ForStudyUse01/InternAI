import { describe, test, expect } from "vitest";
import { safeUrl } from "@/lib/safe-url";

describe("safeUrl", () => {
  test("allows http/https URLs", () => {
    expect(safeUrl("https://example.com")).toBe("https://example.com");
    expect(safeUrl("http://example.com")).toBe("http://example.com");
  });

  test("allows mailto/tel/blob URLs", () => {
    expect(safeUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(safeUrl("tel:+911234567890")).toBe("tel:+911234567890");
    expect(safeUrl("blob:https://example.com/uuid")).toBe("blob:https://example.com/uuid");
  });

  test("allows relative paths, anchors, and query strings", () => {
    expect(safeUrl("/dashboard/intern")).toBe("/dashboard/intern");
    expect(safeUrl("#section")).toBe("#section");
    expect(safeUrl("?q=test")).toBe("?q=test");
    expect(safeUrl("./relative")).toBe("./relative");
  });

  test("blocks javascript: URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("#");
  });

  test("blocks data: URLs", () => {
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
  });

  test("blocks vbscript: URLs", () => {
    expect(safeUrl("vbscript:msgbox(1)")).toBe("#");
  });

  test("strips control characters used to hide a dangerous scheme", () => {
    expect(safeUrl("java\tscript:alert(1)")).toBe("#");
    expect(safeUrl("java\nscript:alert(1)")).toBe("#");
  });

  test("returns the custom fallback when provided", () => {
    expect(safeUrl("javascript:alert(1)", "/safe-fallback")).toBe("/safe-fallback");
  });

  test("returns fallback for null/undefined/empty input", () => {
    expect(safeUrl(null)).toBe("#");
    expect(safeUrl(undefined)).toBe("#");
    expect(safeUrl("")).toBe("#");
    expect(safeUrl("   ")).toBe("#");
  });

  test("blocks file: URLs", () => {
    expect(safeUrl("file:///etc/passwd")).toBe("#");
  });

  test("blocks unparseable garbage that isn't a relative path", () => {
    expect(safeUrl("not a url at all :::")).toBe("#");
  });
});
