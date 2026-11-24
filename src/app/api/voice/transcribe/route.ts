import { NextResponse, type NextRequest } from "next/server";
import { toFile } from "groq-sdk";

import { getGroqApiKey } from "@/server/env";
import { getSession } from "@/server/session";
import {
  getCachedConditionedPrompt,
  getLocalePromptKeywords,
} from "@/lib/voice/prompt-builder";

import {
  validateAudioPayloadSize,
  verifyAudioMagicBytes,
  assertValidTranscriptionSession,
  checkSessionRateLimit,
  getLazyGroqClient,
  createTranscriptionAbortSignal,
  formatUpstreamTranscriptionError,
  logTranscriptionMetric,
} from "@/server/voice-transcribe";






export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {

    const session = await getSession();
    let userId: string;
    try {
      userId = assertValidTranscriptionSession(session);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkSessionRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many transcription requests. Please wait ${rateLimit.retryAfterSeconds} seconds before speaking again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds || 5),
          },
        }
      );
    }



    const formData = await req.formData();
    const audioBlob = formData.get("file") ?? formData.get("audio");

    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required (pass in 'file' or 'audio' field)." },
        { status: 400 }
      );
    }

    const payloadValidation = validateAudioPayloadSize(audioBlob);
    if (!payloadValidation.valid) {
      return NextResponse.json(
        { error: payloadValidation.error },
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

    const groq = getLazyGroqClient(apiKey);


    const buffer = Buffer.from(await audioBlob.arrayBuffer());

    const headerCheck = verifyAudioMagicBytes(buffer);
    if (!headerCheck.valid) {
      return NextResponse.json({ error: headerCheck.error }, { status: 400 });
    }

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

    const localeKeywords = getLocalePromptKeywords(language);
    const conditionedPrompt = await getCachedConditionedPrompt(
      userId,
      localeKeywords
    );


    const transcription = await groq.audio.transcriptions.create(
      {
        file: uploadable,
        model: "whisper-large-v3-turbo",
        prompt: conditionedPrompt,
        temperature: 0.2,
        response_format: "json",
        ...(language ? { language } : {}),
      },
      { signal: createTranscriptionAbortSignal() }
    );


    logTranscriptionMetric({
      payloadBytes: buffer.length,
      durationMs: Date.now() - startTime,
      textLength: (transcription.text || "").length,
      language,
      source: "groq-whisper",
    });

    return NextResponse.json({ text: transcription.text || "" });

  } catch (err: unknown) {
    const formatted = formatUpstreamTranscriptionError(err);
    return NextResponse.json(
      { error: formatted.message },
      {
        status: formatted.status,
        headers: formatted.retryAfterSeconds
          ? { "Retry-After": String(formatted.retryAfterSeconds) }
          : undefined,
      }
    );
  }

}
