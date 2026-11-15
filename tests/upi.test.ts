import { describe, it, expect } from "vitest";
import { buildUpiPayUrl, generateQrSvg } from "@/lib/upi";

describe("buildUpiPayUrl", () => {
  it("builds standard UPI pay URL with valid VPA and name", () => {
    const url = buildUpiPayUrl({
      pa: "merchant@okhdfcbank",
      pn: "Chai Shop",
      amountCents: 25000,
      tn: "Khata settlement",
    });
    expect(url).toBe(
      "upi://pay?pa=merchant%40okhdfcbank&pn=Chai%20Shop&cu=INR&am=250.00&tn=Khata%20settlement"
    );
  });

  it("omits am parameter when amountCents is 0 or undefined", () => {
    const url = buildUpiPayUrl({
      pa: "user@upi",
      pn: "User",
    });
    expect(url).toBe("upi://pay?pa=user%40upi&pn=User&cu=INR");
    expect(url).not.toContain("am=");
  });

  it("truncates transaction note to 50 characters", () => {
    const longNote = "A".repeat(100);
    const url = buildUpiPayUrl({
      pa: "user@upi",
      pn: "User",
      tn: longNote,
    });
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("tn")?.length).toBe(50);
  });

  it("returns null for invalid VPA/UPI ID", () => {
    expect(buildUpiPayUrl({ pa: "invalid-upi", pn: "Test" })).toBeNull();
    expect(buildUpiPayUrl({ pa: "test@", pn: "Test" })).toBeNull();
    expect(buildUpiPayUrl({ pa: "", pn: "Test" })).toBeNull();
  });
});

describe("generateQrSvg", () => {
  it("generates a valid SVG element string", async () => {
    const svg = await generateQrSvg("upi://pay?pa=test@upi&pn=Test&cu=INR");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>\n") || svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain("viewBox");
  });
});
