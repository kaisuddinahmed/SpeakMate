# Google Gemini Live API Integration

## Overview
SpeakMate now supports Google's Gemini 2.0 Flash with native audio as a backup AI service alongside ElevenLabs Conversational AI.

## Features
- **Real-time voice conversation** using Gemini's Live API
- **Native audio streaming** with low latency
- **Seamless switching** between ElevenLabs and Gemini in Settings
- **Automatic microphone handling** with PCM audio format
- **IELTS-focused system instructions** that adapt to your learning goal

## Setup Instructions

### 1. Get Your Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Log in with your Google account
3. Click "Get API key"
4. Create a key in a new or existing Google Cloud project
5. Copy the API key

### 2. Configure Environment Variable
Your API key is already configured in `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY=AIzaSyCQ9yQ0tFQ38Dl1Ls-pDPzJ4jIaFl2WopI
```

**Note:** The `NEXT_PUBLIC_` prefix is required for Next.js to expose the key to the browser.

### 3. Switch to Gemini
1. Open the app and navigate to **Settings** (gear icon)
2. Find the "AI Service" toggle at the top
3. Toggle to switch between:
   - **ElevenLabs** (Primary - blue toggle)
   - **Gemini** (Backup - green toggle)
4. Start a conversation to test!

## How It Works

### Architecture
```
User Microphone → AudioContext → PCM Conversion → Base64 Encoding → Gemini Live API
                                                                           ↓
User Speakers ← AudioContext ← PCM Decoding ← Base64 Response ← Audio Response
```

### Key Components

#### 1. Session Initialization (`initGeminiLiveSession`)
- Creates WebSocket connection to Gemini Live API
- Configures voice (Kore) and response modalities (audio only)
- Sets up system instruction based on learning goal
- Handles connection lifecycle

#### 2. Audio Streaming (`sendAudioToGemini`)
- Captures microphone input at 16kHz sample rate
- Converts Float32Array to Int16Array (PCM format)
- Encodes to Base64 for transmission
- Sends realtime audio chunks to Gemini

#### 3. Audio Playback (`playGeminiAudio`)
- Receives Base64 audio responses
- Decodes to audio buffer
- Plays through Web Audio API

#### 4. Transcript Handling
- Captures both user and AI text transcripts
- Displays in conversation UI with timestamps
- Enables review and learning

## Technical Details

### Audio Format
- **Sample Rate**: 16kHz (mono)
- **Format**: PCM (Pulse Code Modulation)
- **Encoding**: Int16 (16-bit signed integers)
- **Transport**: Base64 over WebSocket

### Model Configuration
```typescript
{
  model: "models/gemini-2.0-flash-exp",
  config: {
    responseModalities: ["audio"],
    speechConfig: {
      voiceConfig: { 
        prebuiltVoiceConfig: { voiceName: "Kore" } 
      }
    },
    systemInstruction: "..." // IELTS coaching prompt
  }
}
```

### System Instruction
The AI adapts based on your selected goal:
- **IELTS Preparation**: Focuses on band scores, formal assessment
- **Professional Communication**: Business vocabulary, workplace scenarios
- **General Fluency**: Casual conversation, everyday topics

## Security Considerations

⚠️ **Important**: The current implementation exposes the API key in the browser (frontend).

### For Production
You should create a backend proxy to protect your API key:

1. Create an API route (e.g., `/api/gemini-proxy`)
2. Move the Gemini SDK initialization to the server
3. Client sends audio chunks to your backend
4. Backend forwards to Gemini and streams response back
5. Keep `GOOGLE_GEMINI_API_KEY` (without `NEXT_PUBLIC_`) server-side only

Example backend route structure:
```typescript
// app/api/gemini-proxy/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  // Handle session creation and audio streaming
  // Return signed URL or proxy WebSocket connection
}
```

## Troubleshooting

### "Timed out waiting for Gemini connection"
- Check your API key is valid and not expired
- Ensure `NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY` is set correctly
- Verify network connection
- Check browser console for detailed errors

### "Microphone access is required"
- Grant microphone permission when browser prompts
- Check browser settings for microphone access
- Try refreshing the page

### Audio playback issues
- Ensure your device has working speakers
- Check browser audio permissions
- Try toggling the conversation off/on

### No transcript appearing
- Gemini may take a moment to process
- Check if audio is being sent (console logs)
- Verify WebSocket connection is established

## API Quotas & Limits

Google Gemini Live API has usage limits:
- Check [Google AI Studio](https://aistudio.google.com) for your quota
- Monitor usage in Google Cloud Console
- Consider implementing usage tracking in your app

## Comparison: ElevenLabs vs Gemini

| Feature | ElevenLabs | Gemini |
|---------|-----------|--------|
| Voice Quality | Excellent (Conversational AI) | Very Good (Native Audio) |
| Latency | Very Low | Low |
| IELTS Agent | ✅ Pre-configured | ⚠️ Custom prompt |
| Cost | Pay per use | Free tier + paid |
| Customization | Agent settings | System instructions |
| Reliability | Stable | Preview/Experimental |

## Future Enhancements

- [ ] Add backend proxy for API key security
- [ ] Implement usage tracking and quota monitoring
- [ ] Add voice selection options (beyond Kore)
- [ ] Enable text-only mode for bandwidth saving
- [ ] Add conversation history persistence
- [ ] Implement session resume capability

## Support

For issues specific to:
- **Gemini Live API**: [Google AI Forum](https://discuss.ai.google.dev/)
- **SpeakMate Integration**: Check console logs and create an issue

## Resources

- [Google Gemini Live API Documentation](https://ai.google.dev/api/live)
- [Google GenAI SDK](https://www.npmjs.com/package/@google/generative-ai)
- [Gemini Models](https://ai.google.dev/models/gemini)
- [Google AI Studio](https://aistudio.google.com)
