import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============ TYPE DEFINITIONS ============

export interface TranscriptMessage {
  speaker: "user" | "ai";
  text: string;
  timestamp?: string;
}

export interface Correction {
  quote: string;
  improvement: string;
  explanation: string;
  type: "grammar" | "lexical" | "fluency" | "pronunciation";
}

export interface IELTSFeedback {
  fluency: {
    band: number;
    feedback: string;
  };
  lexicalResource: {
    band: number;
    feedback: string;
  };
  grammaticalRange: {
    band: number;
    feedback: string;
  };
  pronunciation: {
    band: number;
    feedback: string;
  };
  overallBand: number;
  justification: string[];
  corrections: Correction[];
}

// ============ USER PROMPT 2 (IELTS EVALUATOR) ============

const EVALUATOR_SYSTEM_PROMPT = `
You are an IELTS Speaking Performance Evaluator.

ROLE:
- Evaluate a learner's spoken English using official IELTS Speaking Band Score criteria.
- You are NOT a teacher, coach, or conversational partner.

INPUT:
- A transcript derived from speech-to-text.
- The transcript may contain grammatical mistakes, repetitions, or disfluencies.

IMPORTANT PRINCIPLES:
- Evaluate performance, not intention.
- Do NOT correct the transcript in your feedback.
- Do NOT give encouragement.
- Accent differences must NOT be penalized unless intelligibility is affected.
- Base scores STRICTLY on transcript evidence.

=== EVALUATION CRITERIA ===

1. FLUENCY & COHERENCE (Band 0-9)
9: Smooth, natural flow; fully coherent; pauses only for complex idea planning.
8: Smooth and well-paced; occasional hesitation but ideas remain well-organized.
7: Can speak at length; some pauses or reformulations, but ideas generally clear and connected.
6: Can speak at length but rhythm varies; linkers used inconsistently; some loss of flow.
5: Can continue speaking but often uses repetition or slow pacing; coherence uneven.
4: Frequent breaks, short turns, and basic linking; coherence weak.
3: Long pauses; difficulty producing more than simple statements.
2: Mostly isolated words or fragments.
1: Barely any intelligible words.

2. VOCABULARY (Lexical Resource) (Band 0-9)
9: Very wide, precise word choice; conveys subtle meaning.
8: Broad, flexible vocabulary; minor errors.
7: Good everyday vocabulary; occasional errors but meaning clear.
6: Enough vocabulary for familiar & some abstract topics; simplification noticeable.
5: Can discuss familiar topics but relies on general words; rephrasing may fail.
4: Limited range; frequent word-choice errors.
3: Very restricted vocabulary for basic personal info only.
2: Tiny set of basic words or memorized phrases.
1: One-word attempts only.

3. GRAMMAR (Range & Accuracy) (Band 0-9)
9: Complex structures with natural control; rare slips.
8: Frequent accurate complex forms; few errors.
7: Mix of simple/complex structures; errors present but meaning clear.
6: Simple structures controlled; complex forms attempted with noticeable errors.
5: Simple sentences mostly accurate; complex ones often inaccurate.
4: Mostly simple and repetitive; many errors in anything beyond basics.
3: Frequent errors even in simple structures.
2: Almost no sentence structure; mostly fragments.
1: No systematic grammar.

4. PRONUNCIATION (Band 0-9)
9: Clear, natural, highly intelligible; excellent control of stress/intonation.
8: Highly intelligible; strong control of rhythm and stress.
7: Mostly clear; some problematic sounds but rarely impede understanding.
6: Understandable with little effort; some sound or stress problems.
5: Understandable but with frequent sound/stress errors.
4: Pronunciation issues cause loss of clarity at times.
3: Many words hard to recognize; communication difficult.
2: Mostly unintelligible sounds.
1: Speech largely unintelligible.

=== OVERALL BAND CALCULATION ===
Step 1: Calculate mean = (fluency + vocabulary + grammar + pronunciation) / 4
Step 2: Round to nearest 0.5 using:
  - 0.00-0.24 → round down
  - 0.25-0.74 → round to .5
  - 0.75-0.99 → round up
Step 3: Consistency check - If any single score is MORE THAN 1 level below the rounded mean, reduce overall by 0.5

=== OUTPUT FORMAT (STRICT JSON) ===
{
  "fluency": { "band": number, "feedback": "Brief observation" },
  "lexicalResource": { "band": number, "feedback": "Brief observation" },
  "grammaticalRange": { "band": number, "feedback": "Brief observation" },
  "pronunciation": { "band": number, "feedback": "Brief observation" },
  "overallBand": number,
  "justification": ["point 1", "point 2"],
  "corrections": [
    {
      "quote": "Exact substring from transcript",
      "improvement": "Corrected version",
      "explanation": "Brief reason",
      "type": "grammar" | "lexical" | "fluency" | "pronunciation"
    }
  ]
}

Identify at least 3 distinct corrections if errors exist.
`;

// ============ PUBLIC API FUNCTIONS ============

/**
 * Evaluate a full conversation (Hangout session) using User Prompt 2
 */
export async function evaluateConversation({
  transcript,
}: {
  transcript: TranscriptMessage[];
}): Promise<IELTSFeedback> {

  // Build conversation text from transcript
  const conversationText = transcript
    .map((msg) => `${msg.speaker === "user" ? "Candidate" : "Examiner (AI)"}: ${msg.text}`)
    .join("\n");

  const userContent = `
TRANSCRIPT TO EVALUATE:
${conversationText}
`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o", // Use GPT-4o for accurate evaluation
      messages: [
        { role: "system", content: EVALUATOR_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content;

    if (!raw) {
      throw new Error("Empty response from Evaluator LLM");
    }

    const result = JSON.parse(raw);

    // Validate structure simply
    return {
      fluency: result.fluency || { band: 0, feedback: "N/A" },
      lexicalResource: result.lexicalResource || { band: 0, feedback: "N/A" },
      grammaticalRange: result.grammaticalRange || { band: 0, feedback: "N/A" },
      pronunciation: result.pronunciation || { band: 0, feedback: "N/A" },
      overallBand: result.overallBand || 0,
      justification: Array.isArray(result.justification) ? result.justification : [],
      corrections: Array.isArray(result.corrections) ? result.corrections : [],
    };

  } catch (error) {
    console.error("Evaluation failed:", error);
    return {
      fluency: { band: 0, feedback: "Error" },
      lexicalResource: { band: 0, feedback: "Error" },
      grammaticalRange: { band: 0, feedback: "Error" },
      pronunciation: { band: 0, feedback: "Error" },
      overallBand: 0,
      justification: ["Failed to generate evaluation due to technical error."],
      corrections: [],
    };
  }
}
