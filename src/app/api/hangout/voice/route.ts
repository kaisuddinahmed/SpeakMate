import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("[SCRIBE] Missing ELEVENLABS_API_KEY");
      return NextResponse.json(
        { error: "Server misconfigured: ELEVENLABS_API_KEY missing" },
        { status: 500 }
      );
    }

    // Official ElevenLabs endpoint for Scribe v2 Realtime single-use token
    const res = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    const text = await res.text();

    if (!res.ok) {
      console.error("[SCRIBE] Token error:", res.status, text);
      return NextResponse.json(
        {
          error: "Failed to create scribe token",
          status: res.status,
          details: text,
        },
        { status: 500 }
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[SCRIBE] Could not parse JSON token response:", text);
      return NextResponse.json(
        { error: "Unexpected token response from ElevenLabs", raw: text },
        { status: 500 }
      );
    }

    if (!data.token) {
      console.error("[SCRIBE] No token field in ElevenLabs response:", data);
      return NextResponse.json(
        { error: "No token returned from ElevenLabs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("[SCRIBE] Unexpected error while creating token:", error);
    return NextResponse.json(
      { error: "Failed to create scribe token" },
      { status: 500 }
    );
  }
}
