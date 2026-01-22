import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    // In a production environment, you should generate a temporary key here
    // using the Deepgram SDK: deepgram.keys.create(...)
    // For this implementation, we will pass the key to the client 
    // to allow direct high-speed connection.
    console.log("Deepgram API Key requested");

    if (!process.env.DEEPGRAM_API_KEY) {
        return NextResponse.json({ error: 'Deepgram API Key not configured' }, { status: 500 });
    }

    return NextResponse.json({
        key: process.env.DEEPGRAM_API_KEY
    });
}
