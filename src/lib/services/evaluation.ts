import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // Ideally server-side only
});

// ============ TYPES ============

export interface TranscriptItem {
    id?: string; // Add id for linking
    speaker: "user" | "ai";
    text: string;
    timestamp?: number; // Changed to number for math operations
    isPartial?: boolean;
}

export interface EvaluationMetrics {
    totalWords: number;
    uniqueWords: number;
    lexicalDiversity: number;
    hesitationMarkers: number;
    discourseMarkers: number;
    sentenceCount: number;
    avgSentenceLength: number;
    repetitionCount: number;
    complexSentences: number;
    simpleConnectors: number;
    speechRate?: number; // words per minute
}

export interface DetailedFeedback {
    whatYouDidWell: {
        fluency: string | null;
        vocabulary: string | null;
        grammar: string | null;
        pronunciation: string | null;
    };
    whatToImproveNext: {
        fluency: string | null;
        vocabulary: string | null;
        grammar: string | null;
        pronunciation: string | null;
    };
    recommendedPractice: string; // Keep as string to match page.tsx
    errorPatterns?: string[];
}

export interface Correction {
    id?: string;
    quote: string;
    correction: string;
    criterion: 'Grammar' | 'Vocabulary' | 'Fluency' | 'Pronunciation';
    severity: 'MAJOR' | 'MINOR' | 'CRITICAL'; // Added CRITICAL
    explanation: string;
    occurrences?: number;
}

export interface EvaluationResult {
    overallProficiency: number;
    fluency: number;
    vocabulary: number;
    grammar: number;
    pronunciation: number; // Keep non-optional to match existing UI
    briefFeedback: string;
    detailedFeedback: DetailedFeedback;
    metrics: {
        totalWords: number;
        vocabularyDiversity: number;
        hesitationRate: number;
        discourseMarkersUsed: number;
        avgSentenceLength: number;
        complexSentences: number;
        speechRate?: number;
    };
    improvementSuggestions: string[];
    corrections: Correction[];
    correctionSummary?: {
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
    };
}

// ============ MAIN FUNCTION ============

export async function evaluateConversation(transcript: TranscriptItem[]): Promise<EvaluationResult> {
    // 1. Quantitative Analysis (Improved)
    const metrics = analyzeTranscriptMetrics(transcript);

    // 2. Build Text Context
    const conversationText = transcript
        .map((msg) => `${msg.speaker === 'user' ? 'Student' : 'AI Coach'}: ${msg.text}`)
        .join('\n');

    // 3. Define Rubric (IELTS Aligned)
    const conversationRubric = `
You are an IELTS Speaking Performance Evaluator. Evaluate ONLY the STUDENT's performance.

Objective Metrics from Student's Speech:
- Total words spoken: ${metrics.totalWords}
- Unique vocabulary: ${metrics.uniqueWords} words (diversity: ${(metrics.lexicalDiversity * 100).toFixed(1)}%)
- Hesitation markers (um, uh...): ${metrics.hesitationMarkers}
- Discourse markers: ${metrics.discourseMarkers}
- Complex sentences: ${metrics.complexSentences}

=== EVALUATION CRITERIA (Band 0-9, 0.5 increments) ===

1. FLUENCY & COHERENCE
9: Smooth, natural flow; pauses only for complex idea planning.
7: Speaks at length; some pauses, ideas generally connected.
5: Uses repetition or slow pacing; coherence uneven.
3: Long pauses; difficulty producing more than simple statements.

2. VOCABULARY
9: Very wide, precise word choice; conveys subtle meaning.
7: Good everyday vocabulary; occasional errors but meaning clear.
5: Relies on general words; rephrasing may fail.
3: Very restricted vocabulary for basic info only.

3. GRAMMAR
9: Complex structures with natural control; rare slips.
7: Mix of simple/complex; errors present but meaning clear.
5: Simple sentences mostly accurate; complex ones inaccurate.
3: Frequent errors even in simple structures.

4. PRONUNCIATION (Infer from transcript clarity)
9: Clear, highly intelligible.
7: Mostly clear; rarely impedes understanding.
5: Understandable but with frequent errors.
3: Many words hard to recognize.

=== SCORING RULES ===
1. Score each criterion independently (0-9, 0.5 increments).
2. Overall = average of 4 criteria, rounded to nearest 0.5.
3. CONSISTENCY CHECK: If any score is >1.0 below the mean, reduce overall by 0.5.

=== DETAILED FEEDBACK RULES ===
Structure your feedback by the 4 criteria.
- "whatYouDidWell": For each criterion, provide a specific compliment. If none, set null.
- "whatToImproveNext": For each criterion, provide specific improvement area. If none, set null.
- "recommendedPractice": Provide ONE actionable exercise targeting the weakest area.

=== CORRECTIONS RULES ===
For each STUDENT error, create a correction entry.
- "quote": Exact text from student's speech containing the error
- "correction": The corrected version
- "criterion": One of [Grammar], [Vocabulary], [Fluency], [Pronunciation]
- "severity": CRITICAL (changes meaning) | MAJOR (affects band) | MINOR (slight error)
- "explanation": Brief reason

OUTPUT (STRICT JSON):
{
  "fluency": <number>,
  "vocabulary": <number>,
  "grammar": <number>,
  "pronunciation": <number>,
  "briefFeedback": "<1-2 encouraging sentences>",
  "detailedFeedback": {
    "whatYouDidWell": { "fluency": "...", "vocabulary": "...", "grammar": null, "pronunciation": "..." },
    "whatToImproveNext": { "fluency": null, "vocabulary": "...", "grammar": "...", "pronunciation": null },
    "recommendedPractice": "<Actionable exercise>"
  },
  "corrections": [
    {
      "quote": "I buyed apples",
      "correction": "I bought apples",
      "criterion": "Grammar",
      "severity": "MAJOR",
      "explanation": "Irregular past tense"
    }
  ]
}
`;

    // 4. Call LLM (OpenAI)
    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: conversationRubric },
                { role: "user", content: `Conversation transcript:\n${conversationText}` }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const raw = completion.choices[0].message.content;
        if (!raw) throw new Error("Empty response from AI");

        const parsed = JSON.parse(raw);

        // 5. Process Corrections (Deduplicate & Clean)
        const processedCorrections = processCorrections(parsed.corrections || [], transcript);

        // 6. Generate Logic-Based Suggestions
        const logicSuggestions = generateSmartSuggestions({
            fluency: parsed.fluency,
            vocabulary: parsed.vocabulary,
            grammar: parsed.grammar,
            pronunciation: parsed.pronunciation
        }, metrics, processedCorrections);

        // 7. Calculate Final Scores (Consistency Check)
        const roundToHalf = (num: number) => Math.round(num * 2) / 2;
        const fluencyScore = roundToHalf(parsed.fluency || 0);
        const vocabularyScore = roundToHalf(parsed.vocabulary || 0);
        const grammarScore = roundToHalf(parsed.grammar || 0);
        const pronunciationScore = roundToHalf(parsed.pronunciation || 0);

        const rawMean = (fluencyScore + vocabularyScore + grammarScore + pronunciationScore) / 4;
        let overallBand = roundToHalf(rawMean);

        // Consistency Check
        const scores = [fluencyScore, vocabularyScore, grammarScore, pronunciationScore];
        const hasInconsistency = scores.some(score => score < overallBand - 1);
        if (hasInconsistency) {
            overallBand = Math.max(0, overallBand - 0.5);
        }

        // 8. Return Enriched Result
        return {
            overallProficiency: overallBand,
            fluency: fluencyScore,
            vocabulary: vocabularyScore,
            grammar: grammarScore,
            pronunciation: pronunciationScore,
            briefFeedback: parsed.briefFeedback || "Good effort!",
            detailedFeedback: {
                ...(parsed.detailedFeedback || {
                    whatYouDidWell: { fluency: null, vocabulary: null, grammar: null, pronunciation: null },
                    whatToImproveNext: { fluency: null, vocabulary: null, grammar: null, pronunciation: null },
                    recommendedPractice: "Keep practicing!"
                }),
                errorPatterns: identifyErrorPatterns(processedCorrections)
            },
            metrics: {
                totalWords: metrics.totalWords,
                vocabularyDiversity: parseFloat((metrics.lexicalDiversity * 100).toFixed(1)),
                hesitationRate: metrics.totalWords > 0 ? parseFloat(((metrics.hesitationMarkers / metrics.totalWords) * 100).toFixed(1)) : 0,
                discourseMarkersUsed: metrics.discourseMarkers,
                avgSentenceLength: parseFloat(metrics.avgSentenceLength.toFixed(1)),
                complexSentences: metrics.complexSentences,
                speechRate: metrics.speechRate
            },
            improvementSuggestions: logicSuggestions,
            corrections: processedCorrections,
            correctionSummary: buildCorrectionSummary(processedCorrections)
        };

    } catch (err) {
        console.error("Evaluation Error:", err);
        throw err;
    }
}

// ============ METRIC HELPERS (Improved) ============

function analyzeTranscriptMetrics(transcript: TranscriptItem[]): EvaluationMetrics {
    const userMessages = transcript.filter(msg => msg.speaker === 'user');
    const studentText = userMessages.map(msg => msg.text).join(' ');

    if (!studentText.trim()) {
        return createEmptyMetrics();
    }

    const words = studentText.match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const sentences = studentText.match(/[.!?]+/g) || ['.'];

    // Calculate speech rate
    let speechRate: number | undefined;
    if (userMessages.length > 1 && userMessages[0].timestamp && userMessages[userMessages.length - 1].timestamp) {
        const durationMs = userMessages[userMessages.length - 1].timestamp! - userMessages[0].timestamp!;
        const durationMin = durationMs / 60000;
        speechRate = durationMin > 0 ? Math.round(words.length / durationMin) : undefined;
    }

    return {
        totalWords: words.length,
        uniqueWords: uniqueWords.size,
        lexicalDiversity: words.length > 0 ? uniqueWords.size / words.length : 0,
        hesitationMarkers: countHesitationMarkers(studentText),
        discourseMarkers: countDiscourseMarkers(studentText),
        sentenceCount: sentences.length,
        avgSentenceLength: words.length / sentences.length,
        repetitionCount: detectRepetitions(studentText),
        complexSentences: countComplexSentences(studentText),
        simpleConnectors: countSimpleConnectors(studentText),
        speechRate
    };
}

function createEmptyMetrics(): EvaluationMetrics {
    return {
        totalWords: 0, uniqueWords: 0, lexicalDiversity: 0, hesitationMarkers: 0, discourseMarkers: 0,
        sentenceCount: 0, avgSentenceLength: 0, repetitionCount: 0, complexSentences: 0, simpleConnectors: 0
    };
}

function countHesitationMarkers(text: string): number {
    const markers = ['um', 'uh', 'er', 'ah', 'hmm', 'well', 'like', 'you know', 'i mean'];
    let count = 0;
    const lowerText = text.toLowerCase();
    markers.forEach(marker => {
        const regex = new RegExp(`\\b${marker}\\b`, 'g');
        const matches = lowerText.match(regex);
        count += matches ? matches.length : 0;
    });
    return count;
}

function countDiscourseMarkers(text: string): number {
    const markers = [
        'firstly', 'secondly', 'finally', 'moreover', 'furthermore',
        'however', 'therefore', 'in addition', 'for example', 'for instance',
        'in conclusion', 'to sum up', 'on the other hand', 'nevertheless', 'actually'
    ];
    let count = 0;
    markers.forEach(marker => {
        if (new RegExp(`\\b${marker}\\b`, 'i').test(text)) count++;
    });
    return count;
}

function detectRepetitions(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    for (let i = 1; i < words.length; i++) {
        if (words[i] === words[i - 1] && words[i].length > 3) count++;
    }
    return count;
}

function countComplexSentences(text: string): number {
    const patterns = [
        /\b(because|although|while|when|if|unless|since|though|whereas)\b/gi,
        /\b(who|which|that|whose|where)\b/gi
    ];
    let count = 0;
    patterns.forEach(pattern => {
        const matches = text.match(pattern);
        count += matches ? matches.length : 0;
    });
    return count;
}

function countSimpleConnectors(text: string): number {
    const connectors = ['and', 'but', 'or', 'so'];
    let count = 0;
    connectors.forEach(conn => {
        const matches = text.match(new RegExp(`\\b${conn}\\b`, 'gi'));
        count += matches ? matches.length : 0;
    });
    return count;
}

// ============ LOGIC & SUGGESTIONS ============

function generateSmartSuggestions(
    scores: { fluency: number, vocabulary: number, grammar: number, pronunciation: number },
    metrics: EvaluationMetrics,
    corrections: Correction[]
): string[] {
    const suggestions: string[] = [];

    // Fluency
    if (scores.fluency < 6.5) {
        if (metrics.hesitationMarkers > metrics.totalWords * 0.05) {
            suggestions.push(`Try to reduce filler words (um, uh) - used ${metrics.hesitationMarkers} times.`);
        }
        if (metrics.avgSentenceLength < 10) {
            suggestions.push(`Extend your sentences by adding 'because', 'although', or 'when' clauses.`);
        }
        if (metrics.discourseMarkers < 2) {
            suggestions.push(`Use linking words like 'however' or 'moreover' to connect ideas smoothly.`);
        }
    }

    // Vocabulary
    const vocabErrors = corrections.filter(c => c.criterion === 'Vocabulary').length;
    if (scores.vocabulary < 6.5 || vocabErrors > 2) {
        if (metrics.lexicalDiversity < 0.5) {
            suggestions.push(`Build vocabulary range - only ${(metrics.lexicalDiversity * 100).toFixed(0)}% of words were unique.`);
        }
    }

    // Grammar
    const grammarErrors = corrections.filter(c => c.criterion === 'Grammar').length;
    if (scores.grammar < 6.5 || grammarErrors > 2) {
        if (metrics.complexSentences < 3 && metrics.totalWords > 50) {
            suggestions.push(`Use more complex sentences with relative clauses (who, which, that).`);
        }
    }

    return suggestions.slice(0, 5);
}

// ============ CORRECTION PROCESSING ============

function processCorrections(corrections: any[], transcript: TranscriptItem[]): Correction[] {
    if (!corrections || corrections.length === 0) return [];

    const uniqueCorrections = new Map<string, Correction>();

    corrections.forEach((corr: any, index: number) => {
        const key = `${corr.criterion}-${corr.correction}`.toLowerCase();

        if (uniqueCorrections.has(key)) {
            const existing = uniqueCorrections.get(key)!;
            existing.occurrences = (existing.occurrences || 1) + 1;
        } else {
            uniqueCorrections.set(key, {
                id: `corr-${index}`,
                quote: corr.quote,
                correction: corr.correction,
                criterion: corr.criterion,
                severity: corr.severity,
                explanation: corr.explanation,
                occurrences: 1
            });
        }
    });

    const severityOrder: Record<string, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2 };
    return Array.from(uniqueCorrections.values())
        .sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2))
        .slice(0, 15);
}

function identifyErrorPatterns(corrections: Correction[]): string[] {
    const patterns: Record<string, number> = {};

    corrections.forEach(corr => {
        const explanation = corr.explanation.toLowerCase();
        if (explanation.includes('subject-verb')) patterns['Subject-Verb Agreement'] = (patterns['Subject-Verb Agreement'] || 0) + 1;
        if (explanation.includes('tense') || explanation.includes('past')) patterns['Verb Tenses'] = (patterns['Verb Tenses'] || 0) + 1;
        if (explanation.includes('article')) patterns['Articles (a/an/the)'] = (patterns['Articles (a/an/the)'] || 0) + 1;
        if (explanation.includes('preposition')) patterns['Prepositions'] = (patterns['Prepositions'] || 0) + 1;
        if (explanation.includes('word choice')) patterns['Word Choice'] = (patterns['Word Choice'] || 0) + 1;
    });

    return Object.entries(patterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern, count]) => `${pattern} (${count}x)`);
}

function buildCorrectionSummary(corrections: Correction[]) {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    corrections.forEach(corr => {
        byType[corr.criterion] = (byType[corr.criterion] || 0) + 1;
        bySeverity[corr.severity] = (bySeverity[corr.severity] || 0) + 1;
    });

    return { total: corrections.length, byType, bySeverity };
}
