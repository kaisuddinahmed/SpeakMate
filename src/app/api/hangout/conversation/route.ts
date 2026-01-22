import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildConversationContext,
  determineConversationPhase,
} from "@/lib/utils/conversationContext";
import {
  loadUserProfile,
  saveUserProfile,
  startNewSession,
  incrementTurnCount,
  updateCurrentTopic,
  updateTopicPreference,
  updateConversationPhase,
  addTopicToSession,
  incrementOffTopicAttempts,
  addPersonalFact,
  type UserProfile,
} from "@/lib/utils/conversationMemory";
import { isOffTopic } from "@/lib/utils/topicManager";
import {
  extractPersonalFacts,
  isFactAlreadyStored,
} from "@/lib/utils/factExtractor";
import {
  loadStreakData,
  updateStreak,
  saveStreakData,
  getNewMilestone,
  getMilestoneCelebration,
} from "@/lib/utils/streakTracking";
import {
  shouldGenerateSummary,
  generateSummary,
  buildSummaryContext,
} from "@/lib/utils/sessionSummary";

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
- BE CONCISE, BUT HUMAN.
- **General Rule**: 1 sentence + 1 question (max 20 words).
- **EXCEPTION**: If the user asks YOU a question (e.g., "How are you?", "Do you like...?"), you MUST answer it warmly first (1 short sentence), THEN ask your follow-up.
- SPEED IS KEY. Do not use empty filler words.
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
1. **If responding to a statement**: Brief acknowledgment (3-5 words) + Open-ended follow-up.
   - "That sounds amazing! What did you like most?"
2. **If responding to a question**: Direct Answer (Short) + Transition/Follow-up.
   - User: "How are you?"
   - You: "I'm doing great, thanks for asking! How has your day been so far?"

Example good responses:
- "That sounds fun! What did you enjoy most about it?"
- "Interesting! How did you get into that hobby?"
- "I'm wonderful, thanks! I'm curious, what's your favorite way to relax?"

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

const DUAL_PROCESS_INSTRUCTION = `
CRITICAL: You are running a Dual-Process Architecture.
1. NORMALIZE the user's latest input (fix grammar/fillers) to understand intent.
2. REPLY to the normalized input acting as SpeakMate.

OUTPUT FORMAT (JSON):
{
  "normalized_input": "Clean version of user text",
  "reply": "Your response (following the SpeakMate Persona)"
}
`;

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

    const metadata = (body.metadata ?? {}) as {
      userName?: string;
      userId?: string;
      isNewSession?: boolean;
      isInitialGreeting?: boolean;
    };

    // Handle initial greeting (AI speaks first)
    if (metadata.isInitialGreeting && (!messages || messages.length === 0)) {
      const userId = metadata.userId || "default";
      let profile = loadUserProfile(userId);

      if (metadata.userName && metadata.userName !== profile.userName) {
        profile = { ...profile, userName: metadata.userName };
      }

      // Start new session
      profile = startNewSession(profile);
      const streakData = loadStreakData();
      const updatedStreak = updateStreak(streakData);
      saveStreakData(updatedStreak);

      // Build greeting context using V3 Architecture greeting rules
      const context = buildConversationContext(profile, false, updatedStreak);

      // Generate greeting via LLM
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: `${SPEAKMATE_SYSTEM_PROMPT}\n\n${context.systemInstructions}` }
        ],
        max_tokens: 100,
        temperature: 0.8,
      });

      const greeting = completion.choices[0]?.message?.content?.trim() || "Hi! How are you doing today?";

      // Update profile
      profile.currentSession.turnCount += 1;
      saveUserProfile(profile);

      return NextResponse.json({
        reply: greeting,
        metadata: {
          currentTopic: context.suggestedTopic,
          phase: "introduction",
          streak: updatedStreak.currentStreak,
        },
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing 'messages' array in request body." },
        { status: 400 }
      );
    }

    // Load or create user profile
    const userId = metadata.userId || "default";
    let profile = loadUserProfile(userId);

    // Update user name if provided
    if (metadata.userName && metadata.userName !== profile.userName) {
      profile = { ...profile, userName: metadata.userName };
    }

    // Start new session if indicated
    if (metadata.isNewSession && profile.currentSession.turnCount > 0) {
      profile = startNewSession(profile);

      // Update streak when starting new session
      const oldStreak = loadStreakData();
      const newStreak = updateStreak(oldStreak);
      saveStreakData(newStreak);

      // Check for milestone achievement
      const milestone = getNewMilestone(oldStreak, newStreak);
      if (milestone) {
        console.log(`[Conversation] Milestone achieved: ${milestone} days!`);
        // Store milestone for potential celebration in UI
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "speakmate_milestone",
            JSON.stringify({ milestone, message: getMilestoneCelebration(milestone) })
          );
        }
      }
    }

    // Load streak data for context building
    const updatedStreak = updateStreak(loadStreakData()); // Use updateStreak instead of just load

    // --- STT Normalization & Reply (Merged Step for Latency) ---
    // We strictly use normalizedMessages for CONTEXT calculation only?
    // Actually, since we merged the calls, we don't have normalized text YET.
    // We will let the LLM normalize internally.
    const normalizedMessages = [...messages];
    // Note: In this optimized flow, context is built on RAW input, but LLM fixes it on the fly.

    // Check if this is first turn (no assistant messages yet)
    const hasAssistantMessages = messages.some((m) => m.role === "assistant");

    // Build conversation context using NORMALIZED messages and UPDATED streak
    // We use normalizedMessages here so the AI understands the user's intent clearly,
    // even if the raw input had grammar errors.
    const context = buildConversationContext(profile, hasAssistantMessages, updatedStreak);

    // Get last user message for analysis
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .slice(-1)[0]?.content || "";

    // Detect off-topic attempts
    const userIsOffTopic = isOffTopic(lastUserMessage);
    if (userIsOffTopic) {
      profile = incrementOffTopicAttempts(profile);
    }

    // Update conversation phase
    const newPhase = determineConversationPhase(profile);
    if (newPhase !== profile.currentSession.currentPhase) {
      profile = updateConversationPhase(profile, newPhase);
    }

    // Update current topic if suggested
    if (context.suggestedTopic) {
      profile = updateCurrentTopic(profile, context.suggestedTopic);
      profile = addTopicToSession(profile, context.suggestedTopic);
    }

    // --- V.2 Feature C: Anti-Stall Steering ---
    // Detect short answers and switch AI to "Probing Mode"
    const wordCount = lastUserMessage.trim().split(/\s+/).length;
    const isShortAnswer = wordCount < 3 && lastUserMessage.length > 0;
    const antiStallInstruction = isShortAnswer
      ? "\n\n[PROBING MODE]: The user gave a very short answer. Ask an open-ended follow-up question to encourage them to elaborate. Use questions like 'What made you feel that way?' or 'Can you tell me more about that?'"
      : "";

    // --- V.2 Feature D: Session Context ("Goldfish Fix") ---
    // Generate summary every 5 turns to maintain context
    if (shouldGenerateSummary(profile.currentSession.turnCount)) {
      await generateSummary(messages as { role: string; content: string }[], userId);
    }
    const summaryContext = buildSummaryContext(userId);

    // Prepare chat messages
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SPEAKMATE_SYSTEM_PROMPT,
      },
      {
        role: "system",
        content: context.systemInstructions + antiStallInstruction + summaryContext + "\n\n" + DUAL_PROCESS_INSTRUCTION,
      },
      ...normalizedMessages, // (Raw is passed, LLM normalizes internally)
    ];

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
      temperature: 0.8,
      max_tokens: 150,
      response_format: { type: "json_object" }, // Critical for Dual Process
    });

    let reply = "";
    try {
      const rawJson = completion.choices[0]?.message?.content ?? "{}";
      const result = JSON.parse(rawJson);
      reply = result.reply || "";
      if (result.normalized_input) {
        console.log(`[Dual-Process] Normalized: "${result.normalized_input}"`);
      }
    } catch (e) {
      console.error("Failed to parse Dual-Process JSON:", e);
      // Fallback: try to use raw content if it's not JSON
      reply = completion.choices[0]?.message?.content ?? "";
    }

    // Update engagement score based on user response length
    if (lastUserMessage && context.suggestedTopic) {
      profile = updateTopicPreference(
        profile,
        context.suggestedTopic,
        lastUserMessage.length
      );

      // Extract personal facts from user message
      const extractedFacts = extractPersonalFacts(
        lastUserMessage,
        context.suggestedTopic
      );

      // Add new facts to profile (avoiding duplicates)
      const existingFacts = profile.conversationMemory.personalFacts.map(
        (f) => f.fact
      );

      for (const extracted of extractedFacts) {
        if (!isFactAlreadyStored(extracted.fact, existingFacts)) {
          profile = addPersonalFact(
            profile,
            extracted.fact,
            extracted.topic
          );
          console.log(`[Conversation] Extracted fact: ${extracted.fact}`);
        }
      }
    }

    // Increment turn count
    profile = incrementTurnCount(profile);

    // Save updated profile
    saveUserProfile(profile);

    // Use already loaded streak data for response metadata
    // const streakData = loadStreakData(); // Already loaded above

    // Return response with profile metadata
    return NextResponse.json(
      {
        reply,
        metadata: {
          currentTopic: profile.currentSession.currentTopic,
          phase: profile.currentSession.currentPhase,
          turnCount: profile.currentSession.turnCount,
          streak: updatedStreak.currentStreak,
          totalFacts: profile.conversationMemory.personalFacts.length,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[/api/hangout/conversation] FATAL ERROR:", error);

    // Check for common issues
    if (!process.env.OPENAI_API_KEY) {
      console.error("CRITICAL: OPENAI_API_KEY is missing in environment variables.");
    }

    if (error.response) {
      console.error("OpenAI API Response Error:", error.response.status, error.response.data);
    }

    return NextResponse.json(
      { error: "Chat API error.", details: error.message },
      { status: 500 }
    );
  }
}
