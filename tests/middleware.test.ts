import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  SESSION_COOKIE: "ledger_session",
  verifySession: vi.fn(),
}));

import { middleware } from "@/middleware";
import { verifySession } from "@/lib/auth";

describe("middleware authentication and API error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 JSON for unauthenticated /api requests", async () => {
    vi.mocked(verifySession).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/voice/transcribe", {
      method: "POST",
    });

    const response = await middleware(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("redirects unauthenticated page requests to /login", async () => {
    vi.mocked(verifySession).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows authenticated requests to proceed", async () => {
    vi.mocked(verifySession).mockResolvedValue("user-123");

    const request = new NextRequest("http://localhost:3000/api/voice/transcribe");
    const response = await middleware(request);

    // Default next() response is 200 without redirect
    expect(response.status).toBe(200);
  });
});
