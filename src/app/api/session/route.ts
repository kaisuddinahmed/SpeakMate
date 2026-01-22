import { NextResponse } from "next/server";

export async function GET() {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set");
        }

        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-12-17",
                voice: "coral",
                input_audio_transcription: {
                    model: "whisper-1",
                    language: "en"
                },

                turn_detection: {
                    type: "server_vad",
                    threshold: 0.9,
                    prefix_padding_ms: 600,
                    silence_duration_ms: 1000
                },




            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("OpenAI Session Error:", error);
            return NextResponse.json(
                { error: "Failed to create session" },
                { status: 500 }
            );
        }

        const data = await response.json();

        // Return the ephemeral token to the client
        return NextResponse.json(data);
    } catch (error) {
        console.error("Session Route Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
