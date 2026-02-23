import { NextRequest, NextResponse } from 'next/server';

// Using Deepgram Aura TTS (high quality, low latency, American voice)
// Voice: aura-2-iris-en (Calm, energetic, friendly)

export async function GET(req: NextRequest) {
    try {
        const text = req.nextUrl.searchParams.get('text');

        if (!text) {
            return NextResponse.json(
                { error: 'Missing text parameter' },
                { status: 400 }
            );
        }

        // Call Deepgram Aura TTS
        const response = await fetch(
            'https://api.deepgram.com/v1/speak?model=aura-2-iris-en',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[TTS API] Deepgram Error: ${response.status} - ${errText}`);
            throw new Error(`Deepgram TTS failed: ${response.status}`);
        }

        // Stream the audio response
        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

    } catch (error: any) {
        console.error('[TTS API] Error:', error);
        return NextResponse.json(
            { error: 'TTS generation failed', details: error.message },
            { status: 500 }
        );
    }
}
