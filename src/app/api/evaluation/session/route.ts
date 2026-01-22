import { NextRequest, NextResponse } from 'next/server';
import { evaluateConversation } from '@/lib/services/evaluation';

export async function POST(request: NextRequest) {
  try {
    const { transcript, conversationHistory } = await request.json();

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    // Call the isolated evaluator module
    const evaluation = await evaluateConversation(transcript);

    return NextResponse.json({
      success: true,
      evaluation
    });
  } catch (error) {
    console.error('Error evaluating session:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate session' },
      { status: 500 }
    );
  }
}
