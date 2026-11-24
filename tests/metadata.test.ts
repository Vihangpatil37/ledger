import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import manifest from "@/app/manifest";
import { config as middlewareConfig } from "@/middleware";

describe("metadata & public files", () => {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, "public");
  const appDir = path.join(rootDir, "src", "app");

  it("does not have conflicting public and app page files for /favicon.ico and /icon.svg", () => {
    // Next.js App Router serves favicon and icon from src/app/
    expect(fs.existsSync(path.join(appDir, "favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "icon.svg"))).toBe(true);

    // public/ must not contain conflicting files that produce Next.js 500 errors
    expect(fs.existsSync(path.join(publicDir, "favicon.ico"))).toBe(false);
    expect(fs.existsSync(path.join(publicDir, "icon.svg"))).toBe(false);
    expect(fs.existsSync(path.join(publicDir, "manifest.json"))).toBe(false);
  });

  it("manifest() returns valid PWA configuration and references existing icon assets", () => {
    const data = manifest();
    expect(data.name).toBe("Ledger");
    expect(data.short_name).toBe("Ledger");
    expect(data.start_url).toBe("/");
    expect(data.display).toBe("standalone");
    expect(Array.isArray(data.icons)).toBe(true);
    expect(data.icons!.length).toBeGreaterThan(0);

    for (const icon of data.icons!) {
      const iconPath = icon.src.replace(/^\//, "");
      const inPublic = fs.existsSync(path.join(publicDir, iconPath));
      const inApp = fs.existsSync(path.join(appDir, iconPath));
      expect(inPublic || inApp).toBe(true);
    }
  });

  it("middleware matcher bypasses static assets, icons, and webmanifest", () => {
    const patternStr = middlewareConfig.matcher[0];
    const regex = new RegExp(`^${patternStr}$`);

    // Routes that should NOT be matched by middleware (i.e. regex does not match because of negative lookahead)
    const shouldBypass = [
      "/favicon.ico",
      "/icon.svg",
      "/apple-icon.png",
      "/apple-touch-icon.png",
      "/icon-192.png",
      "/icon-512.png",
      "/manifest.webmanifest",
      "/manifest.json",
      "/_next/static/chunks/main.js",
      "/_next/image",
    ];

    for (const route of shouldBypass) {
      expect(regex.test(route)).toBe(false);
    }

    // Protected application routes that MUST be matched by middleware
    const shouldMatch = [
      "/",
      "/login",
      "/people/new",
      "/people/123",
      "/people/123/edit",
      "/trash",
      "/settings",
    ];

    for (const route of shouldMatch) {
      expect(regex.test(route)).toBe(true);
    }
  });
});
