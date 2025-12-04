import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // disable caching for STT

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("[STT] ELEVENLABS_API_KEY is not set");
      return NextResponse.json(
        { error: "ElevenLabs API key is not configured." },
        { status: 500 }
      );
    }

    // We expect multipart/form-data with an "audio" field
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return NextResponse.json(
        {
          error:
            "Expected multipart/form-data with an 'audio' field. (Frontend will send audio here.)",
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!audio) {
      return NextResponse.json(
        { error: "No audio file provided in 'audio' field." },
        { status: 400 }
      );
    }

    console.log("[STT] Received audio file:", audio);

    // Build form-data for ElevenLabs STT
    const elevenForm = new FormData();
    // Field name "audio" is what ElevenLabs expects for /v1/speech-to-text/convert
    elevenForm.append("audio", audio as any);
    elevenForm.append("model_id", "scribe_v1");
    elevenForm.append("language_code", "eng");
    elevenForm.append("diarize", "false");
    elevenForm.append("tag_audio_events", "false");

    console.log("[STT] Sending to ElevenLabs...");

    const elevenRes = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text/convert",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: elevenForm,
      }
    );

    if (!elevenRes.ok) {
      const errorText = await elevenRes.text().catch(() => "");
      console.error(
        "[STT] ElevenLabs STT error:",
        elevenRes.status,
        errorText
      );
      return NextResponse.json(
        {
          error: "Failed to transcribe audio via ElevenLabs.",
          status: elevenRes.status,
          details: errorText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const json = (await elevenRes.json()) as any;
    console.log("[STT] ElevenLabs response:", json);

    const text: string =
      json?.transcription?.text ??
      json?.text ??
      "";

    console.log("[STT] Transcribed text:", text);

    return NextResponse.json({ text }, { status: 200 });
  } catch (err) {
    console.error("[STT] Route exception:", err);
    return NextResponse.json(
      { error: "Unexpected STT server error." },
      { status: 500 }
    );
  }
}
