import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

// Optional: pin a specific ElevenLabs model (good default)
const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";

export async function POST(req: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
      return NextResponse.json(
        { error: "ElevenLabs API key or voice ID is not configured." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const text = body?.text as string | undefined;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Missing or empty 'text' field." },
        { status: 400 }
      );
    }

    // Call ElevenLabs TTS API
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.85,
          },
        }),
      }
    );

    if (!elevenResponse.ok) {
      const errText = await elevenResponse.text().catch(() => "");
      console.error("ElevenLabs API error:", elevenResponse.status, errText);
      return NextResponse.json(
        {
          error: "Failed to generate speech from ElevenLabs.",
          status: elevenResponse.status,
        },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());

    // Return raw audio to the frontend
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("TTS route error:", err);
    return NextResponse.json(
      { error: "Internal server error in TTS route." },
      { status: 500 }
    );
  }
}
