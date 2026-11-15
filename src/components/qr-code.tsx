"use client";

import { useEffect, useState } from "react";
import { generateQrSvg } from "@/lib/upi";

export function UpiQrCode({
  upiUrl,
  size = 180,
}: {
  upiUrl: string;
  size?: number;
}) {
  const [svgHtml, setSvgHtml] = useState<string>("");

  useEffect(() => {
    let active = true;
    generateQrSvg(upiUrl, { size })
      .then((svg) => {
        if (active) setSvgHtml(svg);
      })
      .catch(() => {
        if (active) setSvgHtml("");
      });
    return () => {
      active = false;
    };
  }, [upiUrl, size]);

  if (!svgHtml) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-xl border border-rule bg-paper animate-pulse text-xs text-muted"
      >
        Generating QR…
      </div>
    );
  }

  return (
    <div
      className="inline-block rounded-xl border border-rule bg-white p-2.5 shadow-2xs [&>svg]:block [&>svg]:size-full"
      style={{ width: size + 20, height: size + 20 }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
