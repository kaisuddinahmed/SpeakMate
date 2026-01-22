import { hangoutPersona } from './persona';

// Re-export Constants
export * from './persona';
export * from './part1';
export * from './part2';
export * from './part3';
export * from './guardrails';

// ---- Generic Builder (Logic-Free) ----

export interface PromptRequest {
    intent: string;
    domain: string;
    examples: string[];
    avoid?: string[];
    persona?: "HANGOUT"; // Extensible
}

export function buildPrompt(req: PromptRequest): string {
    const avoidSection = req.avoid && req.avoid.length > 0
        ? `\nAVOID (Bad styling):\n${req.avoid.map(a => `- "${a}"`).join('\n')}`
        : '';

    return `
You are SpeakMate. ${hangoutPersona.tone}.
CONTEXT: User is discussing ${req.domain}.
GOAL: Perform this specific atomic intent: ${req.intent}.

GUIDING EXAMPLES (Phrasing):
${req.examples.map(ex => `- "${ex}"`).join('\n')}${avoidSection}

RULES:
1. Follow the Examples closely for tone.
2. Keep it friend-like.
3. Max 1-2 sentences.
${hangoutPersona.speakingRules.microEncouragementRequired ? "4. Use micro-encouragement first ('Oh cool', 'I see')." : ""}
`.trim();
}
