# Hangout Conversational AI Architecture

> **Version**: 1.0 | **Status**: Production Spec | **Updated**: January 2026

---

## 1. Core Architecture

**Model**: HALF-DUPLEX conversational with strict turn-taking.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Audio In  │───▶│     VAD     │───▶│     STT     │
│ (Microphone)│    │ (Detection) │    │  (Whisper)  │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │    Dual Path    │
                                    │   Processing    │
                                    └────┬───────┬────┘
                                         │       │
                        ┌────────────────▼┐     ┌▼────────────────┐
                        │  Optimized Chat │     │   Accumulator   │
                        │ (Single Shot)   │     │   (Raw Text)    │
                        │ Norm + Reply    │     │                 │
                        └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │  Conversation   │     │    Evaluator    │
                        │    (Chatbot)    │     │   (Prompt 2)    │
                        └────────┬────────┘     └────────┬────────┘
                                 │
                                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Audio Out  │◀───│     TTS     │◀───│     LLM     │
│  (Speaker)  │    │   (Nova)    │    │ (GPT-4o-m)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 1.1 Dual-Prompt Strategy (V1 Optimized)

| Feature | Input | Processing | Output |
|---------|-------|------------|--------|
| **Chatbot** | Raw Transcript | **Dual-Process Single Shot** (Prompt 1 merged) | Clean context -> Natural Reply |
| **Evaluator** | Raw Transcript | **IELTS Rubric** (Prompt 2) | Band Scores -> Detailed Feedback |

> **Optimization**: Normalization & Reply generation are merged into ONE LLM call to save ~1.5s latency.

**Critical Rule**: The system must NEVER listen while speaking.

---

## 2. State Machine (Mandatory)

```
┌────────┐
│  IDLE  │◀──────────────────────────────────┐
└───┬────┘                                   │
    │ User clicks "Start"                    │
    ▼                                        │
┌───────────┐                                │
│ LISTENING │◀───────────────────────┐       │
│ (mic ON)  │                        │       │
46: └─────┬─────┘                        │       │
      │ Silence detected (500ms)     │       │
      ▼                              │       │
┌────────────┐                       │       │
│ PROCESSING │                       │       │
│ (STT + LLM)│                       │       │
└─────┬──────┘                       │       │
      │ Response ready               │       │
      ▼                              │       │
┌──────────┐                         │       │
│ SPEAKING │                         │       │
│ (mic OFF)│                         │       │
└─────┬────┘                         │       │
      │ TTS playback complete        │       │
      ▼                              │       │
┌──────────┐                         │       │
│ COOLDOWN │  200ms delay            │       │
│ (buffer) │─────────────────────────┘       │
└─────┬────┘                                 │
      │ User ends session                    │
      └──────────────────────────────────────┘
```

### State Rules

| State | Microphone | Speaker | Allowed Actions |
|-------|------------|---------|-----------------|
| IDLE | OFF | OFF | Wait for start |
| LISTENING | **ON** | OFF | Capture audio |
| PROCESSING | OFF | OFF | STT → Normalization → LLM |
| SPEAKING | **OFF** | ON | TTS playback |
| COOLDOWN | OFF | OFF | Silence buffer (200ms) |

**Invariants**:
- LISTENING and SPEAKING must **never** overlap
- Microphone is disabled during SPEAKING and PROCESSING
- Audio input is **ignored** outside LISTENING
- State transitions must be explicit and logged

---

## 3. Audio Safety Rules

### Voice Activity Detection (VAD)

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Threshold | `-35dB` | Filters ambient noise, requires clear voice |
| Silence Duration | `600ms` | Fast turn-taking without cutting off mid-sentence |
| Bandpass Filter | `300-3400Hz` | Human voice only |
| Max Duration | `15s` | Prevent infinite recording (failsafe) |

### Transcript Validation

**DISCARD** if:
- Confidence score < threshold
- Fewer than 3 meaningful words
- Matches recent TTS output (echo)
- Matches hallucination blocklist:
  ```
  silence, shh, hmm, mm, uh, um, ah, peace, bye,
  thanks for watching, subs by, captioned by,
  thank you, thank you., thanks, thanks.
  ```
- Contains non-English characters

### Cooldown After TTS

- **Adaptive Cooldown**: 0ms-150ms based on AI response length.
  - Short response (<30 chars): **0ms** (Instant turn-taking)
  - Medium response (<80 chars): **100ms**
  - Long response (>80 chars): **150ms**
- This is a **state** transition triggered by TTS `onended`.
- Prevents speaker-to-mic feedback.

### 3.4 Silence Handling Strategy

To prevent user anxiety during pauses, the system employs progressive interventions (Voice Only):

| Duration | Action | Vibe |
|----------|--------|------|
| **15s** | **Encouragement** | "Take your time! No rush." (Gentle Whisper) |
| **20s** | **Check-In** | "Would you like to continue or take a break?" |

> **Rule**: Interventions are *ephemeral* and do NOT enter the conversation history context. No visual timers are displayed (Clean Interface).

---

## 4. Conversation Topics (Scope Definition)
> **Note**: Topic Chips have been removed from the UI (V4 Clean Interface). These topics now strictly define the AI's "internal" knowledge scope.

| ID | Topic | Subtopics |
|----|-------|-----------|
| `personal` | Personal Background | Hometown, family, living |
| `work_study` | Work & Study | Job, career, education |
| `daily_life` | Daily Routines | Morning, evening, weekends |
| `hobbies` | Hobbies & Interests | Sports, creative, games |
| `social_life` | Friends & Social | Gatherings, relationships |
| `food_drink` | Food & Dining | Cooking, restaurants |
| `places_travel` | Places & Travel | Trips, destinations |
| `technology` | Tech & Media | Apps, internet, social |
| `experiences` | Opinions & Stories | Memories, preferences |
| `nature` | Nature & Environment | Weather, seasons |
| `abstract` | Lifestyle & Dreams | Colors, fashion, dreams |
| `festivals` | Celebrations | Holidays, parties |

### Topic Rules
- Each input must be classified into one topic or `OUT_OF_SCOPE`
- `OUT_OF_SCOPE` inputs are gently redirected
- AI may **never** invent new topics
- Smooth transitions using bridge phrases

---

## 5. LLM Behavior Rules

### Identity
```
You are SpeakMate—a calm, neutral, peer-like speaking partner.
NOT a teacher. NOT an examiner. NOT a coach.
```

### Response Rules

| Rule | Constraint |
|------|------------|
| **Length** | 1 sentence max (15 words) |
| **Ratio** | User 70% / AI 30% |
| **Questions** | Open-ended only |
| **Self-reference** | Avoid talking about yourself |
| **Audio events** | Never describe sounds/voices |

### Question Strategy

**DO**:
- "What was that like?"
- "How did that make you feel?"
- "Can you tell me more about...?"

**DON'T**:
- "Do you like...?" (yes/no)
- "Is it...?" (yes/no)
- "Did you...?" (yes/no)

### Safety Behaviors
- Empty/partial transcripts → Ignore
- Low confidence → Ignore
- Silence hallucinations → Ignore
- Sensitive topics → Gently redirect

---

## 6. Greetings (Voice Driven)

**Rule**: The UI no longer displays text greetings. The session begins with a neutral "Tap to start Hangout" prompt.

### Start Flow
1. **User Taps Mic**.
2. **AI Listens**.
3. **First AI Response** serves as the dynamic greeting based on user input or silence.

### Retained Logic (Backend)
The backend still tracks return-user status to inform the **Tone** of the first response, but it is not pre-announced via text.

| Scenario | Time Gap | Vibe |
|----------|----------|------|
| **Long Time** | > 7 Days | Warm welcome back, "missed you" |
| **Few Days** | 2-6 Days | Casual catch-up |
| **Next Day** | 12-48 Hrs | Routine building, enthusiastic |
| **Later Today** | 3-12 Hrs | Casual check-in, shifting context |
| **Just Now** | < 3 Hrs | Seamless continuation |

---

## 7. Transition Phrases

### Topic Bridges

| From → To | Phrase |
|-----------|--------|
| Work → Hobbies | "What do you do to unwind after work?" |
| Food → Travel | "Have you tried food from other countries?" |
| Hobbies → Social | "Do you do that alone or with friends?" |

### Acknowledgments

| Response Length | Phrase |
|-----------------|--------|
| Long | "That's really interesting!" |
| Medium | "That makes sense!" |
| Short | "Got it.", "I see." |

---

## 8. Error Recovery

| Error | Recovery Action |
|-------|-----------------|
| STT fails | Retry once → "Sorry, I didn't catch that" |
| LLM fails | Use cached fallback response |
| TTS fails | Use browser TTS as fallback |
| Network error | Graceful degradation message |

---

## 9. Performance Targets

| Metric | Target |
|--------|--------|
| Turn latency | **< 2s (Optimized)** |
| STT time | ~300ms |
| LLM time | ~800ms (Combined) |
| TTS time | ~300ms |
| Network overhead | ~200ms |

---

## 9.1 IELTS Scoring Calculation

**Formula**:
```
overall_raw = (fluency + vocabulary + grammar + pronunciation) / 4
```

**Rounding Rules**:
| Decimal | Rounds To |
|---------|-----------|
| 0.00-0.24 | Down |
| 0.25-0.74 | .5 |
| 0.75-0.99 | Up |

**Consistency Check**: If any score is >1 level below mean, reduce overall by 0.5.

---

## 10. Voice Setup (V1 Spec)

| Setting | Value | Description |
|---------|-------|-------------|
| **Model** | `tts-1` | Standard latency model for speed |
| **Voice** | `nova` | Energetic, neutral tone |
| **Speed** | `0.85` | Slightly slower for better clarity |

---

## 11. Key Files (Rebuild Reference)

| File | Purpose | Key Details |
|------|---------|-------------|
| `hangout/page.tsx` | **Conversation Manager** | State machine: idle → listening → processing → speaking. Manages all hooks. |
| `useSmartVAD.ts` | VAD + State control | `-35dB` threshold, `600ms` silence. Sets `isSpeaking` to trigger/stop recording. |
| `useSpeechRecognition.ts` | Recording | MediaRecorder → WebM → Blob. Max 15s (failsafe). Returns audio file for Whisper. |
| `useTextToSpeech.ts` | TTS playback | Calls `/api/hangout/speech`, plays audio. `onEnd` callback triggers next state. |
| `useSilenceMonitor.ts` | **Silence Handling** | 8s: visual timer. 15s: encouragement. 20s: check-in. Configurable thresholds. |
| `topicManager.ts` | Topic classification | Extracts conversation topics for context. |
| `conversationContext.ts` | LLM prompt builder | Builds system prompt with user history, goal, personality. |
| `api/hangout/conversation/` | Normalization + Chat | Single-shot: normalizes speech + generates reply. `NORMALIZATION_SYSTEM_PROMPT`. |
| `api/hangout/transcribe/` | Whisper STT | Raw transcription. `sanitizeTranscript()` filters hallucinations. |
| `api/hangout/speech/` | TTS API | `voice: "nova"`, `speed: 0.85`. Returns audio stream. |
| `lib/services/evaluation.ts` | **Evaluator Engine** | IELTS scoring, consistency check, `corrections` array with MAJOR/MINOR. |
| `detailed-feedback/page.tsx` | **Criteria Feedback** | 3 sections, `renderFeedbackPoint()` parses [Criterion] labels. |
| `transcript/page.tsx` | **Full Transcript** | WhatsApp-style chat, inline MAJOR/MINOR corrections. |
