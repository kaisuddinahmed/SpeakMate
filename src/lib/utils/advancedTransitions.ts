/**
 * Advanced Transition Templates
 * Context-aware transition phrases for natural topic changes
 */

export interface TransitionContext {
  fromTopic: string;
  toTopic: string;
  userPreference?: "high" | "medium" | "low";
  personalFacts?: string[];
}

/**
 * Get contextual transition phrase based on topic relationship
 */
export function getContextualTransition(context: TransitionContext): string {
  const { fromTopic, toTopic, userPreference, personalFacts } = context;

  // 2. Enthusiasm-Based Transitions (High Engagement)
  if (userPreference === "high") {
    const enthusiasticTransitions = [
      `You seem really passionate about that! Speaking of things you enjoy,`,
      `That's awesome! I'm curious,`,
      `I love your enthusiasm! Let me ask you,`,
      `That's amazing! By the way,`,
    ];
    return randomChoice(enthusiasticTransitions);
  }

  // 1. Topic-Specific Bridges (Natural Logic)
  const topicBridges: Record<string, Record<string, string[]>> = {
    work_study: {
      hobbies: [
        "That makes sense. So what do you do to unwind after work?",
        "Interesting! Do you have any hobbies outside of work?",
        "I hear you. Balancing work and life is important—what do you do for fun?",
      ],
      social_life: [
        "That sounds busy! Do you hang out with coworkers outside of work?",
        "I see. How about your social life—do you have time for friends?",
      ],
      daily_life: [
        "Got it. So after your workday ends, what's your routine like?",
        "I see. When you're not working, how do you spend your day?"
      ]
    },
    food_drink: {
      places_travel: [
        "Yum! Have you tried food from other countries when traveling?",
        "That sounds delicious! What's the best meal you had while traveling?",
        "I love trying new food too! Did you discover any favorites on your trips?"
      ],
      social_life: [
        "That sounds tasty! Do you like going out to eat with friends?",
        "nice! What's your favorite restaurant to go to with people?",
      ]
    },
    social_life: {
      hobbies: [
        "That's awesome! What do you and your friends usually do together?",
        "Cool! Do you share any hobbies with your friends?",
        "Nice! Do you prefer doing your hobbies alone or with your group?"
      ],
      food_drink: [
        "That sounds fun! Where do you like to eat when you go out with friends?",
        "Nice! Do you and your friends enjoy trying new restaurants?",
      ]
    },
    hobbies: {
      social_life: [
        "That's cool! Do you do that alone or with friends?",
        "Nice! Have you met people through that hobby?",
      ],
      work_study: [
        "That's great! Does that hobby help you relax from work?",
        "Cool! How do you fit that in with your work schedule?",
      ]
    },
    places_travel: {
      food_drink: [
        "That's awesome! What was the best food you tried there?",
        "Cool! Did you discover any new foods during your travels?",
      ],
      personal: [
        "That sounds incredible! So, where did you grow up originally?",
        "Amazing! Speaking of places, what's your hometown like?",
      ]
    },
    // Fallbacks for common pairings
    daily_life: {
      hobbies: [
        "That makes sense! In your free time, what do you like to do?",
        "Interesting! After your daily tasks, how do you unwind?",
      ]
    }
  };

  // Get topic-specific bridge if available
  const bridges = topicBridges[fromTopic]?.[toTopic];
  if (bridges && bridges.length > 0) {
    return randomChoice(bridges);
  }

  // 3. Personal Fact Callbacks
  if (personalFacts && personalFacts.length > 0) {
    const fact = randomChoice(personalFacts);
    const callbacks = [
      `That makes sense! You mentioned earlier that ${fact}. So,`,
      `Got it! Since you ${fact},`,
      `I hear you! You said ${fact}, right? So,`,
      `That reminds me—you mentioned ${fact}.`,
    ];
    return randomChoice(callbacks);
  }

  // 4. Generic Smooth Transitions (Fallbacks)
  const genericTransitions = [
    "That's interesting! By the way,",
    "Fair enough! I'm curious,",
    "Switching gears a bit,",
    "I see. Speaking of which,",
    "Got it. Let me ask you,",
    "That makes sense. So,",
    "Cool! On a different note,",
    "Interesting! I'd love to know,",
  ];

  return randomChoice(genericTransitions);
}

/**
 * 5. Contextual Acknowledgments
 * Based on response length/quality
 */
export function getContextualAcknowledgment(
  responseLength: number,
  sentiment: "positive" | "neutral" | "negative" = "neutral"
): string {
  // Long, detailed response
  if (responseLength > 100) {
    const enthusiasticAcks = [
      "That's really interesting!",
      "Wow, that's awesome!",
      "That sounds amazing!",
      "I love hearing about that!",
      "That's so cool!",
    ];
    return randomChoice(enthusiasticAcks);
  }

  // Medium response
  if (responseLength > 40) {
    const standardAcks = [
      "That makes sense!",
      "Interesting!",
      "That's nice!",
      "I see!",
      "Fair enough!",
    ];
    return randomChoice(standardAcks);
  }

  // Short response
  const briefAcks = ["Got it.", "I see.", "Ah, okay.", "Fair enough."];
  return randomChoice(briefAcks);
}

/**
 * Get callback phrase to reference previous conversation
 */
export function getCallbackPhrase(fact: string): string {
  const callbacks = [
    `You mentioned earlier that ${fact}. `,
    `Last time you told me ${fact}. `,
    `I remember you said ${fact}. `,
    `Since you ${fact}, `,
  ];

  return randomChoice(callbacks);
}

/**
 * Get off-topic redirect with acknowledgment
 */
export function getOffTopicRedirect(
  offTopicType: "ai_question" | "political" | "technical" | "personal_advice" | "other"
): string {
  const redirects: Record<typeof offTopicType, string[]> = {
    ai_question: [
      "I'm an AI, but I enjoy chatting like a friendly person.",
      "I'm not human, but I can have great conversations!",
      "That's an interesting question, but let's talk about you instead.",
    ],
    political: [
      "That's definitely a big topic.",
      "There are many views on that.",
      "It's a complex issue for sure.",
    ],
    technical: [
      "That's an interesting technical topic.",
      "I'm not an expert on that.",
      "That's pretty specialized.",
    ],
    personal_advice: [
      "That's something personal to think about.",
      "That's a decision only you can make.",
      "Everyone's situation is different.",
    ],
    other: [
      "I hear you.",
      "That's one way to see it.",
      "Interesting perspective.",
    ],
  };

  return randomChoice(redirects[offTopicType]);
}

/**
 * Helper: Random choice from array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
