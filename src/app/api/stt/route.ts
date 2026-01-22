import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file provided in 'audio' field." },
        { status: 400 }
      );
    }

    // Convert Blob to File (OpenAI SDK expects a File-like object)
    const file = new File([audio], "audio.webm", { type: "audio/webm" });

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en", // Force English for efficiency
    });

    const text = response.text;
    console.log("[STT] Transcribed:", text);

    return NextResponse.json({ text }, { status: 200 });

  } catch (err: any) {
    console.error("[STT] Route error:", err);
    return NextResponse.json(
      { error: "STT processing failed.", details: err.message },
      { status: 500 }
    );
  }
}
