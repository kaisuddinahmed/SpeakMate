# 🗣️ SpeakMate - AI English Fluency Coach

Your friendly AI companion to improve English fluency through natural conversation.

## ✨ Features

- 🎤 **Real-time Voice Conversation** - ElevenLabs WebSocket STT with low-latency transcription
- 💬 **Interactive Chat Interface** - Auto-scrolling chat with conversation history
- 📞 **Phone Call Mode** - Natural conversation flow with mic button toggle
- 🎯 **AI-Powered Evaluation** - Hybrid approach combining GPT-4o-mini with quantitative metrics
- 📊 **Detailed Feedback** - Session scores with structured recommendations
- 🎯 **Goal-based Learning** - Choose between IELTS Prep, Professional English, or General Fluency
- 🎨 **Modern UI** - Beautiful, responsive design with dark mode support
- 🔊 **Speech Recognition** - ElevenLabs Scribe v2 Realtime (English-locked)
- 🗣️ **Text-to-Speech** - Natural AI voice responses
- 🚀 **Fast & Lightweight** - Built with Next.js 15 and React 19
- 📈 **Quantitative Metrics** - Vocabulary diversity, hesitation rate, discourse markers, sentence complexity

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI Conversation**: OpenAI GPT-4o-mini
- **AI Evaluation**: OpenAI GPT-4o-mini with quantitative metrics layer
- **Speech-to-Text**: ElevenLabs Scribe v2 Realtime (WebSocket)
- **Text-to-Speech**: ElevenLabs TTS
- **Audio Processing**: Web Audio API (ScriptProcessorNode, gain nodes)

## 📋 Prerequisites

- Node.js 24.11.1 (installed via NVM)
- npm package manager
- OpenAI API key
- ElevenLabs API key

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local` with:
```env
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

⚠️ **Never commit `.env.local` to git** - it's already in `.gitignore`

### 3. Run Development Server

```bash
# Make sure you're using the correct Node version
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && npm run dev
```

Or use the VS Code task: **Run Development Server**

Open [http://192.168.1.9:3000](http://192.168.1.9:3000) in your browser (or localhost:3000).

### 4. Using the App

1. **Choose your goal**: IELTS, Professional, or General Fluency
2. **Navigate to "Hang out with SpeakMate"**
3. **Allow microphone access** when prompted
4. **Tap the mic button** to start conversation
5. **Speak naturally** - AI will respond and conversation will flow like a phone call
6. **Tap Exit** to end and view session summary with detailed feedback

### 5. Build for Production

```bash
npm run build
npm start
```

## 🏗️ Architecture

### Backend Structure
- **API Routes**:
  - `api/hangout/` - Conversation management
    - `conversation/` - AI chat responses (GPT-4o-mini)
    - `voice/` - ElevenLabs STT token generation
    - `speech/` - Text-to-speech synthesis
  - `api/evaluation/` - Session analysis
    - `session/` - Post-hangout comprehensive evaluation
    - `transcript/` - (Future) Detailed transcript review with corrections
- **Core Logic**:
  - `lib/features/evaluation/evaluator.ts` - TypeScript evaluation engine with full type safety

### Evaluation System
- **Location**: `src/lib/features/evaluation/evaluator.ts` (TypeScript with comprehensive types)
- **Approach**: Hybrid AI + quantitative metrics
- **AI Model**: OpenAI GPT-4o-mini (temperature: 0.3, max_tokens: 800)
- **Metrics Analyzed**: 
  - Vocabulary diversity (unique words / total words)
  - Hesitation rate (um, uh, er markers)
  - Discourse markers (however, moreover, therefore, etc.)
  - Sentence complexity (subordinate clauses, relative clauses)
  - Average sentence length
  - Word repetitions
- **Scoring**: 0-9 scale with 0.5 increments
- **Criteria**: Fluency, Vocabulary, Grammar, Pronunciation (copyright-safe terminology)
- **Output**: Scores + brief feedback + detailed feedback + metrics + improvement suggestions

### Speech-to-Text Integration
- **Service**: ElevenLabs Scribe v2 Realtime
- **Protocol**: WebSocket (wss://api.elevenlabs.io/v1/speech-to-text/realtime)
- **Audio Format**: PCM 16kHz, int16
- **Processing**: Web Audio API → ScriptProcessorNode → Gain Node (muted) → Base64 encoding
- **Language**: English-locked (`language_code=en`)
- **Commit Strategy**: VAD (Voice Activity Detection)

### Key Features Implementation
- **Phone Call Mode**: Mic button starts conversation, becomes non-interactive after start
- **Auto-scroll**: Chat automatically scrolls to latest message
- **Session Caching**: Evaluation results cached in sessionStorage for navigation between summary/detailed feedback
- **Context-aware Evaluation**: Only student messages analyzed (not AI responses)

## 📁 Project Structure

```
speakmate/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── hangout/
│   │   │   │   ├── conversation/        # AI conversation endpoint (GPT-4o-mini)
│   │   │   │   ├── voice/               # ElevenLabs STT token generation
│   │   │   │   └── speech/              # Text-to-speech endpoint
│   │   │   └── evaluation/
│   │   │       ├── session/             # Post-session evaluation API
│   │   │       └── transcript/          # (Future) Transcript review with corrections
│   │   ├── hangout/
│   │   │   ├── page.tsx                 # Main conversation interface
│   │   │   ├── summary/page.tsx         # Session evaluation summary
│   │   │   └── detailed-feedback/page.tsx # Detailed feedback breakdown
│   │   ├── general/, ielts/, professional/ # Goal-based dashboards
│   │   ├── layout.tsx                   # Root layout
│   │   ├── page.tsx                     # Home page
│   │   └── globals.css                  # Global styles
│   ├── lib/
│   │   ├── features/
│   │   │   └── evaluation/
│   │   │       └── evaluator.ts         # TypeScript evaluation engine (450+ lines)
│   │   └── services/                    # (Future) External service integrations
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts      # ElevenLabs WebSocket STT hook
│   │   └── useTextToSpeech.ts           # TTS hook
│   └── components/
│       └── Logo.tsx                     # SpeakMate logo component
├── speakmate-ai/                        # Legacy (deprecated - migrated to src/lib/)
│   └── evaluator.js                     # Old JS evaluator (use TypeScript version)
├── public/                              # Static assets
├── .github/
│   └── copilot-instructions.md          # Project context for GitHub Copilot
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 🎯 Future Enhancements

- [ ] Progress tracking across sessions
- [ ] Audio analysis for pronunciation feedback
- [ ] Fine-tune evaluation rubric for different proficiency levels
- [ ] Add more quantitative metrics (filler word patterns, pauses, speech rate)
- [ ] User authentication and conversation history
- [ ] Database integration for progress analytics
- [ ] Custom practice scenarios and prompts
- [ ] Export conversation transcripts

## 🔒 Git Repository

This project uses git for version control. Current milestones:

**Latest: Backend Reorganization Complete** (commit: `e6c0d0d`)
- Organized API structure (hangout/, evaluation/)
- TypeScript evaluation engine with full type safety
- Migrated all routes, updated frontend
- All features tested and working

**Previous: Hybrid AI Evaluator with Quantitative Metrics** (commit: `aa6dc41`)
- Isolated evaluation engine
- AI + metrics approach
- All features functional and tested

To view history: `git log --oneline`

## 🤝 Contributing

Feel free to customize and extend this app for your needs!

## 📝 License

MIT License - feel free to use this project for learning and development.

---

Built with ❤️ using Next.js and AI
