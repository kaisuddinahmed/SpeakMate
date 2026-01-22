# SpeakMate Master Architecture & Developer Guide
> **STATUS**: Source of Truth
> **LAST UPDATED**: January 2026
> **VERSION**: 2.0 (Deepgram + Groq + FSM)

---

## 1. Product Context
**Mission**: Break the fear of speaking English through AI-powered conversation that feels like a friend.

### Core Architecture: "The Fast & The Reliable"
- **Speed**: Groq Llama 3 for sub-300ms brain.
- **Reliability**: Finite State Machine (FSM) for atomic audio handling.
- **Quality**: Deepgram Nova-2 (STT) and Aura (TTS) for premium voice.

---

## 2. System Architecture

### High-Level Flow
```
User Audio -> Deepgram Nova-2 (WebSocket) -> [FSM Orchestrator]
                                                  |
                                                  v
                                            Groq Llama 3.3 (REST)
                                                  |
                                                  v
                                            Deepgram Aura (REST)
                                                  |
                                                  v
                                            Complete Audio Blob -> Playback
```

### Tech Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **STT**: Deepgram Nova-2 (`wss://`)
- **LLM**: Groq Llama 3.3 70B (`https://`)
- **TTS**: Deepgram Aura Asteria (`https://`)
- **State Management**: React `useRef` + `useState` (Custom FSM Hook)

### Frontend Architecture (Core UI)
| Role | Component / Hook | Purpose |
|------|------------------|---------|
| **Orchestrator** | `app/hangout/page.tsx` | UI Container, manages session controller. |
| **Main View** | `app/hangout/HangoutUI.tsx` | **V4.6 Logic**. Manages Orb, Transcript Stack, Status Text. |
| **The Brain** | `hooks/useConversationController.ts` | **The Core**. Manages FSM, WebSocket, API calls, and Audio context. |

---

## 3. Feature Implementation Details

### A. Finite State Machine (FSM)
- **Logic**: Strict states to prevent race conditions.
- **Flow**: `IDLE` -> `LISTENING` -> `THINKING` -> `SPEAKING` -> `LISTENING`.
- **Mic Gating**: Microphone is strictly ignored during `THINKING` and `SPEAKING` states.

### B. User & Profile Management
- **Storage**: `localStorage` (Keys: `speakmate_userName`, `speakmate_goal`, etc).
- **Edit Profile**: `app/profile/page.tsx`. Fields: Full Name, Nickname, Email, Mobile, Age, Gender.
- **User Menu**: `components/UserMenu.tsx`. Displays Full Name & Goal, handles navigation.

### C. Audio Pipeline (Atomic)
- **Capture**: `ScriptProcessorNode` (Legacy compatible) sending Int16 PCM to Deepgram.
- **Playback**: REST API fetches **full audio files** (Blobs). No streaming chunks.
- **Endpointing**: **1000ms** silence detection (Deepgram managed).

---

## 4. Key File Locations

| Feature | Path | Critical Implementation Note |
|---------|------|------------------------------|
| **Core Hook** | `hooks/useConversationController.ts` | Contains FSM, STT, TTS, and LLM logic. |
| **Interaction UI** | `app/hangout/HangoutUI.tsx` | Floating Stack Transcript, Breathing Orb, Status Logic. |
| **Profile** | `app/profile/page.tsx` | Liquid Glass UI, LocalStorage persistence. |
| **API Proxy** | `api/deepgram/route.ts` | Serves API Key safely. |
| **Evaluation** | `app/hangout/summary/page.tsx` | Post-session feedback logic. |

---

## 5. Environment
- `DEEPGRAM_API_KEY`: Required.
- `NEXT_PUBLIC_GROQ_API_KEY`: Required.
- **Latency**: ~1.2s turn-around (Voice-to-Voice).
