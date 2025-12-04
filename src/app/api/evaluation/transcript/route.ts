import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/evaluation/transcript
 * 
 * This endpoint will provide detailed transcript review with grammar corrections,
 * vocabulary suggestions, and pronunciation tips for the post-session feedback page.
 * 
 * TODO: Implement this endpoint for Phase 2 (after backend reorganization)
 * 
 * Expected input:
 * {
 *   transcript: Array<{speaker: 'user' | 'assistant', text: string, timestamp?: number}>
 * }
 * 
 * Expected output:
 * {
 *   corrections: Array<{
 *     original: string,
 *     corrected: string,
 *     type: 'grammar' | 'vocabulary' | 'pronunciation',
 *     explanation: string
 *   }>,
 *   suggestions: {
 *     vocabulary: string[],
 *     phraseImprovement: string[]
 *   }
 * }
 */

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Transcript review endpoint not yet implemented. Coming in Phase 2.' },
    { status: 501 }
  );
}
