# 🗣️ SpeakMate - AI English Fluency Coach

Your friendly AI companion to improve English fluency through natural conversation.

## ✨ Features

- 🎤 **Real-time Voice Conversation** - Speak with AI and get instant responses
- 💬 **Interactive Chat Interface** - See transcripts and feedback in real-time
- 🎯 **Live Feedback** - Grammar, vocabulary, and pronunciation tips as you speak
- 📊 **Progress Tracking** - IELTS band scoring system for all skills
- 🎯 **Goal-based Learning** - Choose between IELTS Prep, Professional English, or General Fluency
- 🎨 **Modern UI** - Beautiful, responsive design with dark mode support
- 🔊 **Speech Recognition** - Automatically converts your speech to text
- 🗣️ **Text-to-Speech** - AI responds with natural voice
- 🚀 **Fast & Lightweight** - Built with Next.js 15 and React 19

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o-mini for conversations
- **Speech**: Browser Web Speech API (Speech Recognition & Synthesis)

## 📋 Prerequisites

- Node.js 24+ (installed via NVM)
- npm package manager
- OpenAI API key
- Modern browser with Web Speech API support (Chrome, Edge recommended)

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure OpenAI API Key

The API key is already configured in `.env.local`. To update it:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

⚠️ **Never commit `.env.local` to git** - it's already in `.gitignore`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Using the App

1. **Sign up** with email and create profile
2. **Choose your goal**: IELTS, Professional, or General Fluency
3. **Navigate to dashboard** and tap "Hang out with SpeakMate"
4. **Allow microphone access** when prompted
5. **Tap the mic button** and start speaking in English
6. **AI will respond** with voice and show real-time feedback

### 5. Build for Production

```bash
npm run build
npm start
```

## 🎯 Next Steps

### Add Real AI Integration

The app currently uses demo responses. To integrate real AI:

1. **OpenAI Integration**:
   ```bash
   npm install openai
   ```
   
   Update `src/app/api/chat/route.ts`:
   ```typescript
   import OpenAI from 'openai';
   
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   });
   
   // Use openai.chat.completions.create()
   ```

2. **Add Voice Features**:
   - Speech-to-text: Web Speech API or Whisper API
   - Text-to-speech: Browser SpeechSynthesis or ElevenLabs

3. **Enhanced Features**:
   - Progress tracking and analytics
   - Conversation history with database (Prisma + PostgreSQL)
   - Grammar correction highlighting
   - Vocabulary builder
   - Speaking exercises and prompts

## 📁 Project Structure

```
speakmate/
├── src/
│   ├── app/
│   │   ├── api/chat/        # Chat API endpoint
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page with chat UI
│   │   └── globals.css      # Global styles
├── public/                  # Static assets
├── .github/
│   └── copilot-instructions.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 🤝 Contributing

Feel free to customize and extend this app for your needs!

## 📝 License

MIT License - feel free to use this project for learning and development.

---

Built with ❤️ using Next.js and AI
