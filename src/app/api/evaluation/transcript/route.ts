import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TranscriptMessage {
  speaker: 'user' | 'ai';
  text: string;
  timestamp?: string;
}

interface Correction {
  messageIndex: number;
  original: string;
  corrected: string;
  type: 'grammar' | 'vocabulary' | 'phrasing' | 'pronunciation';
  explanation: string;
  severity: 'minor' | 'moderate' | 'major';
}

/**
 * POST /api/evaluation/transcript
 * Provides detailed transcript review with corrections and suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Invalid transcript format' },
        { status: 400 }
      );
    }

    // Extract only user messages for analysis
    const userMessages = transcript
      .filter((msg: TranscriptMessage) => msg.speaker === 'user')
      .map((msg: TranscriptMessage, idx: number) => ({
        index: idx,
        text: msg.text,
      }));

    if (userMessages.length === 0) {
      return NextResponse.json({
        corrections: [],
        overallFeedback: 'No user messages to analyze.',
      });
    }

    // Build analysis prompt
    const prompt = `You are an expert English teacher analyzing ESL student speech. Review this conversation transcript and provide detailed, constructive feedback.

Student messages:
${userMessages.map((msg, i) => `[${i}] ${msg.text}`).join('\n')}

Analyze each message and identify:
1. Grammar errors (subject-verb agreement, tense, articles, prepositions, word order)
2. Vocabulary improvements (more natural or advanced word choices)
3. Phrasing issues (awkward expressions, better idiomatic alternatives)
4. Potential pronunciation concerns (based on common ESL patterns)

For EACH issue found, provide:
- messageIndex (which message number)
- original (the problematic text)
- corrected (the improved version)
- type (grammar/vocabulary/phrasing/pronunciation)
- explanation (brief, encouraging explanation)
- severity (minor/moderate/major)

IMPORTANT:
- Only flag actual errors or significant improvements
- Be encouraging and constructive
- Don't flag every small thing - focus on learning opportunities
- If a message is perfect, don't force corrections

Respond in JSON format:
{
  "corrections": [
    {
      "messageIndex": 0,
      "original": "I go to store yesterday",
      "corrected": "I went to the store yesterday",
      "type": "grammar",
      "explanation": "Use past tense 'went' and add article 'the' before 'store'",
      "severity": "major"
    }
  ],
  "overallFeedback": "Brief positive summary with 1-2 key suggestions"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const analysisText = completion.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(analysisText);

    return NextResponse.json(
      {
        corrections: analysis.corrections || [],
        overallFeedback: analysis.overallFeedback || 'Keep practicing!',
        analyzedMessages: userMessages.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[/api/evaluation/transcript] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze transcript' },
      { status: 500 }
    );
  }
}
