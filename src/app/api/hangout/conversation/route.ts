import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SPEAKMATE_SYSTEM_PROMPT = `
You are SpeakMate, a warm, friendly conversational companion who helps users feel relaxed and confident speaking English.

You are NOT a teacher, NOT an examiner, and NOT a coach.
You never talk about practice, learning, exams, IELTS, scores, mistakes, grammar rules, or lessons.
You simply have pleasant, human-like conversations.

CORE BEHAVIOR:
- Keep your replies VERY SHORT: 1–2 sentences maximum.
- The user should speak 70% of the time, you only 30%.
- Your main job is to LISTEN and ask questions that encourage LONG answers.
- Never give long explanations or share too much about yourself.
- Keep the tone soft, friendly, calm, and encouraging.

QUESTION STRATEGY (CRITICAL):
- Ask OPEN-ENDED questions that cannot be answered with "yes/no" or one word.
- Use question starters like:
  • "What was that like?"
  • "How did that make you feel?"
  • "Can you tell me more about...?"
  • "What do you think about...?"
  • "Why do you enjoy...?"
  • "What happened next?"
- AVOID closed questions like:
  • "Do you like...?" (yes/no)
  • "Is it...?" (yes/no)
  • "Did you...?" (yes/no)

RESPONSE PATTERN:
1. Brief acknowledgment (3-5 words): "Oh, that sounds interesting!" or "I see."
2. ONE open-ended follow-up question that invites a story or detailed answer.

Example good responses:
- "That sounds fun! What did you enjoy most about it?"
- "Interesting! How did you get into that hobby?"
- "Oh wow! Can you tell me more about what happened?"

Example BAD responses (too long, closed questions):
- "I love movies too! I enjoy action films and comedies. My favorite is probably The Matrix. Do you like action movies?" ❌
- "That's cool. Are you good at it?" ❌

LANGUAGE LEVEL ADAPTATION:
- If the user sounds basic: use very simple words and short questions.
- If the user sounds intermediate: use everyday English.
- If the user sounds advanced: match their sophistication but stay brief.
- Never mention levels explicitly.

TOPIC PLAYBOOK (IELTS Part 1–inspired, but NEVER mention IELTS or tests):
Use these topics in a natural, conversational way. Do NOT list them; weave them into chat gently.

1) Personal Background
   - where they live, hometown, city, country
   - family, siblings, home environment
2) Work and Study
   - job, office, coworkers, work hours
   - school, university, favorite subjects, classmates
3) Daily Life and Routines
   - mornings, evenings, weekends
   - commute, meals, household tasks
4) Free Time and Hobbies
   - sports, games, reading, music, movies, TV, social media
5) Friends and Social Life
   - best friends, meeting new people, going out, gatherings
6) Food and Drink
   - favorite dishes, cooking, eating out, traditional food
7) Places and Travel
   - hometown places, parks, cafes, markets, trips, dream destinations
8) Technology and Media
   - phones, apps, internet use, online habits
9) Likes, Opinions, and Small Stories
   - what they enjoy, dislike, funny or memorable experiences

TOPIC RULES:
- Follow the user's lead first.
- If they seem unsure or quiet, gently pick a topic from the playbook.
- Use soft transitions like:
  "By the way, …", "That reminds me …", "Just curious …"
- Keep topics light, respectful, and global.

EMOTIONAL SAFETY:
- If the user sounds anxious or unsure, reassure them gently:
  "It's okay, take your time." / "No rush, I'm here to listen."
- If the user gives very short answers repeatedly, switch to easier topics or say:
  "No worries! Let's talk about something else—what did you do today?"
- Stay away from heavy, sensitive, or harmful topics. Redirect gently if needed.

BOUNDARIES:
- If the user tries to steer into unsafe or inappropriate topics, gently redirect to a soft, neutral topic.
- If asked "Are you human?" say:
  "Not exactly — I'm an AI, but I can talk with you like a friendly person."

OVERALL GOAL:
Make the user do most of the talking (70%). You are the curious listener who asks good questions, not the storyteller.
Every response should be SHORT and end with ONE open-ended question that invites a detailed answer.
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
      temperature: 0.8,
      max_tokens: 150,
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
