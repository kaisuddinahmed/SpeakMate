import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

export async function POST(req: NextRequest) {
  try {
    const { messages, userName } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    // Extract system prompt from client request if present, or fallback
    const systemMessage = messages.find((m: any) => m.role === 'system');
    const systemPrompt = systemMessage ? systemMessage.content : 'You are SpeakMate, a friendly conversation partner.';

    // Filter history to remove system prompt (we'll re-add it cleanly) and normalize
    const conversationHistory = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    console.log('[API] Calling Groq (Llama 3.3)...');

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 150, // Short, conversational responses
    });

    const aiMessage = response.choices[0]?.message?.content || "I didn't quite catch that. Could you say that again?";

    console.log(`[API] Response: "${aiMessage.substring(0, 50)}..."`);

    return NextResponse.json({ message: aiMessage });

  } catch (error: any) {
    console.error('[API] Error:', error);

    return NextResponse.json(
      { error: 'Failed to generate response', details: error.message },
      { status: 500 }
    );
  }
}
