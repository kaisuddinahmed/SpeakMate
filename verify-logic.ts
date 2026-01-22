
/**
 * Verification Script
 * specific tests for Phase 2/3 features
 */

import { extractPersonalFacts } from "./src/lib/utils/factExtractor";
import { getContextualTransition } from "./src/lib/utils/advancedTransitions";
import { updateStreak, getStreakMotivation, getDynamicGreeting } from "./src/lib/utils/streakTracking";

async function runTests() {
    console.log("🚀 Starting Logic Verification...\n");

    // TEST 1: Fact Extraction
    console.log("=== TEST 1: Fact Extraction ===");
    const testMessages = [
        "I'm a software engineer at Google",
        "I have a dog named Max",
        "I live in New York"
    ];

    let factCount = 0;
    testMessages.forEach((msg) => {
        const facts = extractPersonalFacts(msg, "personal");
        if (facts.length > 0) {
            console.log(`✅ Extracted from "${msg}": ${facts.map(f => f.fact).join(", ")}`);
            factCount++;
        } else {
            console.log(`❌ Failed to extract from: "${msg}"`);
        }
    });

    if (factCount === 3) console.log("✨ Fact extraction working correctly!");
    console.log("");

    // TEST 2: Transitions
    console.log("=== TEST 2: Contextual Transitions ===");
    const transition = getContextualTransition({
        fromTopic: "work_study",
        toTopic: "hobbies"
    });
    console.log(`Work -> Hobbies transition: "${transition}"`);
    if (transition) console.log("✨ Transition generation working!");
    console.log("");

    // TEST 3: Streaks
    console.log("=== TEST 3: Streak Tracking ===");
    const streak = {
        currentStreak: 5,
        longestStreak: 5,
        lastPracticeDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (YYYY-MM-DD)
        totalDaysPracticed: 10,
        streakMilestones: []
    };

    const updatedStreak = updateStreak(streak);
    console.log(`Current streak: ${streak.currentStreak} -> Updated: ${updatedStreak.currentStreak}`);

    if (updatedStreak.currentStreak === 6) {
        console.log("✨ Streak incremented correctly!");
    } else {
        console.log("❌ Streak logic issue");
    }

    const greeting = getDynamicGreeting("Alex", updatedStreak, 14); // 2 PM
    console.log(`Greeting: "${greeting}"`);

    console.log("\n✅ VERIFICATION COMPLETE");
}

runTests().catch(console.error);
