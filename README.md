# 🗣️ SpeakMate - AI English Fluency Coach

Your friendly AI companion to improve English fluency through natural conversation.

## ✨ Features

### Conversation Intelligence
- 🧠 **Modular AI Pipeline** - Low-latency architecture combining optimized STT, Intelligence, and TTS
- 🎤 **Smart VAD (Voice Activity Detection)** - Custom-tuned silence detection (-35dB / 600ms) for natural turn-taking
- 💭 **Conversation Memory** - Remembers personal facts, preferences, and past discussions
- 🔄 **Contextual Transitions** - 90+ natural phrases for smooth topic changes
- 👤 **Personal Fact Extraction** - Learns about you (profession, family, hobbies) automatically
- 📊 **Real-time Topic Display** - Visual indicators for current conversation themes

### Gamification & Motivation
- 🔥 **Streak Tracking** - Daily practice streaks with badge display
- 🎉 **Milestone Celebrations** - Animated achievements (3 to 365 days)
- 📈 **Conversation Phases** - Visual indicators (Introduction → Exploration → Deep Dive)

### Evaluation & Feedback
- 🎯 **AI-Powered Evaluation** - Hybrid scoring (GPT-4o-mini + quantitative metrics)
- 📝 **Full Transcript with Corrections** - WhatsApp-style chat history with inline Major/Minor mistake classification (Uses Smart Fuzzy Matching)
- 📊 **Detailed Session Scoring** - Criteria-based feedback (Fluency, Vocabulary, Grammar, Pronunciation)
- 📋 **Actionable Feedback** - Structured recommendations for improvement based on weakest criteria

### User Experience
- 📞 **Phone Call Mode** - Natural conversation flow with minimal interface
- 🌊 **Adaptive Cooldown** - Dynamic pause handling (0-150ms) for snappy responses
- 🎨 **Modern UI** - Dark mode, auto-scrolling, and responsive design
- 🗣️ **Natural AI Voice** - OpenAI `nova` voice for warm, human-like interaction

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Intelligence**: OpenAI GPT-4o-mini (Optimized for speed/cost)
- **Speech-to-Text (STT)**: OpenAI Whisper (`whisper-1`)
- **Text-to-Speech (TTS)**: OpenAI TTS (`tts-1`, voice: `nova`)
- **Audio Processing**: Custom Web Audio API VAD (-35dB / 600ms)
- **State Management**: React Hooks + LocalStorage/SessionStorage

## 📋 Prerequisites

- Node.js 18+ (20+ recommended)
- **OpenAI API Key** (Required for STT, LLM, and TTS)

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local` with:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Using the App

1.  **Select Goal**: Choose IELTS, Professional, or General.
2.  **Start Hangout**: Click the mic button.
3.  **Speak**: The AI listens for speech (VAD) and responds automatically.
    *   *Tip: Use the "Exit" button to see your detailed evaluation.*

## 🏗️ Architecture

### Modular Pipeline (Current)
Instead of a single WebSocket, SpeakMate uses a robust 3-stage pipeline for maximum control and reliability:

1.  **Input (Client)**:
    *   `useSmartVAD.ts` monitors audio volume.
    *   On silence (600ms), audio is sliced and sent to API.
2.  **Processing (Server)**:
    *   **STT**: `api/hangout/transcribe` (Whisper) converts audio to text.
    *   **LLM**: `api/hangout/conversation` (GPT-4o-mini) generates reply + metadata (topics, corrections).
    *   **TTS**: `api/hangout/speech` (OpenAI TTS) generates audio.
3.  **Output (Client)**:
    *   Audio is played via `useTextToSpeech.ts`.
    *   State machine returns to "Listening" via Adaptive Cooldown.

### Key Directories

| Path | Purpose |
|------|---------|
| `src/app/hangout/page.tsx` | Main conversation UI & State Machine |
| `src/hooks/useSmartVAD.ts` | Custom VAD logic (-35dB threshold) |
| `src/lib/utils/topicManager.ts` | 9-topic smart switching algorithm |
| `src/lib/services/evaluation.ts` | IELTS scoring (Fluency/Vocab/Grammar/Pron) |
| `src/app/hangout/transcript/` | Full chat view with Fuzzy-Matched corrections |
| `src/app/hangout/detailed-feedback/` | Criteria-based feedback view |

## 🤝 Contributing

This project is designed to be a lightweight, privacy-focused English coach. Feel free to fork and experiment with different prompts or voice models!

## 📝 License

MIT License
