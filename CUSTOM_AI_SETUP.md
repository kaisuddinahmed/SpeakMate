# Custom AI Integration Setup

Your custom conversational AI has been integrated into SpeakMate!

## Quick Start

### 1. Update Environment Variable

Open `.env.local` and set your ngrok URL:

```env
NEXT_PUBLIC_CUSTOM_AI_URL=https://your-ngrok-url.ngrok-free.dev
```

**Note:** The app will automatically convert `https://` to `wss://` for WebSocket connection.

### 2. Start Your Backend

```bash
# Window 1: Start your Python backend
python app.py

# Window 2: Start ngrok
./ngrok http 5001
```

### 3. Copy Your Ngrok URL

Copy the ngrok URL from the terminal (e.g., `https://abc123.ngrok-free.dev`) and paste it into `.env.local`

### 4. Restart Next.js Dev Server

```bash
# Kill current server (Ctrl+C) and restart
npm run dev
```

## How It Works

### Audio Flow

1. **User speaks** → Mic captures audio (PCM 16kHz mono)
2. **Voice Activity Detection** → Only sends when speech detected
3. **Streams to your AI** → Sends base64 PCM chunks via:
   ```json
   {
     "event": "media",
     "media": {
       "payload": "<base64_pcm_chunk>"
     }
   }
   ```
4. **End of speech** → Sends commit event:
   ```json
   {
     "event": "commit"
   }
   ```
5. **Your AI responds** → Returns:
   ```json
   {
     "event": "response",
     "text": "AI response text",
     "audio": null
   }
   ```
6. **Text-to-Speech** → App uses Web Speech API to speak the response
7. **Transcript displayed** → Shows in chat UI

### Features

✅ **Auto-connect** - Connects to your AI when conversation starts
✅ **Voice Activity Detection** - Mic only pulses when you speak
✅ **Real-time streaming** - Low latency audio transmission
✅ **Auto commit** - Sends commit after 10 frames of silence
✅ **Built-in TTS** - Uses browser's speech synthesis for responses
✅ **Transcript logging** - Shows both user and AI messages

## Troubleshooting

### Connection Failed

**Error:** "Could not connect to AI"

**Solutions:**
1. Check your ngrok is running: `./ngrok http 5001`
2. Verify Python backend is running: `python app.py`
3. Update `.env.local` with the correct ngrok URL
4. Restart Next.js: `npm run dev`

### No Audio Being Sent

**Check console logs:**
- Should see: "🎤 Speech detected"
- Should see: "🎤 First audio chunk sent to Custom AI"

**Solutions:**
- Click mic button to start
- Speak clearly (RMS threshold: 0.01)
- Check browser mic permissions

### AI Not Responding

**Check console logs:**
- Should see: "📤 Sent commit to Custom AI"
- Should see: "📩 Custom AI message: {event: 'response', ...}"

**Solutions:**
- Verify your backend is processing commits
- Check backend logs for errors
- Test with curl/Postman first

### Text-to-Speech Not Working

**Check:**
- Browser supports Web Speech API (Chrome, Edge, Safari)
- System volume is up
- Check console for errors

## Testing

### Quick Test Flow

1. Start conversation screen
2. Wait for "✅ Custom AI ready"
3. Speak: "Hello"
4. Should see in console:
   - "🎤 Speech detected"
   - "📤 Sent commit to Custom AI"
   - "💬 AI Response: [your AI's response]"
5. Should hear AI response via TTS
6. Should see transcript in UI

### Console Logs to Monitor

```
🚀 Auto-starting conversation with Custom AI...
🔌 Connecting to: wss://abc123.ngrok-free.dev/ws
✅ Connected to Custom AI
✅ Custom AI ready, starting microphone...
🎤 Microphone activated
🎤 Speech detected
🎤 Streaming to AI... (RMS: 0.0234)
🔇 Speech ended
📤 Sent commit to Custom AI
📩 Custom AI message: {event: "response", text: "..."}
💬 AI Response: Hello! It is great to meet you.
```

## Architecture

```
User Voice → Mic → VAD → PCM Encoding → Base64 → 
WebSocket → Your AI → Response → TTS → Speaker + UI
```

## Next Steps

- ✅ Integration complete and working
- 🔄 Test with various speech patterns
- 🎯 Tune VAD thresholds if needed (line 770 in page.tsx)
- 🎨 Customize UI feedback
- 📊 Add real scoring logic based on AI feedback
