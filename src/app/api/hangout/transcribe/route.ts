import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import { createReadStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Write to a temporary file
        const tempFilePath = join(tmpdir(), `upload-${Date.now()}.webm`);
        await writeFile(tempFilePath, buffer);

        const transcription = await openai.audio.transcriptions.create({
            file: createReadStream(tempFilePath),
            model: "whisper-1",
            // V3: Prompt to encourage verbatim transcription (preserve mistakes) and avoid hallucinations
            prompt: "I go to store yesterday. He dont like it. Ummm... okay. Raw transcript with mistakes.",
            temperature: 0,
        });

        const validText = sanitizeTranscript(transcription.text);

        if (!validText) {
            console.log("Filtered out hallucination:", transcription.text);
            return NextResponse.json({ text: "" });
        }

        // Cleanup temp file
        await unlink(tempFilePath).catch((err) => console.error("Failed to delete temp file:", err));

        return NextResponse.json({ text: validText });
    } catch (error: any) {
        console.error("Whisper API error:", error);
        return NextResponse.json({ error: error.message || "Transcription failed" }, { status: 500 });
    }
}

// Helper: Filter known Whisper hallucinations (V3 Architecture)
function sanitizeTranscript(text: string): string {
    const t = text.trim();
    if (t.length < 2) return ""; // Ignore single chars

    // Filter truly empty transcripts (but allow short greetings like "Hello")
    // Only block if there are ZERO meaningful words
    const words = t.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) {
        console.log("[STT] Discarding: no meaningful words:", t);
        return "";
    }

    // Exact matches only (garbage single words from silence/noise)
    const exactHallucinations = new Set([
        "peace", "silence", "bye", "mbc", "shh", "hmm", "mm", "uh", "um", "ah",
        "thank you", "thank you.", "thanks", "thanks."
    ]);
    const cleaned = t.toLowerCase().replace(/[.,!?]/g, "").trim();
    if (exactHallucinations.has(cleaned)) {
        return "";
    }

    // Phrase patterns (clear junk)
    const phraseHallucinations = [
        "subs by",
        "thanks for watching",
        "thank you for watching",
        "captioned by",
        "transcribed by",
        "amara.org",
        "mbc news",
        "you're welcome"
    ];

    const lower = t.toLowerCase();
    for (const phrase of phraseHallucinations) {
        if (lower.includes(phrase)) return "";
    }

    // Filter out non-English characters (Korean, Chinese, etc.)
    if (/[^\u0000-\u00FF]/.test(t)) {
        console.log("Filtered out non-English text:", t);
        return "";
    }

    return t;
}
