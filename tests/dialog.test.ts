import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Dialog component backdrop overlay standardization", () => {
  const dialogSource = fs.readFileSync(
    path.join(process.cwd(), "src", "components", "ui", "dialog.tsx"),
    "utf-8"
  );

  it("applies uniform dark dimmed backdrop tokens in both light and dark modes", () => {
    // Backdrop overlay has dark translucent scrim and subtle blur
    expect(dialogSource).toContain("bg-black/50");
    expect(dialogSource).toContain("dark:bg-black/70");
    expect(dialogSource).toContain("backdrop-blur-sm");
  });

  it("eliminates inverted milky white bg-ink overlay token from backdrop", () => {
    // In dark mode --ink is near-white cream, so bg-ink/60 inverted the scrim.
    expect(dialogSource).not.toContain("bg-ink/60");
  });

  it("supports optional backdropClassName parameter on DialogProps", () => {
    expect(dialogSource).toContain("backdropClassName?: string;");
    expect(dialogSource).toContain("backdropClassName = \"\",");
    expect(dialogSource).toContain("${backdropClassName}`.trim()");
  });

  it("preserves responsive bottom-sheet alignment for standard dialogs and center alignment for glass", () => {
    expect(dialogSource).toContain('"items-center p-3 sm:p-4"');
    expect(dialogSource).toContain('"items-end sm:items-center p-0 sm:p-4"');
  });

  it("verifies GlobalVoiceModal inherits the Dialog component", () => {
    const voiceModalSource = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "voice", "global-voice-modal.tsx"),
      "utf-8"
    );
    expect(voiceModalSource).toContain("<Dialog isOpen={isOpen} onClose={handleClose}");
  });
});
