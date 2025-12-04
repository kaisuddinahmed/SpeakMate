import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    console.log("🔑 ElevenLabs API Key exists:", !!ELEVENLABS_API_KEY);
    console.log("🔑 ElevenLabs API Key length:", ELEVENLABS_API_KEY?.length);
    
    if (!ELEVENLABS_API_KEY) {
      console.error("❌ ElevenLabs API key not found in env");
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    // Using "Nichalia Schwartz" - custom fine-tuned voice for SpeakMate
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "XfNU2rGpBa01ckF309OY"; // Nichalia Schwartz

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ ElevenLabs API error status:", response.status);
      console.error("❌ ElevenLabs API error body:", error);
      return NextResponse.json({ error: "TTS failed", details: error }, { status: response.status });
    }

    // Return audio as binary
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
