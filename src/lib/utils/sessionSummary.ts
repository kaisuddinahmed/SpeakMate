/**
 * Session Summary Utility (V.2 Feature D: "Goldfish Fix")
 * Generates periodic summaries of conversation to keep AI context-aware
 */

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for session summaries (per userId)
const summaryCache: Map<string, string> = new Map();

/**
 * Check if we should generate a new summary (every 5 turns)
 */
export function shouldGenerateSummary(turnCount: number): boolean {
    return turnCount > 0 && turnCount % 5 === 0;
}

/**
 * Generate a 1-sentence summary of the conversation so far
 */
export async function generateSummary(
    messages: { role: string; content: string }[],
    userId: string
): Promise<string> {
    if (messages.length < 5) {
        return ""; // Not enough context to summarize
    }

    try {
        // Extract last 10 messages for context
        const recentMessages = messages.slice(-10);
        const conversationText = recentMessages
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a summarization assistant. Summarize the following conversation in exactly ONE sentence. Focus on the main topics discussed and any personal facts learned about the user. Be concise.",
                },
                {
                    role: "user",
                    content: conversationText,
                },
            ],
            temperature: 0.3,
            max_tokens: 100,
        });

        const summary = completion.choices[0]?.message?.content?.trim() || "";

        // Cache the summary
        if (summary) {
            summaryCache.set(userId, summary);
        }

        console.log(`[SessionSummary] Generated: ${summary}`);
        return summary;
    } catch (error) {
        console.error("[SessionSummary] Generation failed:", error);
        return summaryCache.get(userId) || ""; // Return cached if generation fails
    }
}

/**
 * Get the cached summary for a user
 */
export function getCachedSummary(userId: string): string {
    return summaryCache.get(userId) || "";
}

/**
 * Build the summary context instruction for injection
 */
export function buildSummaryContext(userId: string): string {
    const summary = summaryCache.get(userId);
    if (!summary) return "";

    return `\n\n[CONVERSATION CONTEXT]: Here's a summary of what you've discussed so far: "${summary}". Use this to maintain continuity and reference earlier topics naturally.`;
}
