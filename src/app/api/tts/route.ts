import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const text = body?.text as string | undefined;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Missing or empty 'text' field." },
        { status: 400 }
      );
    }

    // Call OpenAI TTS API
    // Model: tts-1 (Standard, cheaper/faster)
    // Voice: nova
    // Speed: 0.85 (Slower for natural feel)
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      speed: 0.85,
      input: text,
      response_format: "mp3",
    });

    // Get buffer directly
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Return raw audio
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });

  } catch (err: any) {
    console.error("[TTS] Route error:", err);
    return NextResponse.json(
      { error: "TTS generation failed.", details: err.message },
      { status: 500 }
    );
  }
}
