import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcript, duration } = await request.json();

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    // Count user messages only (not AI responses)
    const userMessages = transcript.filter((msg: any) => msg.speaker === "user");
    
    // Require minimum 3 user messages for meaningful assessment
    if (userMessages.length < 3) {
      return NextResponse.json({
        fluency: null,
        vocabulary: null,
        grammar: null,
        pronunciation: null,
        overall: null,
        feedback: "Keep practicing! We need at least 3 exchanges to provide an accurate IELTS assessment. Your conversation is off to a good start!",
        insufficientData: true,
      });
    }

    // Analyze the conversation
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an IELTS speaking evaluator. Analyze this conversation and provide scores.

IMPORTANT: IELTS scores ONLY use 0.5 increments: 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0
NEVER use scores like 6.4, 7.3, 8.2 - these don't exist in IELTS!

Evaluate on IELTS band scale:
- Fluency: Flow, hesitation, self-correction, speech rate
- Vocabulary: Range, accuracy, appropriateness
- Grammar: Accuracy, range of structures, complexity
- Pronunciation: Clarity, word stress, intonation

Overall score = average of the four areas, rounded to nearest 0.5

Provide 25-50 word constructive, encouraging feedback focusing on 1-2 specific areas for improvement.

Response format (JSON):
{
  "fluency": 7.5,
  "vocabulary": 8.0,
  "grammar": 7.0,
  "pronunciation": 7.5,
  "overall": 7.5,
  "feedback": "Your feedback here (25-50 words)"
}`,
        },
        {
          role: "user",
          content: `Conversation duration: ${duration}\n\nTranscript:\n${transcript
            .map((msg: any) => `${msg.speaker === "user" ? "User" : "AI"}: ${msg.text}`)
            .join("\n")}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    // Round all scores to nearest 0.5 (IELTS standard)
    const roundToHalf = (num: number) => Math.round(num * 2) / 2;

    const fluency = roundToHalf(result.fluency || 7.0);
    const vocabulary = roundToHalf(result.vocabulary || 7.0);
    const grammar = roundToHalf(result.grammar || 7.0);
    const pronunciation = roundToHalf(result.pronunciation || 7.0);
    const overall = roundToHalf((fluency + vocabulary + grammar + pronunciation) / 4);

    return NextResponse.json({
      fluency,
      vocabulary,
      grammar,
      pronunciation,
      overall,
      feedback: result.feedback || "Great conversation! Keep practicing regularly to build confidence.",
    });
  } catch (error: any) {
    console.error("Session Summary API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary", details: error.message },
      { status: 500 }
    );
  }
}
