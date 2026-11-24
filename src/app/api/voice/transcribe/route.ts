import { NextResponse, type NextRequest } from "next/server";
import Groq, { toFile } from "groq-sdk";
import { getGroqApiKey } from "@/server/env";
import { getSession } from "@/server/session";
import { peopleCol } from "@/lib/mongo";
import { activeFilter } from "@/lib/trash";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioBlob = formData.get("file") ?? formData.get("audio");

    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required (pass in 'file' or 'audio' field)." },
        { status: 400 }
      );
    }

    const apiKey = getGroqApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GROQ_API_KEY is not configured on the server. Please set it in .env.local for fallback voice transcription.",
        },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const buffer = Buffer.from(await audioBlob.arrayBuffer());
    const fileName =
      audioBlob instanceof File && audioBlob.name
        ? audioBlob.name
        : "audio.webm";
    const mimeType = audioBlob.type || "audio/webm";

    const uploadable = await toFile(buffer, fileName, { type: mimeType });

    const languageParam = formData.get("language");
    const language =
      typeof languageParam === "string" && languageParam.trim()
        ? languageParam.trim()
        : undefined;

    // Fetch active customer names to bias Whisper's phonetic decoder towards exact database spellings
    let customerNamesHint = "";
    try {
      const activePeople = await peopleCol()
        .find(
          { ownerId: session.userId, ...activeFilter() },
          { projection: { name: 1 } }
        )
        .sort({ updatedAt: -1, name: 1 })
        .limit(50)
        .toArray();

      const names = activePeople
        .map((p) => p.name?.trim())
        .filter((n): n is string => Boolean(n && n.length > 0));

      if (names.length > 0) {
        customerNamesHint = ` Customer names: ${names.join(", ")}.`;
      }
    } catch {
      // Non-fatal: if DB query fails, proceed with base prompt
    }

    const basePrompt =
      "Chai ledger khata: udhar, jama, rupaye, paise, chai, biskut, samosa, baaki, diya, mila, aaya, payment, account entry.";
    const conditionedPrompt = (basePrompt + customerNamesHint).slice(0, 800);

    const transcription = await groq.audio.transcriptions.create({
      file: uploadable,
      model: "whisper-large-v3-turbo",
      prompt: conditionedPrompt,
      temperature: 0.2,
      response_format: "json",
      ...(language ? { language } : {}),
    });

    return NextResponse.json({ text: transcription.text || "" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to transcribe audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
