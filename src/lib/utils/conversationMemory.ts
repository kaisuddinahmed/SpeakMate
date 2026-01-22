/**
 * Conversation Memory Management
 * Tracks user conversation history, topics covered, and preferences
 */

export interface PersonalFact {
  fact: string;
  topic: string;
  sessionId: string;
  timestamp: string;
}

export interface TopicPreference {
  topic: string;
  engagementScore: number; // 1-10 based on response length/quality
  lastDiscussed: string;
  timesDiscussed: number;
}

export interface ConversationMemory {
  topicsCovered: string[];
  lastTopic: string | null;
  userPreferences: TopicPreference[];
  personalFacts: PersonalFact[];
}

export interface CurrentSession {
  sessionId: string;
  topicsThisSession: string[];
  offTopicAttempts: number;
  currentPhase: "introduction" | "topic_exploration" | "deep_dive";
  turnCount: number;
  currentTopic: string | null;
  turnsOnCurrentTopic: number;
}

export interface UserProfile {
  userId: string;
  userName: string;
  totalSessions: number;
  firstSessionAt: string;
  lastSessionAt: string | null;
  conversationMemory: ConversationMemory;
  currentSession: CurrentSession;
}

const STORAGE_KEY_PREFIX = "speakmate_profile_";

/**
 * Initialize or load user profile from localStorage
 */
export function loadUserProfile(userId: string = "default"): UserProfile {
  if (typeof window === "undefined") {
    return createDefaultProfile(userId);
  }

  const stored = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);

  if (stored) {
    try {
      return JSON.parse(stored) as UserProfile;
    } catch (error) {
      console.error("Failed to parse user profile:", error);
      return createDefaultProfile(userId);
    }
  }

  return createDefaultProfile(userId);
}

/**
 * Save user profile to localStorage
 */
export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${profile.userId}`,
      JSON.stringify(profile)
    );
  } catch (error) {
    console.error("Failed to save user profile:", error);
  }
}

/**
 * Create and save a new user profile with specific name
 */
export function createAndSaveProfile(userId: string, userName: string): UserProfile {
  const profile = createDefaultProfile(userId);
  profile.userName = userName;
  saveUserProfile(profile);
  return profile;
}

/**
 * Create a new default user profile
 */
function createDefaultProfile(userId: string): UserProfile {
  return {
    userId,
    userName: "friend",
    totalSessions: 0,
    firstSessionAt: new Date().toISOString(),
    lastSessionAt: null,
    conversationMemory: {
      topicsCovered: [],
      lastTopic: null,
      userPreferences: [],
      personalFacts: [],
    },
    currentSession: createNewSession(),
  };
}

/**
 * Create a new session object
 */
export function createNewSession(): CurrentSession {
  const sessionId = typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto
    ? (window.crypto as any).randomUUID()
    : Math.random().toString(36).slice(2);

  return {
    sessionId: String(sessionId),
    topicsThisSession: [],
    offTopicAttempts: 0,
    currentPhase: "introduction",
    turnCount: 0,
    currentTopic: null,
    turnsOnCurrentTopic: 0,
  };
}

/**
 * Start a new conversation session
 */
export function startNewSession(profile: UserProfile): UserProfile {
  return {
    ...profile,
    totalSessions: profile.totalSessions + 1,
    lastSessionAt: new Date().toISOString(),
    currentSession: createNewSession(),
  };
}

/**
 * Add a personal fact learned about the user
 */
export function addPersonalFact(
  profile: UserProfile,
  fact: string,
  topic: string
): UserProfile {
  const newFact: PersonalFact = {
    fact,
    topic,
    sessionId: profile.currentSession.sessionId,
    timestamp: new Date().toISOString(),
  };

  // Avoid duplicates
  const exists = profile.conversationMemory.personalFacts.some(
    (f) => f.fact.toLowerCase() === fact.toLowerCase()
  );

  if (exists) return profile;

  return {
    ...profile,
    conversationMemory: {
      ...profile.conversationMemory,
      personalFacts: [...profile.conversationMemory.personalFacts, newFact],
    },
  };
}

/**
 * Update topic preference based on user engagement
 */
export function updateTopicPreference(
  profile: UserProfile,
  topic: string,
  userResponseLength: number
): UserProfile {
  // Calculate engagement score (1-10) based on response length
  // Short response (< 20 chars) = low engagement (1-3)
  // Medium response (20-100 chars) = medium engagement (4-7)
  // Long response (> 100 chars) = high engagement (8-10)
  let engagementScore: number;
  if (userResponseLength < 20) {
    engagementScore = Math.min(3, Math.max(1, Math.floor(userResponseLength / 7)));
  } else if (userResponseLength < 100) {
    engagementScore = Math.min(7, Math.max(4, Math.floor(userResponseLength / 15)));
  } else {
    engagementScore = Math.min(10, Math.max(8, 8 + Math.floor((userResponseLength - 100) / 50)));
  }

  const existingPref = profile.conversationMemory.userPreferences.find(
    (p) => p.topic === topic
  );

  if (existingPref) {
    // Update existing preference (weighted average)
    const newScore = Math.round(
      (existingPref.engagementScore * existingPref.timesDiscussed + engagementScore) /
      (existingPref.timesDiscussed + 1)
    );

    return {
      ...profile,
      conversationMemory: {
        ...profile.conversationMemory,
        userPreferences: profile.conversationMemory.userPreferences.map((p) =>
          p.topic === topic
            ? {
              ...p,
              engagementScore: newScore,
              lastDiscussed: new Date().toISOString(),
              timesDiscussed: p.timesDiscussed + 1,
            }
            : p
        ),
      },
    };
  } else {
    // Add new preference
    const newPref: TopicPreference = {
      topic,
      engagementScore,
      lastDiscussed: new Date().toISOString(),
      timesDiscussed: 1,
    };

    return {
      ...profile,
      conversationMemory: {
        ...profile.conversationMemory,
        userPreferences: [...profile.conversationMemory.userPreferences, newPref],
      },
    };
  }
}

/**
 * Mark a topic as covered in current session
 */
export function addTopicToSession(
  profile: UserProfile,
  topic: string
): UserProfile {
  // Add to session topics if not already there
  if (profile.currentSession.topicsThisSession.includes(topic)) {
    return profile;
  }

  // Add to overall topics covered if not there
  const topicsCovered = profile.conversationMemory.topicsCovered.includes(topic)
    ? profile.conversationMemory.topicsCovered
    : [...profile.conversationMemory.topicsCovered, topic];

  return {
    ...profile,
    conversationMemory: {
      ...profile.conversationMemory,
      topicsCovered,
      lastTopic: topic,
    },
    currentSession: {
      ...profile.currentSession,
      topicsThisSession: [...profile.currentSession.topicsThisSession, topic],
    },
  };
}

/**
 * Update current topic and turn counter
 */
export function updateCurrentTopic(
  profile: UserProfile,
  topic: string
): UserProfile {
  const isNewTopic = profile.currentSession.currentTopic !== topic;

  return {
    ...profile,
    currentSession: {
      ...profile.currentSession,
      currentTopic: topic,
      turnsOnCurrentTopic: isNewTopic ? 1 : profile.currentSession.turnsOnCurrentTopic + 1,
      turnCount: profile.currentSession.turnCount + 1,
    },
  };
}

/**
 * Increment turn counter
 */
export function incrementTurnCount(profile: UserProfile): UserProfile {
  return {
    ...profile,
    currentSession: {
      ...profile.currentSession,
      turnCount: profile.currentSession.turnCount + 1,
    },
  };
}

/**
 * Update conversation phase
 */
export function updateConversationPhase(
  profile: UserProfile,
  phase: CurrentSession["currentPhase"]
): UserProfile {
  return {
    ...profile,
    currentSession: {
      ...profile.currentSession,
      currentPhase: phase,
    },
  };
}

/**
 * Increment off-topic attempt counter
 */
export function incrementOffTopicAttempts(profile: UserProfile): UserProfile {
  return {
    ...profile,
    currentSession: {
      ...profile.currentSession,
      offTopicAttempts: profile.currentSession.offTopicAttempts + 1,
    },
  };
}

/**
 * Get recent personal facts (last 5)
 */
export function getRecentPersonalFacts(profile: UserProfile, limit: number = 5): PersonalFact[] {
  return profile.conversationMemory.personalFacts
    .slice(-limit)
    .reverse();
}

/**
 * Get top preferred topics
 */
export function getTopPreferredTopics(profile: UserProfile, limit: number = 3): string[] {
  return profile.conversationMemory.userPreferences
    .filter((p) => p.engagementScore >= 7)
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, limit)
    .map((p) => p.topic);
}
