import { NextRequest, NextResponse } from "next/server";

// Get signed URL for ElevenLabs Conversational AI Agent
export async function GET(req: NextRequest) {
  try {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    if (!AGENT_ID) {
      return NextResponse.json({ error: "ElevenLabs Agent ID not configured" }, { status: 500 });
    }

    // Get signed URL for the agent WebSocket connection
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ ElevenLabs Agent URL error:", response.status, error);
      return NextResponse.json({ error: "Failed to get agent URL", details: error }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      signedUrl: data.signed_url,
      agentId: AGENT_ID,
    });
  } catch (error) {
    console.error("ElevenLabs Agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
