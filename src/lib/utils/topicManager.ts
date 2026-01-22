/**
 * Topic Management System
 * Handles topic selection, transitions, and categorization
 */

import { UserProfile } from "./conversationMemory";

export interface Topic {
  id: string;
  name: string;
  subtopics: string[];
  starterQuestions: string[];
  followUpQuestions: string[];
  relatedTopics: string[];
}

export const TOPICS: Record<string, Topic> = {
  personal: {
    id: "personal",
    name: "Personal Background",
    subtopics: ["hometown", "family", "living_situation", "background"],
    starterQuestions: [
      "Where are you from originally?",
      "Do you have any siblings?",
      "What's your hometown like?",
      "Tell me a bit about your family.",
      "Where do you live now?",
    ],
    followUpQuestions: [
      "What do you love most about [place]?",
      "How often do you see your family?",
      "What's the best thing about living there?",
      "How is it different from where you grew up?",
      "What do you miss most about [place]?",
    ],
    relatedTopics: ["daily_life", "places_travel"],
  },

  work_study: {
    id: "work_study",
    name: "Work & Study",
    subtopics: ["current_job", "career", "colleagues", "studies", "workplace"],
    starterQuestions: [
      "What do you do for work?",
      "Are you studying anything right now?",
      "What's your typical workday like?",
      "How did you get into that field?",
      "What do you study?",
    ],
    followUpQuestions: [
      "What do you enjoy most about your job?",
      "What's the most challenging part?",
      "What are your coworkers like?",
      "How long have you been doing that?",
      "What made you choose that field?",
    ],
    relatedTopics: ["daily_life", "technology"],
  },

  daily_life: {
    id: "daily_life",
    name: "Daily Life & Routines",
    subtopics: ["morning_routine", "evening", "weekends", "habits", "schedule"],
    starterQuestions: [
      "What does a typical day look like for you?",
      "What's your morning routine like?",
      "How do you usually spend your evenings?",
      "What do you do on weekends?",
      "Are you a morning person or night owl?",
    ],
    followUpQuestions: [
      "How has that routine changed over time?",
      "What's your favorite part of the day?",
      "Do you prefer weekdays or weekends?",
      "What time do you usually wake up?",
      "How do you like to start your day?",
    ],
    relatedTopics: ["work_study", "hobbies", "food_drink"],
  },

  hobbies: {
    id: "hobbies",
    name: "Hobbies & Interests",
    subtopics: ["sports", "creative", "entertainment", "games", "activities"],
    starterQuestions: [
      "What do you like to do in your free time?",
      "Do you play any sports?",
      "Are you into any hobbies?",
      "What do you do to relax?",
      "Do you have any creative hobbies?",
    ],
    followUpQuestions: [
      "How did you get into that?",
      "How often do you do that?",
      "What do you love about it?",
      "Have you been doing it for long?",
      "Do you do it alone or with others?",
    ],
    relatedTopics: ["social_life", "technology"],
  },

  social_life: {
    id: "social_life",
    name: "Friends & Social Life",
    subtopics: ["friends", "gatherings", "socializing", "relationships", "activities"],
    starterQuestions: [
      "How do you usually spend time with friends?",
      "What do you like to do when you go out?",
      "Do you prefer small gatherings or big parties?",
      "How do you stay in touch with friends?",
      "Do you make friends easily?",
    ],
    followUpQuestions: [
      "What do you and your friends usually do together?",
      "How did you meet your closest friends?",
      "Do you prefer staying in or going out?",
      "What makes a good friend in your opinion?",
      "Have you made any new friends recently?",
    ],
    relatedTopics: ["hobbies", "food_drink", "places_travel"],
  },

  food_drink: {
    id: "food_drink",
    name: "Food & Dining",
    subtopics: ["cooking", "restaurants", "favorite_dishes", "traditional_food", "eating_habits"],
    starterQuestions: [
      "What kind of food do you like?",
      "Do you enjoy cooking?",
      "What's your favorite dish?",
      "Do you eat out often?",
      "What's a typical meal in your country?",
    ],
    followUpQuestions: [
      "What's the best meal you've ever had?",
      "Do you have a favorite restaurant?",
      "What dish can you cook really well?",
      "Have you tried any new foods recently?",
      "What food reminds you of home?",
    ],
    relatedTopics: ["daily_life", "places_travel", "social_life"],
  },

  places_travel: {
    id: "places_travel",
    name: "Places & Travel",
    subtopics: ["local_places", "trips", "dream_destinations", "experiences", "culture"],
    starterQuestions: [
      "Do you like to travel?",
      "What's your favorite place you've visited?",
      "Where would you love to go someday?",
      "What are some nice spots in your city?",
      "Have you traveled much?",
    ],
    followUpQuestions: [
      "What made that place special?",
      "What do you like most about traveling?",
      "Where was the last place you traveled to?",
      "Do you prefer beach or mountain destinations?",
      "What's the most interesting place you've been?",
    ],
    relatedTopics: ["personal", "food_drink", "experiences"],
  },

  technology: {
    id: "technology",
    name: "Technology & Media",
    subtopics: ["phones", "apps", "internet", "social_media", "online_habits"],
    starterQuestions: [
      "How much time do you spend on your phone?",
      "What apps do you use the most?",
      "Are you into social media?",
      "What do you usually do online?",
      "Do you watch a lot of videos online?",
    ],
    followUpQuestions: [
      "What's your favorite app right now?",
      "How has technology changed your daily life?",
      "Do you think you use your phone too much?",
      "What do you use social media for?",
      "Have you tried any new apps recently?",
    ],
    relatedTopics: ["hobbies", "work_study", "social_life"],
  },

  experiences: {
    id: "experiences",
    name: "Opinions & Experiences",
    subtopics: ["likes", "dislikes", "memorable_moments", "stories", "preferences"],
    starterQuestions: [
      "What's something you really enjoy?",
      "What's a memorable experience you've had?",
      "What's something that always makes you happy?",
      "Tell me about a time when something funny happened.",
      "What's something you're proud of?",
    ],
    followUpQuestions: [
      "What made that experience so special?",
      "How did that make you feel?",
      "Would you do it again?",
      "What did you learn from that?",
      "Who were you with when that happened?",
    ],
    relatedTopics: ["personal", "places_travel", "hobbies"],
  },
  nature: {
    id: "nature",
    name: "Nature & Environment",
    subtopics: ["the_sea", "flowers", "trees", "weather", "seasons"],
    starterQuestions: [
      "Do you like being close to nature?",
      "What's your favorite season and why?",
      "Do you prefer the sea or the mountains?",
      "Are there many trees or parks where you live?",
      "Do you like having flowers in your home?",
    ],
    followUpQuestions: [
      "How does being in nature make you feel?",
      "What do you usually do when you go to the seaside?",
      "Do you have a favorite flower or plant?",
      "Does the weather affect your mood?",
      "What's the most beautiful natural place you've seen?",
    ],
    relatedTopics: ["places_travel", "daily_life", "abstract"],
  },

  abstract: {
    id: "abstract",
    name: "Abstract & Lifestyle",
    subtopics: ["dreams", "humour", "colours", "public_transport", "fashion"],
    starterQuestions: [
      "Do you often remember your dreams?",
      "What kind of comedy or humor do you like?",
      "Do you have a favorite color?",
      "How do you usually get around your city?",
      "Are you interested in fashion?",
    ],
    followUpQuestions: [
      "What was the strangest dream you've ever had?",
      "Who is the funniest person you know?",
      "Do you think colors affect how people feel?",
      "What do you think about public transport in your area?",
      "Do you prefer comfortable clothes or fashionable ones?",
    ],
    relatedTopics: ["personal", "social_life", "daily_life"],
  },

  festivals: {
    id: "festivals",
    name: "Festivals & Celebrations",
    subtopics: ["traditional_festivals", "birthdays", "public_holidays", "parties"],
    starterQuestions: [
      "What's the biggest festival in your country?",
      "Do you prefer celebrating with family or friends?",
      "Do you like going to parties?",
      "What's your favorite holiday of the year?",
      "Are there any traditional celebrations you enjoy?",
    ],
    followUpQuestions: [
      "What special food do you eat during that festival?",
      "How do you usually celebrate your birthday?",
      "Is it important to keep traditional festivals alive?",
      "What's the best party you've ever been to?",
      "How do people celebrate New Year in your culture?",
    ],
    relatedTopics: ["culture", "food_drink", "social_life"],
  },
};

export const ALL_TOPIC_IDS = Object.keys(TOPICS);

/**
 * Select the next topic based on user profile and conversation state
 */
export function selectNextTopic(profile: UserProfile): string {
  const session = profile.currentSession;
  const memory = profile.conversationMemory;

  // For new users in introduction phase, follow natural progression
  if (profile.totalSessions === 1 && session.turnCount <= 3) {
    if (session.turnCount === 0) return "personal"; // Start with personal
    if (session.turnCount === 1) return "personal"; // Continue personal
    if (session.turnCount === 2) return "work_study"; // Move to work/study
  }

  // Priority 1: Topics with high engagement (score >= 7)
  const preferredTopics = memory.userPreferences
    .filter((p) => p.engagementScore >= 7)
    .map((p) => p.topic);

  // Priority 2: Topics not covered in this session
  const freshTopics = ALL_TOPIC_IDS.filter(
    (t) => !session.topicsThisSession.includes(t)
  );

  // Priority 3: Related topics for natural flow
  const currentTopic = session.currentTopic;
  const relatedTopics =
    currentTopic && TOPICS[currentTopic]
      ? TOPICS[currentTopic].relatedTopics
      : [];

  // Smart selection algorithm
  // 30% chance to pick from preferred topics (if available)
  if (preferredTopics.length > 0 && Math.random() < 0.3) {
    return randomChoice(preferredTopics);
  }

  // 50% chance to pick related topic for smooth transition (if available)
  if (relatedTopics.length > 0 && Math.random() < 0.5) {
    const availableRelated = relatedTopics.filter((t) =>
      freshTopics.includes(t)
    );
    if (availableRelated.length > 0) {
      return randomChoice(availableRelated);
    }
  }

  // Otherwise pick from fresh topics, or any topic if all covered
  if (freshTopics.length > 0) {
    return randomChoice(freshTopics);
  }

  return randomChoice(ALL_TOPIC_IDS);
}

/**
 * Get a starter question for a topic
 */
export function getStarterQuestion(topicId: string): string {
  const topic = TOPICS[topicId];
  if (!topic) return "What's on your mind?";
  return randomChoice(topic.starterQuestions);
}

/**
 * Get a follow-up question for a topic
 */
export function getFollowUpQuestion(topicId: string): string {
  const topic = TOPICS[topicId];
  if (!topic) return "Can you tell me more about that?";
  return randomChoice(topic.followUpQuestions);
}

/**
 * Get topic name by ID
 */
export function getTopicName(topicId: string): string {
  return TOPICS[topicId]?.name || topicId;
}

/**
 * Detect if user response is going off-topic
 * Returns true if message seems unrelated to core topics
 */
export function isOffTopic(userMessage: string): boolean {
  const lowerMessage = userMessage.toLowerCase();

  // Off-topic indicators (these suggest non-conversational topics)
  const offTopicKeywords = [
    // Technical AI questions
    "are you ai", "are you human", "are you real", "are you a bot",
    "what are you", "who created you", "how do you work",

    // Sensitive topics
    "politics", "political", "election", "government",
    "religion", "religious", "god", "church",

    // Requests for services AI shouldn't provide
    "diagnose", "medical advice", "legal advice",
    "cryptocurrency", "crypto", "stock", "investment",

    // Meta questions about the app/service
    "how does this app", "what is this for", "why this app",
  ];

  return offTopicKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Get a smooth transition phrase for topic changes
 */
export function getTransitionPhrase(): string {
  const transitions = [
    "That's interesting! By the way,",
    "I see. Speaking of which,",
    "Got it. So,",
    "Ah, that reminds me,",
    "Interesting! I'm curious,",
    "That makes sense. Let me ask you,",
    "Cool! I'd love to know,",
    "Fair enough. So,",
  ];

  return randomChoice(transitions);
}

/**
 * Get an acknowledgment phrase for brief responses
 */
export function getAcknowledgmentPhrase(): string {
  const acknowledgments = [
    "I see.",
    "Got it.",
    "Ah, okay.",
    "Interesting.",
    "Fair enough.",
    "That makes sense.",
  ];

  return randomChoice(acknowledgments);
}

/**
 * Determine if it's time to switch topics
 * Returns true if:
 * - User has been on topic for 4+ turns
 * - User gives consistently short answers (low engagement)
 */
export function shouldSwitchTopic(profile: UserProfile): boolean {
  const session = profile.currentSession;

  // Switch after 4-5 turns on same topic
  if (session.turnsOnCurrentTopic >= 4) {
    return Math.random() > 0.3; // 70% chance to switch
  }

  // Check engagement on current topic
  if (session.currentTopic) {
    const pref = profile.conversationMemory.userPreferences.find(
      (p) => p.topic === session.currentTopic
    );

    // If low engagement (score < 4) after 3+ turns, switch
    if (pref && pref.engagementScore < 4 && session.turnsOnCurrentTopic >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Helper: Random choice from array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
