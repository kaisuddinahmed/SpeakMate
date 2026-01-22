/**
 * Streak Tracking System
 * Manages daily practice streaks and motivation
 */

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  totalDaysPracticed: number;
  streakMilestones: number[]; // [3, 7, 14, 30, 60, 90, etc.]
}

const STORAGE_KEY = "speakmate_streak";

/**
 * Load streak data from localStorage
 */
export function loadStreakData(): StreakData {
  if (typeof window === "undefined") {
    return createDefaultStreak();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed || createDefaultStreak();
    } catch (error) {
      console.error("Failed to parse streak data:", error);
      return createDefaultStreak();
    }
  }

  return createDefaultStreak();
}

/**
 * Save streak data to localStorage
 */
export function saveStreakData(streak: StreakData): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(streak));
  } catch (error) {
    console.error("Failed to save streak data:", error);
  }
}

/**
 * Create default streak data
 */
function createDefaultStreak(): StreakData {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    totalDaysPracticed: 0,
    streakMilestones: [],
  };
}

/**
 * Update streak based on new practice session
 */
export function updateStreak(streak: StreakData | null): StreakData {
  const safeStreak = streak || createDefaultStreak();
  const today = getDateString(new Date());
  const lastDate = safeStreak.lastPracticeDate;

  // First practice ever
  if (!lastDate) {
    return {
      ...safeStreak,
      currentStreak: 1,
      longestStreak: 1,
      lastPracticeDate: today,
      totalDaysPracticed: 1,
    };
  }

  // Already practiced today
  if (lastDate === today) {
    return safeStreak; // No change
  }

  // Practiced yesterday (streak continues)
  const yesterday = getDateString(addDays(new Date(), -1));
  if (lastDate === yesterday) {
    const newStreak = safeStreak.currentStreak + 1;
    const newMilestones = [...(safeStreak.streakMilestones || [])];

    // Check for milestone achievements
    const milestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];
    for (const milestone of milestones) {
      if (
        newStreak >= milestone &&
        !newMilestones.includes(milestone)
      ) {
        newMilestones.push(milestone);
      }
    }

    return {
      ...safeStreak,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, safeStreak.longestStreak),
      lastPracticeDate: today,
      totalDaysPracticed: safeStreak.totalDaysPracticed + 1,
      streakMilestones: newMilestones,
    };
  }

  // Streak broken (missed a day)
  return {
    ...safeStreak,
    currentStreak: 1,
    lastPracticeDate: today,
    totalDaysPracticed: safeStreak.totalDaysPracticed + 1,
  };
}

/**
 * Get days since last practice
 */
export function getDaysSinceLastPractice(streak: StreakData): number {
  if (!streak.lastPracticeDate) return 0;

  const today = new Date();
  const lastDate = new Date(streak.lastPracticeDate);
  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if user practiced today
 */
export function hasPracticedToday(streak: StreakData): boolean {
  if (!streak.lastPracticeDate) return false;
  const today = getDateString(new Date());
  return streak.lastPracticeDate === today;
}

/**
 * Get streak status for display
 */
export function getStreakStatus(
  streak: StreakData
): "active" | "at_risk" | "broken" {
  const daysSince = getDaysSinceLastPractice(streak);

  if (daysSince === 0) return "active"; // Practiced today
  if (daysSince === 1) return "at_risk"; // Last practice was yesterday
  return "broken"; // Missed 2+ days
}

/**
 * Get motivational message based on streak
 */
export function getStreakMotivation(streak: StreakData): string {
  const status = getStreakStatus(streak);
  const currentStreak = streak.currentStreak;

  // Streak broken
  if (status === "broken") {
    if (streak.longestStreak > 7) {
      return `Welcome back! You had a ${streak.longestStreak}-day streak before. Ready to start fresh?`;
    }
    return "Great to see you! Every conversation counts—let's get started!";
  }

  // At risk (practiced yesterday, not today)
  if (status === "at_risk") {
    if (currentStreak >= 7) {
      return `Don't break your ${currentStreak}-day streak! Keep the momentum going! 🔥`;
    }
    if (currentStreak >= 3) {
      return `You're on a ${currentStreak}-day roll! Let's keep it going!`;
    }
    return "You practiced yesterday—let's keep the streak alive!";
  }

  // Active (practiced today)
  if (currentStreak === 1) {
    return "Great start! Come back tomorrow to build a streak! 🌟";
  }

  if (currentStreak === 3) {
    return "3 days in a row! You're building a great habit! 🎉";
  }

  if (currentStreak === 7) {
    return "One week streak! That's amazing dedication! 🔥";
  }

  if (currentStreak === 14) {
    return "Two weeks! You're on fire! Keep it up! 🚀";
  }

  if (currentStreak === 30) {
    return "30-day streak! You're a conversation champion! 👑";
  }

  if (currentStreak >= 90) {
    return `${currentStreak} days! You're absolutely crushing it! 💪`;
  }

  if (currentStreak >= 60) {
    return `${currentStreak}-day streak! Your dedication is inspiring! ✨`;
  }

  if (currentStreak >= 21) {
    return `${currentStreak} days straight! You've built an incredible habit! 🌈`;
  }

  if (currentStreak >= 7) {
    return `${currentStreak}-day streak! You're doing fantastic! 💫`;
  }

  return `${currentStreak}-day streak going strong! 🔥`;
}

/**
 * Get dynamic greeting based on time GAP since last session (V3 Architecture)
 * 
 * Time Gap Scenarios:
 * - > 7 days: "Long Time" - warm welcome back
 * - 2-6 days: "Few Days" - casual catch-up
 * - 12-48 hrs: "Next Day" - routine building
 * - 3-12 hrs: "Later Today" - casual check-in
 * - < 3 hrs: "Just Now" - seamless continuation
 */
export function getDynamicGreeting(
  userName: string,
  streak: StreakData,
  hour: number = new Date().getHours()
): string {
  // Use nickname if provided
  const nickname = userName && userName.trim() && userName !== "friend"
    ? userName.trim()
    : "";

  // Calculate time gap since last practice
  const lastPractice = streak.lastPracticeDate
    ? new Date(streak.lastPracticeDate).getTime()
    : 0;
  const now = Date.now();
  const hoursGap = lastPractice ? (now - lastPractice) / (1000 * 60 * 60) : Infinity;

  // Time-gap based greetings (V3 Architecture Spec)
  if (hoursGap > 168) { // > 7 days
    return nickname
      ? `Hey ${nickname}! It's been a while, so good to hear your voice again! How have you been?`
      : "Hey! It's been a while, so good to hear your voice again! How have you been?";
  }

  if (hoursGap > 48) { // 2-6 days
    return nickname
      ? `Hey ${nickname}! Nice to see you back. How has your week been going?`
      : "Hey! Nice to see you back. How has your week been going?";
  }

  if (hoursGap > 12) { // 12-48 hrs (Next Day)
    return nickname
      ? `Hi ${nickname}! Ready for our daily chat? How was your day?`
      : "Hi! Ready for our daily chat? How was your day?";
  }

  if (hoursGap > 3) { // 3-12 hrs (Later Today)
    return nickname
      ? `Hey again ${nickname}! How's the rest of your day turning out?`
      : "Hey again! How's the rest of your day turning out?";
  }

  if (hoursGap > 0) { // < 3 hrs (Just Now)
    return nickname
      ? `Welcome back ${nickname}! Did you want to carry on with what we were saying?`
      : "Welcome back! Did you want to carry on with what we were saying?";
  }

  // First time or no previous data - use simple greeting
  return nickname
    ? `Hi ${nickname}! How are you doing today?`
    : "Hi! How are you doing today?";
}

/**
 * Check if milestone was just achieved
 */
export function getNewMilestone(
  oldStreak: StreakData,
  newStreak: StreakData
): number | null {
  const oldMilestones = oldStreak.streakMilestones;
  const newMilestones = newStreak.streakMilestones;

  const newlyAchieved = newMilestones.filter(
    (m) => !oldMilestones.includes(m)
  );

  return newlyAchieved.length > 0 ? Math.max(...newlyAchieved) : null;
}

/**
 * Get milestone celebration message
 */
export function getMilestoneCelebration(milestone: number): string {
  const celebrations: Record<number, string> = {
    3: "🎉 3-Day Milestone! You're building a habit!",
    7: "🔥 One Week Streak! Amazing dedication!",
    14: "🌟 Two Weeks! You're on a roll!",
    21: "✨ 21 Days! You've formed a strong habit!",
    30: "🏆 30-Day Champion! Incredible commitment!",
    60: "💎 60 Days! Your consistency is diamond-level!",
    90: "👑 90-Day Legend! You're unstoppable!",
    180: "🚀 Half a Year! Extraordinary achievement!",
    365: "🎊 ONE YEAR STREAK! You're a SpeakMate legend!",
  };

  return celebrations[milestone] || `${milestone}-Day Milestone! Keep going!`;
}

/**
 * Helper: Get date string in YYYY-MM-DD format
 */
function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Helper: Add days to date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
