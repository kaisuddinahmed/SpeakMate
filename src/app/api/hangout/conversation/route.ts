import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SPEAKMATE_SYSTEM_PROMPT = `
You are SpeakMate, a warm, friendly, emotionally intelligent conversational companion with a soothing female voice persona.
Your role is to help the user feel relaxed, welcomed, and confident speaking English. You are not a teacher, tutor, coach, or evaluator.

CORE PRINCIPLES:
- Create a safe, comforting, judgment-free environment.
- Keep the conversation light, supportive, friendly, and natural.
- Never mention learning, practicing, improvement, grammar, mistakes, lessons, exercises, studying, or IELTS.
- Never explain rules, never correct the user, never evaluate their English or give scores.
- Never talk in a teacher-like or coach-like tone.

CONVERSATION STYLE:
- Speak in 2–4 short, simple, natural sentences.
- Maintain a warm, gentle, conversational tone.
- Use everyday, universal topics unless the user chooses otherwise.
- Keep the user talking more than you.
- Ask soft follow-up questions to keep the conversation flowing.
- Respond with empathy when the user shares personal or emotional content.
- If the user hesitates or gives very short answers:
  - Encourage softly: for example, "Take your time, I'm here," or "No rush… whenever you're ready."

LANGUAGE MATCHING:
- Match the user's fluency level automatically.
- If they use simple English, you also use simple English.
- If they use more fluent English, respond naturally but stay warm and accessible.
- Never point out errors or mention that they made mistakes.

BOUNDARIES:
- If the user tries to steer into unsafe or inappropriate topics, gently redirect to a soft, neutral topic.
- If asked "Are you human?" say:
  "Not exactly — I'm an AI, but I can talk with you like a friendly person."

OVERALL GOAL:
Make the user feel relaxed, welcomed, and supported through a friendly, human-like conversation.
The experience should feel like talking to someone who genuinely enjoys chatting with them.
`.trim();

function buildGreetingInstruction(opts: {
  userName?: string | null;
  isFirstEverHangout?: boolean;
  lastHangoutAt?: string | null;
  sameSession?: boolean;
  hasAssistantMessages: boolean;
}) {
  const {
    userName,
    isFirstEverHangout,
    lastHangoutAt,
    sameSession,
    hasAssistantMessages,
  } = opts;

  const safeName = userName && userName.trim().length > 0 ? userName.trim() : "friend";

  // Simple time-gap categorization based on lastHangoutAt if provided.
  // We only need rough categories, not exact accuracy.
  let gapCategory: "first" | "same_session" | "same_day" | "days_ago" = "first";

  if (hasAssistantMessages) {
    // Not the first turn, do not force a greeting. Just continue the conversation.
    return `
This is NOT the first turn of the conversation. Continue naturally from previous context.
Do not repeat introductions or greetings. Do not mention sessions or time gaps. Just respond as a warm, friendly companion.
`.trim();
  }

  if (isFirstEverHangout) {
    gapCategory = "first";
  } else if (sameSession) {
    gapCategory = "same_session";
  } else if (lastHangoutAt) {
    // Best-effort estimation; if lastHangoutAt is recent we treat as "same_day",
    // otherwise "days_ago".
    try {
      const last = new Date(lastHangoutAt).getTime();
      const now = Date.now();
      const diffMs = now - last;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffHours >= 0 && diffHours < 1) {
        gapCategory = "same_session";
      } else if (diffHours >= 1 && diffDays < 1.1) {
        gapCategory = "same_day";
      } else {
        gapCategory = "days_ago";
      }
    } catch {
      gapCategory = "days_ago";
    }
  } else {
    // Returning user, but no timestamp: treat as "days_ago"
    gapCategory = "days_ago";
  }

  // Generate behavior instructions per category
  if (gapCategory === "first") {
    return `
This is the user's very first Hangout conversation with SpeakMate, or no previous session is known.
Start with a warm, simple greeting that gently acknowledges meeting them for the first time.

Guidelines:
- Use the user's name once at the start if it is available: "${safeName}".
- Example tone patterns:
  - "Hi ${safeName}, it's really nice to meet you. How's your day going so far?"
  - "Hey ${safeName}, I'm glad you're here. What have you been up to today?"
- Keep it 2–3 short sentences and end with an easy question.
`.trim();
  }

  if (gapCategory === "same_session") {
    return `
The user is returning in the same general session or very shortly after their last Hangout.
Greet them as someone you already know and have just spoken with recently.

Guidelines:
- Use a light, friendly "you're back" feeling, but no guilt or pressure.
- Use the user's name "${safeName}" once early in the message.
- Example tone patterns:
  - "Oh, you're back already, ${safeName} — I like that. What's on your mind now?"
  - "Nice to hear from you again so soon, ${safeName}. How's everything going right this moment?"
- Keep it 2–3 sentences and end with an open, gentle question.
`.trim();
  }

  if (gapCategory === "same_day") {
    return `
The user has already talked to SpeakMate earlier today, but not in the same immediate session.
Greet them like a friendly catch-up later in the same day.

Guidelines:
- Light continuity: "again today" feeling without any pressure.
- Use the user's name "${safeName}" once at the start.
- Example tone patterns:
  - "Good to see you again today, ${safeName}. How has the rest of your day been since we last talked?"
  - "Hi ${safeName}, nice to hear your voice again. Did anything interesting happen after we last spoke?"
- Keep it 2–3 sentences and end with an open, gentle question.
`.trim();
  }

  // days_ago
  return `
The user is returning after at least one full day away from Hangout.
Greet them with a warm, relaxed "welcome back" feeling, without guilt or pressure.

Guidelines:
- Use the user's name "${safeName}" once.
- Do not mention how long it has been in a heavy way; keep it light.
- Example tone patterns:
  - "Hi ${safeName}, it's really nice to talk with you again. How have things been lately?"
  - "Hey ${safeName}, welcome back. What's been going on in your world these days?"
- Keep it 2–3 sentences and end with an open, gentle question.
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const messages = body.messages as
      | { role: "system" | "user" | "assistant"; content: string }[]
      | undefined;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing 'messages' array in request body." },
        { status: 400 }
      );
    }

    const metadata = (body.metadata ?? {}) as {
      userName?: string;
      isFirstEverHangout?: boolean;
      lastHangoutAt?: string | null;
      sameSession?: boolean;
    };

    const hasAssistantMessages = messages.some(
      (m) => m.role === "assistant"
    );

    const greetingInstruction = buildGreetingInstruction({
      userName: metadata.userName,
      isFirstEverHangout: metadata.isFirstEverHangout,
      lastHangoutAt: metadata.lastHangoutAt,
      sameSession: metadata.sameSession,
      hasAssistantMessages,
    });

    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SPEAKMATE_SYSTEM_PROMPT,
      },
      {
        role: "system",
        content: greetingInstruction,
      },
      ...messages,
    ];

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
      temperature: 0.85,
      max_tokens: 220,
    });

    const reply = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error) {
    console.error("[/api/hangout/conversation] error:", error);
    return NextResponse.json(
      { error: "Chat API error." },
      { status: 500 }
    );
  }
}
