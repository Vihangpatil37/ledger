import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/safe-next";

describe("safeNextPath", () => {
  it("allows valid relative root-relative paths", () => {
    expect(safeNextPath("/people/123")).toBe("/people/123");
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/people/new?ref=dashboard")).toBe("/people/new?ref=dashboard");
  });

  it("blocks protocol-relative open redirect URLs", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("//google.com/phish")).toBe("/");
  });

  it("blocks backslash open redirect bypass attempts", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/");
  });

  it("blocks newline injection", () => {
    expect(safeNextPath("/path\nSet-Cookie:malicious=true")).toBe("/");
  });

  it("falls back to default or specified fallback on null/undefined", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("evil.com")).toBe("/");
    expect(safeNextPath("", "/dashboard")).toBe("/dashboard");
  });
});
