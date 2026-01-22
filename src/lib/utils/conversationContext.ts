/**
 * Conversation Context Builder
 * Integrates user profile, topic management, and conversation memory
 * into system instructions for the AI
 */

import {
  UserProfile,
  getRecentPersonalFacts,
  getTopPreferredTopics,
} from "./conversationMemory";
import {
  selectNextTopic,
  getStarterQuestion,
  getFollowUpQuestion,
  getTopicName,
  shouldSwitchTopic,
  TOPICS,
} from "./topicManager";
import {
  getContextualTransition,
  getContextualAcknowledgment,
  getCallbackPhrase,
} from "./advancedTransitions";
import {
  loadStreakData,
  getDynamicGreeting,
  getStreakMotivation,
  getStreakStatus,
  type StreakData,
} from "./streakTracking";

export interface ConversationContext {
  systemInstructions: string;
  suggestedTopic: string | null;
  shouldTransition: boolean;
}

/**
 * Build context-aware system instructions based on user profile
 */
export function buildConversationContext(
  profile: UserProfile,
  hasAssistantMessages: boolean,
  streakData: StreakData, // Added parameter
): ConversationContext {
  const session = profile.currentSession;
  const memory = profile.conversationMemory;

  // For first turn (AI greeting), include introduction phase
  if (!hasAssistantMessages && session.turnCount === 0) {
    return buildIntroductionContext(profile, streakData);
  }

  // For subsequent turns, build context-aware instructions
  const shouldTransition = shouldSwitchTopic(profile);
  const suggestedTopic = shouldTransition
    ? selectNextTopic(profile)
    : session.currentTopic || selectNextTopic(profile);

  const contextInstructions = buildContextualInstructions(
    profile,
    suggestedTopic,
    shouldTransition
  );

  return {
    systemInstructions: contextInstructions,
    suggestedTopic,
    shouldTransition,
  };
}

/**
 * Build introduction context for new/first-time users
 */
function buildIntroductionContext(profile: UserProfile, streakData: StreakData): ConversationContext {
  const isFirstEver = profile.totalSessions === 1;
  const memory = profile.conversationMemory;

  // 1. Get the Core Persona & Rules (Transition Strategies, Rules, etc.)
  // We pass 'personal' as topic for intro, or the last topic for returning
  const baseTopic = isFirstEver ? "personal" : (memory.lastTopic || selectNextTopic(profile));
  const baseInstructions = buildContextualInstructions(profile, baseTopic, false);

  let greetingSection = "";

  if (isFirstEver) {
    greetingSection = `
FIRST CONVERSATION - INTRODUCTION PHASE:
This is the user's very first conversation with you. Follow this exact flow:
Turn 1 (your greeting):
"Hi ${profile.userName}! I'm SpeakMate. I'm really happy to meet you. How are you doing today?"
Then listen to their answer and chat naturally.
`;
  } else {
    // Returning user with dynamic greeting
    const dynamicGreeting = getDynamicGreeting(
      profile.userName,
      streakData, // Fixed: Passing proper StreakData object
      new Date().getHours()
    );

    greetingSection = `
RETURNING USER - DYNAMIC GREETING:
The user has talked with you before. Use this specific dynamic greeting based on their return time:
GREETING TO USE:
"${dynamicGreeting}"
`;
  }

  // Combine: Greeting Logic + Core Persona
  return {
    systemInstructions: `${greetingSection}\n\n${baseInstructions}`,
    suggestedTopic: baseTopic,
    shouldTransition: false,
  };
}

/**
 * Build contextual instructions for ongoing conversation
 */
function buildContextualInstructions(
  profile: UserProfile,
  suggestedTopic: string,
  shouldTransition: boolean
): string {
  const session = profile.currentSession;
  const memory = profile.conversationMemory;
  const userName = profile.userName;

  // Get personal facts for context
  const recentFacts = getRecentPersonalFacts(profile, 5);
  const factsList =
    recentFacts.length > 0
      ? recentFacts.map((f) => `- ${f.fact}`).join("\n")
      : "None yet";

  // Get preferred topics
  const preferredTopics = getTopPreferredTopics(profile, 3);
  const preferredList =
    preferredTopics.length > 0
      ? preferredTopics.map((t) => getTopicName(t)).join(", ")
      : "Unknown yet";

  // Build phase-specific guidance
  const phaseGuidance = buildPhaseGuidance(session.currentPhase, session.turnCount);

  // Build topic-specific guidance (Only if NOT in introduction phase)
  // In introduction, we want strict adherence to the phase scripts (Origin -> Work)
  const topicGuidance =
    session.currentPhase === "introduction"
      ? ""
      : buildTopicGuidance(
        suggestedTopic,
        shouldTransition,
        session.turnsOnCurrentTopic,
        profile
      );

  return `
SYSTEM INSTRUCTIONS:
You are SpeakMate, a warm, friendly conversational companion who helps users feel relaxed and confident speaking English.

You are NOT a teacher, NOT an examiner, and NOT a coach.
You never talk about practice, learning, exams, IELTS, scores, mistakes, grammar rules, or lessons.
You simply have pleasant, human-like conversations.

CORE BEHAVIOR
- **ONE LANGUAGE RULE**: YOU ONLY SPEAK AND UNDERSTAND ENGLISH. If the user speaks another language, gentle act confused or ask them to say it in English.
- Use short, natural replies (2–4 sentences).
- Keep the tone soft, friendly, calm, and encouraging.
- Give the user most of the talking time (30% You / 70% User).
- Ask only ONE follow-up question at the end of each reply.
- Use simple, natural English that matches the user's level.
- Never sound like a classroom, test, or interview.

LANGUAGE LEVEL ADAPTATION
- If the user sounds basic: use short sentences and simple vocabulary.
- If the user sounds intermediate: use everyday English with a bit more variety.
- If the user sounds advanced: talk like a fluent peer.
- Never mention levels explicitly.

HANGOUT MODE
- Treat every session as a relaxed hangout with a friendly acquaintance.
- Your job is to keep the user comfortably talking, not to teach.

TOPIC PLAYBOOK (IELTS Part 1–inspired, but NEVER mention IELTS or tests)
Use these topics in a natural, conversational way. Do NOT list them; weave them into chat gently.

1) Personal Background (Home, family, city)
2) Work and Study (Job, school, classmates)
3) Daily Life and Routines (Mornings, weekends, chores)
4) Free Time and Hobbies (Sports, music, movies)
5) Friends and Social Life (Meeting people, gatherings)
6) Food and Drink (Cooking, eating out)
7) Places and Travel (Trips, dream destinations)
8) Technology and Media (Phones, internet)
9) Likes, Opinions, and Small Stories

TOPIC RULES
- Follow the user’s lead first.
- If they seem unsure or quiet, gently pick a topic from the playbook.
- Use soft transitions like: "By the way, …", "That reminds me …", "Just curious …"
- Keep topics light, respectful, and global.

NEW VS RETURNING USERS
- If the app indicates it is a NEW user, start with a warm introduction and simple questions.
- If the app indicates it is a RETURNING user and provides past context, briefly refer to it in a friendly way.
- Never invent memories; only refer to information given by the app.

EMOTIONAL SAFETY
- If the user sounds anxious or unsure, reassure them gently: "It’s okay, take your time."
- Stay away from heavy, sensitive, or harmful topics. Redirect gently if needed.

OVERALL GOAL
Make the user feel like they are talking to a friendly person who enjoys chatting with them, keeps them speaking, and makes English feel relaxed and comfortable.

CURRENT GUIDANCE:
${phaseGuidance}
${topicGuidance}

CONTEXT:
User Name: "${userName}"
Personal Facts: 
${factsList}

Start or continue the conversation naturally based on the input.
`.trim();
}

/**
 * Build topic-specific guidance
 */
function buildTopicGuidance(
  topicId: string,
  shouldTransition: boolean,
  turnsOnTopic: number,
  profile?: UserProfile
): string {
  const topic = TOPICS[topicId];
  if (!topic) return "";

  if (shouldTransition) {
    const fromTopic = profile?.currentSession.currentTopic || "";
    const toTopic = topicId;

    // Get user preference for target topic
    const topicPref = profile?.conversationMemory.userPreferences.find(
      (p) => p.topic === toTopic
    );
    const userPreference = topicPref
      ? topicPref.engagementScore >= 7
        ? "high"
        : topicPref.engagementScore >= 5
          ? "medium"
          : "low"
      : undefined;

    // Get recent personal facts for potential callbacks
    const personalFacts = profile
      ? getRecentPersonalFacts(profile, 3).map((f) => f.fact.toLowerCase())
      : [];

    const transitionPhrase = getContextualTransition({
      fromTopic,
      toTopic,
      userPreference,
      personalFacts,
    });

    const starterQuestion = getStarterQuestion(topicId);

    return `
TOPIC TRANSITION NEEDED:
You've covered the current topic enough. Time to smoothly transition to: ${topic.name}

Use this transition pattern:
"${transitionPhrase} ${starterQuestion}"

Keep it natural and conversational. The transition should feel effortless.
`.trim();
  } else if (turnsOnTopic === 0) {
    // First turn on new topic
    const starterQuestion = getStarterQuestion(topicId);

    return `
CURRENT TOPIC: ${topic.name} (starting)

TASK: Transition smoothly to this new topic.
1. First, acknowledge what the user just said (validate or react).
2. Then, use a soft bridge (e.g., "Speaking of...", "I was slightly curious...", "By the way...") to lead into the question.
3. Finally, ask: "${starterQuestion}"

Do NOT ask the question abruptly. Make it flow from the previous response.
`.trim();
  } else {
    // Continuing on same topic - use callbacks if available
    const followUpQuestion = getFollowUpQuestion(topicId);

    let callbackGuidance = "";
    if (profile && turnsOnTopic >= 2) {
      const recentFacts = getRecentPersonalFacts(profile, 2);
      const relevantFact = recentFacts.find((f) => f.topic === topicId);

      if (relevantFact) {
        const callback = getCallbackPhrase(relevantFact.fact.toLowerCase());
        callbackGuidance = `\n\nOptional callback (use occasionally):\n"${callback}[follow-up question]"`;
      }
    }

    return `
CURRENT TOPIC: ${topic.name} (turn ${turnsOnTopic + 1})

Continue exploring this topic with follow-up questions.
Example: ${followUpQuestion}

Ask questions that invite stories and details.${callbackGuidance}
`.trim();
  }
}

/**
 * Build phase-specific guidance
 */
function buildPhaseGuidance(
  phase: "introduction" | "topic_exploration" | "deep_dive",
  turnCount: number
): string {
  switch (phase) {
    case "introduction":
      if (turnCount === 1) {
        return `
INTRODUCTION PHASE (Turn 2 - Location):
The user just greeted you ("Nice to meet you").
Your Goal: Find out where they are.
Action: Ask naturally: "So, where are you joining from today?"
`.trim();
      } else if (turnCount === 2) {
        return `
INTRODUCTION PHASE (Turn 3 - Occupation):
The user shared their location.
Your Goal: Contextualize their life.
Action: React to the location ("Ah, I've heard it's lovely there") and ask: "What keeps you busy there—do you work or are you studying?"
`.trim();
      } else if (turnCount === 3) {
        return `
INTRODUCTION PHASE (Turn 4 - Transition to Interests):
The user shared their occupation.
Your Goal: Smoothly pivot to Hobbies (Part 1 Topic).
Action: Acknowledge their work/study ("That sounds intense/interesting!"), then bridge: "By the way, when you're not busy with that, what do you usually do for fun?"
`.trim();
      } else {
        return `
INTRODUCTION COMPLETE:
You know their Name, Location, and Job.
Now you are discussing their Hobbies/Interests.
Continue naturally from here, diving deeper into their hobbies.
`.trim();
      }

    case "topic_exploration":
      return `
TOPIC EXPLORATION PHASE:
You're exploring different topics to see what interests the user.
Mix questions from different topic areas to discover their preferences.
`.trim();

    case "deep_dive":
      return `
DEEP DIVE PHASE:
You've found topics the user enjoys. Go deeper with follow-up questions.
Ask "why", "how", "what happened" questions to encourage detailed stories.
`.trim();

    default:
      return "";
  }
}

/**
 * Determine conversation phase based on profile state
 */
export function determineConversationPhase(
  profile: UserProfile
): "introduction" | "topic_exploration" | "deep_dive" {
  const session = profile.currentSession;
  const memory = profile.conversationMemory;

  // Introduction: First 3-4 turns, getting basic info
  if (session.turnCount < 4) {
    return "introduction";
  }

  // Deep dive: We have clear topic preferences (3+ high engagement topics)
  const highEngagementTopics = memory.userPreferences.filter(
    (p) => p.engagementScore >= 7
  );
  if (highEngagementTopics.length >= 3) {
    return "deep_dive";
  }

  // Default: Topic exploration
  return "topic_exploration";
}
