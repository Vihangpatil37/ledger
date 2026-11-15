import QRCode from "qrcode";
import { paiseToDecimalString } from "@/lib/money";

/**
 * Builds a standard UPI Payment URI according to the NPCI specification.
 * Format: upi://pay?pa=<VPA>&pn=<Name>&am=<Amount>&cu=INR&tn=<Note>
 */
export function buildUpiPayUrl(params: {
  pa: string;
  pn: string;
  amountCents?: number;
  tn?: string;
  cu?: string;
}): string | null {
  const cleanPa = params.pa.trim();
  if (!/^[\w.-]+@[\w.-]+$/.test(cleanPa)) return null;

  const query = new URLSearchParams();
  query.set("pa", cleanPa);
  query.set("pn", params.pn.trim() || "Chai Ledger");
  query.set("cu", params.cu || "INR");

  if (params.amountCents !== undefined && params.amountCents > 0) {
    query.set("am", paiseToDecimalString(params.amountCents));
  }
  if (params.tn) {
    query.set("tn", params.tn.trim().slice(0, 50));
  }

  return `upi://pay?${query.toString().replace(/\+/g, "%20")}`;
}

/**
 * Generates a clean standalone SVG string representation of a QR code.
 * Runs completely in pure JS without external APIs or native canvas dependencies.
 */
export async function generateQrSvg(
  text: string,
  options?: { size?: number }
): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    width: options?.size ?? 200,
    color: {
      dark: "#1e1b18",
      light: "#ffffff",
    },
  });
}
