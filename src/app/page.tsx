"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";

type Screen = "welcome" | "login" | "signup" | "otp" | "profile" | "goals" | "dashboard" | "userMenu" | "detailReport" | "settings" | "conversation" | "sessionSummary";
type AuthMode = "login" | "signup" | null;

type EvaluationResult = {
  fluency: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  overall: number;
  feedback: {
    fluency: string;
    vocabulary: string;
    grammar: string;
    pronunciation: string;
  };
  note: string;
};

function HomeContent() {
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [userName, setUserName] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "dashboard" | "settings">("home");
  
  // Handle goal parameter from URL
  useEffect(() => {
    const goalParam = searchParams.get('goal');
    if (goalParam && ['ielts', 'professional', 'general'].includes(goalParam)) {
      setSelectedGoal(goalParam);
      setScreen('dashboard');
    }
  }, [searchParams]);
  
  // Conversation state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<{speaker: "user" | "ai", text: string, feedback?: string, timestamp?: string}[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<{grammar: string[], vocabulary: string[], pronunciation: string[]}>({
    grammar: [],
    vocabulary: [],
    pronunciation: []
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionScores, setSessionScores] = useState({
    fluency: 0,
    vocabulary: 0,
    grammar: 0,
    pronunciation: 0,
    overall: 0,
    feedback: ""
  });
  
  // Real-time scores during conversation
  const [currentScores, setCurrentScores] = useState({
    fluency: 0,
    vocabulary: 0,
    grammar: 0,
    pronunciation: 0
  });
  
  // ElevenLabs Conversational AI state
  const elevenLabsWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackTimeRef = useRef(0);
  const [useElevenLabsAgent, setUseElevenLabsAgent] = useState(false);
  const lastTranscriptRef = useRef<{ speaker: "user" | "ai"; text: string } | null>(null);
  const wsReadyRef = useRef(false);
  const isPausedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const conversationStartedRef = useRef(false);
  
  // Gemini Live API state
  const geminiSessionRef = useRef<any>(null);
  const geminiAudioContextRef = useRef<AudioContext | null>(null);
  
  // Custom AI state
  const customAiWsRef = useRef<WebSocket | null>(null);

  // OpenAI conversation state
  const recognitionRef = useRef<any>(null);
  const conversationHistoryRef = useRef<{role: string, content: string}[]>([]);

  // OpenAI conversation with browser Speech Recognition
  const startOpenAIConversation = useCallback(async (userText: string) => {
    try {
      // Add user message to transcript
      addTranscriptMessage("user", userText);
      
      // Add to conversation history
      conversationHistoryRef.current.push({ role: "user", content: userText });
      
      // Call OpenAI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: conversationHistoryRef.current 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      const aiReply = data.reply;
      
      // Add AI response to transcript
      addTranscriptMessage("ai", aiReply);
      
      // Add to conversation history
      conversationHistoryRef.current.push({ role: "assistant", content: aiReply });
      
      // Speak the response using Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(aiReply);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('OpenAI conversation error:', error);
      addTranscriptMessage("ai", "Sorry, I encountered an error. Please try again.");
    }
  }, []);

  const addTranscriptMessage = useCallback((speaker: "user" | "ai", text: string) => {
    const cleaned = text?.trim();
    if (!cleaned) {
      return;
    }

    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker && last.text === cleaned) {
        return prev;
      }

      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return [...prev, { speaker, text: cleaned, timestamp }];
    });

    lastTranscriptRef.current = { speaker, text: cleaned };
  }, []);

  useEffect(() => {
    wsReadyRef.current = wsReady;
  }, [wsReady]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const playElevenLabsAudio = useCallback(async (audioChunk: Uint8Array) => {
    try {
      if (!audioChunk || audioChunk.length === 0) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      if (!audioContext) {
        return;
      }

      if (audioContext.state === "suspended") {
        try {
          await audioContext.resume();
        } catch (resumeError) {
          console.warn("Failed to resume audio context:", resumeError);
        }
      }

      // ElevenLabs ConvAI streams 16-bit PCM at 16kHz; convert to Float32 for Web Audio
      const pcmData = new Int16Array(
        audioChunk.buffer,
        audioChunk.byteOffset,
        Math.floor(audioChunk.byteLength / 2)
      );

      const sampleRate = 16000;
      const audioBuffer = audioContext.createBuffer(1, pcmData.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < pcmData.length; i += 1) {
        channelData[i] = Math.max(-1, Math.min(1, pcmData[i] / 32768));
      }

      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioContext.destination);

      const now = audioContext.currentTime;
      const scheduledStart = Math.max(now, playbackTimeRef.current);
      sourceNode.start(scheduledStart);
      playbackTimeRef.current = scheduledStart + audioBuffer.duration;

      sourceNode.onended = () => {
        if (playbackTimeRef.current < audioContext.currentTime) {
          playbackTimeRef.current = audioContext.currentTime;
        }
      };
    } catch (error) {
      console.error("Failed to play ElevenLabs audio chunk:", error);
    }
  }, []);

  // Initialize ElevenLabs Conversational AI Agent
  const initElevenLabsAgent = useCallback(async () => {
    try {
      console.log("🎙️ Initializing ElevenLabs Conversational AI Agent...");
      setWsReady(false);

      if (elevenLabsWsRef.current) {
        elevenLabsWsRef.current.close();
        elevenLabsWsRef.current = null;
      }

      const response = await fetch("/api/elevenlabs-agent");
      if (!response.ok) {
        throw new Error("Failed to get agent URL");
      }

      const { signedUrl } = await response.json();
      console.log("✅ Received signed URL for ElevenLabs agent session");

      const ws = new WebSocket(signedUrl);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("✅ Connected to ElevenLabs agent");
        
        // Send required initialization message (minimal config to avoid overriding agent settings)
        const initMessage = {
          type: "conversation_initiation_client_data",
        };
        
        ws.send(JSON.stringify(initMessage));
        console.log("📤 Sent conversation initiation data");
        setWsReady(true);
      };

      ws.onmessage = async (event) => {
        try {
          if (typeof event.data !== "string") {
            const audioData = new Uint8Array(event.data as ArrayBuffer);
            await playElevenLabsAudio(audioData);
            return;
          }

          let message: any = null;
          try {
            message = JSON.parse(event.data);
          } catch (jsonError) {
            console.error("Failed to parse ElevenLabs message:", jsonError);
            return;
          }

          const messageType = message.type || message.event || "unknown";
          console.log("📩 ElevenLabs message:", messageType);

          if (message.audio?.chunk) {
            const audioChunk = Uint8Array.from(
              atob(message.audio.chunk),
              (c) => c.charCodeAt(0)
            );
            await playElevenLabsAudio(audioChunk);
          }

          if (message.agent_response) {
            addTranscriptMessage("ai", message.agent_response);
          }

          if (message.user_transcript) {
            addTranscriptMessage("user", message.user_transcript);
          }

          if (message.transcript && message.speaker) {
            const speaker = message.speaker === "agent" ? "ai" : "user";
            addTranscriptMessage(speaker, message.transcript);
          }

          // Handle ping to keep connection alive
          if (messageType === "ping" && message.ping_event?.event_id) {
            const pongMessage = {
              type: "pong",
              event_id: message.ping_event.event_id,
            };
            elevenLabsWsRef.current?.send(JSON.stringify(pongMessage));
          }
        } catch (error) {
          console.error("Error processing ElevenLabs agent message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ ElevenLabs WebSocket error:", error);
        setWsReady(false);
      };

      ws.onclose = (event) => {
        console.log("🔌 ElevenLabs WebSocket closed:", event.code, event.reason);
        setWsReady(false);
      };

      elevenLabsWsRef.current = ws;
    } catch (error) {
      console.error("Failed to initialize ElevenLabs agent:", error);
      throw error;
    }
  }, [addTranscriptMessage, playElevenLabsAudio]);

  const sendAudioToElevenLabs = (frame: Float32Array) => {
    try {
      const ws = elevenLabsWsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const int16Buffer = new Int16Array(frame.length);
      for (let i = 0; i < frame.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, frame[i]));
        int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      const uint8View = new Uint8Array(int16Buffer.buffer);
      let binaryString = "";
      for (let i = 0; i < uint8View.length; i += 1) {
        binaryString += String.fromCharCode(uint8View[i]);
      }

      const base64Audio = btoa(binaryString);

      const audioMessage = {
        user_audio_chunk: base64Audio,
      };
      
      ws.send(JSON.stringify(audioMessage));
      
      // Log first chunk with size details
      if (!(sendAudioToElevenLabs as any).hasLogged) {
        console.log(`🎤 First audio chunk sent: ${int16Buffer.length} samples (${base64Audio.length} base64 chars)`);
        (sendAudioToElevenLabs as any).hasLogged = true;
      }
      
      // Log every 100th chunk to monitor streaming
      if (!(sendAudioToElevenLabs as any).counter) {
        (sendAudioToElevenLabs as any).counter = 0;
      }
      (sendAudioToElevenLabs as any).counter++;
      if ((sendAudioToElevenLabs as any).counter % 100 === 0) {
        console.log(`🎤 Streaming... ${(sendAudioToElevenLabs as any).counter} chunks sent`);
      }
    } catch (error) {
      console.error("Failed to stream audio to ElevenLabs:", error);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (useElevenLabsAgent) {
      initElevenLabsAgent();
    }

    return () => {
      if (elevenLabsWsRef.current) {
        elevenLabsWsRef.current.close();
        elevenLabsWsRef.current = null;
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
        audioProcessorRef.current = null;
      }
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      playbackTimeRef.current = 0;
      setWsReady(false);
      setIsListening(false);
    };
  }, [useElevenLabsAgent, initElevenLabsAgent]);

  const stopStreaming = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current.onaudioprocess = null;
      audioProcessorRef.current = null;
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Initialize Gemini Live API
  const initCustomAI = useCallback(async () => {
    try {
      console.log("🎙️ Initializing Custom AI Session...");
      setWsReady(false);

      const customAiUrl = process.env.NEXT_PUBLIC_CUSTOM_AI_URL;
      if (!customAiUrl) {
        throw new Error("Custom AI URL not found. Please add NEXT_PUBLIC_CUSTOM_AI_URL to your .env.local file.");
      }

      // Convert https to wss for WebSocket connection
      const wsUrl = customAiUrl.replace(/^https?:\/\//, 'wss://') + '/ws';
      console.log("🔌 Connecting to:", wsUrl);
      
      // Close existing connection if any
      if (customAiWsRef.current) {
        customAiWsRef.current.close();
        customAiWsRef.current = null;
      }
      
      const ws = new WebSocket(wsUrl);
      
      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          throw new Error("Connection timeout - backend may not be responding");
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("✅ Connected to Custom AI");
        setWsReady(true);
        wsReadyRef.current = true;
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("📩 Custom AI message:", message);

          // Handle user transcript FIRST (comes before response)
          if (message.event === 'transcript' && message.text) {
            console.log("🎤 User transcript:", message.text);
            addTranscriptMessage("user", message.text);
          }
          
          // Handle AI response
          if (message.event === 'response' && message.text) {
            console.log("💬 AI Response:", message.text);
            addTranscriptMessage("ai", message.text);
            
            // Use Web Speech API for text-to-speech
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(message.text);
              utterance.lang = 'en-US';
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
              window.speechSynthesis.speak(utterance);
            }
          }
          
          // Handle score/feedback updates
          if (message.event === 'feedback' && message.scores) {
            console.log("📊 Score update:", message.scores);
            setCurrentScores({
              fluency: message.scores.fluency || currentScores.fluency,
              vocabulary: message.scores.vocabulary || currentScores.vocabulary,
              grammar: message.scores.grammar || currentScores.grammar,
              pronunciation: message.scores.pronunciation || currentScores.pronunciation
            });
          }
        } catch (error) {
          console.error("Error processing Custom AI message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Custom AI WebSocket error:", error);
        setWsReady(false);
        wsReadyRef.current = false;
      };

      ws.onclose = (event) => {
        console.log("🔌 Custom AI WebSocket closed:", event.code, event.reason);
        setWsReady(false);
        wsReadyRef.current = false;
      };

      customAiWsRef.current = ws;
    } catch (error) {
      console.error("Failed to initialize Custom AI:", error);
      throw error;
    }
  }, [addTranscriptMessage]);

  const initGeminiLiveSession = useCallback(async () => {
    try {
      console.log("🎙️ Initializing Gemini Live API Session...");
      setWsReady(false);

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Google Gemini API key not found. Please add NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY to your .env.local file.");
      }

      // Connect to Gemini Live API via WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("✅ Connected to Gemini Live API");
        
        // Send setup message
        const setupMessage = {
          setup: {
            model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: "Kore"
                  }
                }
              }
            },
            system_instruction: {
              parts: [{
                text: `You are SpeakMate, an AI English fluency coach specializing in IELTS preparation.

Your Role:
- Help users practice English conversation naturally
- Provide real-time corrections for grammar, vocabulary, and pronunciation
- Ask follow-up questions to keep the conversation flowing
- Adapt to the user's proficiency level (${selectedGoal === 'ielts' ? 'IELTS preparation' : selectedGoal === 'professional' ? 'professional communication' : 'general fluency improvement'})

Guidelines:
- Keep responses conversational and encouraging
- Speak naturally as if talking to a friend
- Provide constructive feedback when errors occurs
- Ask open-ended questions to encourage longer responses
- Be patient and supportive

Remember: You're a conversation partner, not just a teacher. Make the practice enjoyable!`
              }]
            }
          }
        };
        
        ws.send(JSON.stringify(setupMessage));
        console.log("📤 Sent Gemini setup message");
        setWsReady(true);
      };

      ws.onmessage = async (event) => {
        try {
          // Handle both binary and text messages
          let message;
          if (typeof event.data === 'string') {
            message = JSON.parse(event.data);
            console.log("📩 Gemini message:", JSON.stringify(message).substring(0, 200));
          } else if (event.data instanceof ArrayBuffer) {
            // Binary data (ArrayBuffer) - this is the audio response
            console.log("📦 Received binary audio from Gemini, length:", event.data.byteLength);
            await playGeminiAudio(event.data);
            return;
          } else if (event.data instanceof Blob) {
            // Handle Blob data
            const arrayBuffer = await event.data.arrayBuffer();
            console.log("📦 Received Blob audio from Gemini, length:", arrayBuffer.byteLength);
            await playGeminiAudio(arrayBuffer);
            return;
          } else {
            console.log("❓ Unknown data type:", typeof event.data);
            return;
          }

          // Handle setup completion
          if (message.setupComplete || message.setup_complete) {
            console.log("✅ Gemini setup complete");
            return;
          }

          // Handle server content (AI responses)
          if (message.serverContent || message.server_content) {
            const modelTurn = message.serverContent?.modelTurn || message.server_content?.model_turn;
            
            if (modelTurn?.parts) {
              for (const part of modelTurn.parts) {
                // Play audio response
                const inlineData = part.inlineData || part.inline_data;
                if (inlineData?.mimeType?.includes('audio') || inlineData?.mime_type?.includes('audio')) {
                  const audioData = inlineData.data || inlineData.data;
                  if (audioData) {
                    console.log("🔊 Received audio from Gemini");
                    await playGeminiAudio(audioData);
                  }
                }
                
                // Add text transcript
                if (part.text) {
                  console.log("💬 Gemini text:", part.text);
                  addTranscriptMessage("ai", part.text);
                }
              }
            }

            // Handle turn complete
            const turnComplete = message.serverContent?.turnComplete || message.server_content?.turn_complete;
            if (turnComplete) {
              console.log("✅ Turn complete");
            }
          }

          // Handle user transcript if provided
          const clientContent = message.clientContent || message.client_content;
          if (clientContent?.transcript) {
            console.log("🎤 User transcript:", clientContent.transcript);
            addTranscriptMessage("user", clientContent.transcript);
          }
        } catch (error) {
          console.error("Error processing Gemini message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Gemini WebSocket error:", error);
        setWsReady(false);
      };

      ws.onclose = (event) => {
        console.log("🔌 Gemini WebSocket closed:", event.code, event.reason);
        setWsReady(false);
      };

      geminiSessionRef.current = ws;
    } catch (error) {
      console.error("Failed to initialize Gemini Live API:", error);
      throw error;
    }
  }, [addTranscriptMessage, selectedGoal]);

  const playGeminiAudio = useCallback(async (arrayBuffer: ArrayBuffer) => {
    try {
      if (!geminiAudioContextRef.current) {
        geminiAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = geminiAudioContextRef.current;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Gemini sends PCM audio - convert Int16Array to Float32Array for playback
      const pcmData = new Int16Array(arrayBuffer);
      const sampleRate = 24000; // Gemini default output rate
      const audioBuffer = audioContext.createBuffer(1, pcmData.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      // Convert Int16 PCM to Float32 (-1.0 to 1.0)
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      console.log("🔊 Playing Gemini audio:", pcmData.length, "samples");
    } catch (error) {
      console.error("Failed to play Gemini audio:", error);
    }
  }, []);

  const sendAudioToCustomAI = (frame: Float32Array) => {
    try {
      const ws = customAiWsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      // Convert Float32Array to Int16Array (PCM 16kHz, 16-bit, Mono)
      const int16Buffer = new Int16Array(frame.length);
      for (let i = 0; i < frame.length; i++) {
        const sample = Math.max(-1, Math.min(1, frame[i]));
        int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      // Convert to base64
      const uint8View = new Uint8Array(int16Buffer.buffer);
      let binaryString = "";
      for (let i = 0; i < uint8View.length; i++) {
        binaryString += String.fromCharCode(uint8View[i]);
      }
      const base64Audio = btoa(binaryString);

      // Send media event to custom AI
      const message = {
        event: "media",
        media: {
          payload: base64Audio
        }
      };
      
      ws.send(JSON.stringify(message));

      // Log first chunk
      if (!(sendAudioToCustomAI as any).hasLogged) {
        console.log(`🎤 First audio chunk sent to Custom AI: ${int16Buffer.length} samples`);
        (sendAudioToCustomAI as any).hasLogged = true;
      }
    } catch (error) {
      console.error("Failed to send audio to Custom AI:", error);
    }
  };

  const sendCommitToCustomAI = () => {
    try {
      const ws = customAiWsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      // Send commit event to signal end of speech
      ws.send(JSON.stringify({ event: "commit" }));
      console.log("📤 Sent commit to Custom AI");
    } catch (error) {
      console.error("Failed to send commit to Custom AI:", error);
    }
  };

  const sendAudioToGemini = (frame: Float32Array) => {
    try {
      const ws = geminiSessionRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      // Convert Float32Array to Int16Array (PCM format)
      const int16Buffer = new Int16Array(frame.length);
      for (let i = 0; i < frame.length; i++) {
        const sample = Math.max(-1, Math.min(1, frame[i]));
        int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      // Convert to base64
      const uint8View = new Uint8Array(int16Buffer.buffer);
      let binaryString = "";
      for (let i = 0; i < uint8View.length; i++) {
        binaryString += String.fromCharCode(uint8View[i]);
      }
      const base64Audio = btoa(binaryString);

      // Send realtime input to Gemini - use correct structure
      const message = {
        realtime_input: {
          media_chunks: [{
            mime_type: "audio/pcm",
            data: base64Audio
          }]
        }
      };
      
      ws.send(JSON.stringify(message));

      // Log first chunk
      if (!(sendAudioToGemini as any).hasLogged) {
        console.log(`🎤 First audio chunk sent to Gemini: ${int16Buffer.length} samples`);
        (sendAudioToGemini as any).hasLogged = true;
      }
    } catch (error) {
      console.error("Failed to send audio to Gemini:", error);
    }
  };

  const toggleListening = useCallback(async () => {
    if (isListening) {
      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    console.log('🎤 Starting OpenAI conversation with Web Speech API');
    
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        console.log('🎤 User said:', transcript);
        
        // Send to OpenAI and get response
        await startOpenAIConversation(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access is required.');
        }
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        if (isListening) {
          // Restart if we're still supposed to be listening
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      alert('Failed to start speech recognition. Please try again.');
    }
  }, [isListening, startOpenAIConversation]);

  // Auto-start Custom AI when entering conversation screen
  // DISABLED: Custom AI auto-start - now using OpenAI with Web Speech API
  useEffect(() => {
    if (screen === "conversation" && !conversationStartedRef.current) {
      conversationStartedRef.current = true;
      console.log('🚀 OpenAI conversation mode - ready to chat');
      // OpenAI mode: User clicks to talk, we transcribe with browser, send to OpenAI, speak response
    }
    
    // Reset when leaving conversation
    if (screen !== "conversation") {
      conversationStartedRef.current = false;
    }
  }, [screen]);

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col justify-center px-8 py-12 text-center">
          <Logo className="justify-center mb-8" />
          
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            Welcome Mate!
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-12">
            Your journey to English fluency starts here
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => {
                setAuthMode("login");
                setScreen("login");
              }}
              className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg"
            >
              Login
            </button>
            
            <button
              onClick={() => {
                setAuthMode("signup");
                setScreen("signup");
              }}
              className="w-full py-4 px-6 bg-white hover:bg-gray-50 text-indigo-600 text-lg font-semibold rounded-xl border-2 border-indigo-600 transition-all transform active:scale-95"
            >
              Signup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col justify-center px-8 py-12">
          <Logo className="justify-center mb-8" />
          
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2 text-center">
            Login
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center">
            Welcome back to SpeakMate
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          
          <button
            onClick={() => {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email)) {
                alert("Please enter a valid email address.");
                return;
              }
              if (password === "1234") {
                setIsFirstTimeUser(false);
                if (selectedGoal) {
                  setScreen("dashboard");
                } else {
                  setScreen("goals");
                }
              } else {
                alert("Invalid password. Use 1234 for demo.");
              }
            }}
            disabled={!email || !password}
            className="w-full mt-8 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg"
          >
            Login
          </button>
          
          <button
            onClick={() => setScreen("welcome")}
            className="w-full mt-4 text-base text-gray-500 hover:text-indigo-600 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (screen === "signup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col justify-center px-8 py-12">
          <Logo className="justify-center mb-8" />
          
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">
            Sign Up
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
            Create your SpeakMate account
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          
          <button
            onClick={() => {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email)) {
                alert("Please enter a valid email address.");
                return;
              }
              if (email && password) {
                setScreen("otp");
              }
            }}
            disabled={!email || !password}
            className="w-full mt-8 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg"
          >
            Continue
          </button>
          
          <button
            onClick={() => setScreen("welcome")}
            className="w-full mt-4 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (screen === "otp") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col justify-center px-8 py-12">
          <Logo className="justify-center mb-8" />
          
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">
            Verify OTP
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
            Enter the code sent to {email}
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 4-digit OTP"
                maxLength={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors text-center text-2xl tracking-widest"
              />
            </div>
          </div>
          
          <button
            onClick={() => {
              if (otp === "1234") {
                setScreen("profile");
              } else {
                alert("Invalid OTP. Use 1234 for demo.");
              }
            }}
            disabled={otp.length !== 4}
            className="w-full mt-8 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg"
          >
            Verify
          </button>
          
          <button
            onClick={() => setScreen("signup")}
            className="w-full mt-4 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (screen === "profile") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 min-h-screen flex flex-col">
          {/* Header with Back Button */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 flex items-center">
            <button
              onClick={() => {
                setScreen("dashboard");
                setShowUserMenu(false);
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold text-gray-800 dark:text-white mr-6">
              Edit Profile
            </h1>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <Logo className="justify-center mb-6" />
          
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
              Hi!
            </h1>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
              Tell us a bit about yourself
            </p>
            
            <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What shall I call you?
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your preferred name"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Age
              </label>
              <select
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Select your age</option>
                {Array.from({ length: 45 }, (_, i) => i + 16).map((ageValue) => (
                  <option key={ageValue} value={ageValue}>{ageValue}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Select your gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => {
              const ageNum = parseInt(age);
              if (ageNum < 16 || ageNum > 60) {
                alert("Age must be between 16 and 60 years.");
                return;
              }
              setIsFirstTimeUser(true);
              setScreen("goals");
            }}
            disabled={!userName || !nickname || !age || !gender || parseInt(age) < 16 || parseInt(age) > 60}
            className="w-full mt-8 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg"
          >
            Next
          </button>
        </div>
      </div>
      </div>
    );
  }

  if (screen === "goals") {
    const goals = [
      { id: "ielts", icon: "📝", title: "IELTS Preparation", desc: "Ace your IELTS exam" },
      { id: "professional", icon: "💼", title: "Professional English", desc: "Business communication" },
      { id: "general", icon: "🗣️", title: "General Fluency", desc: "Everyday conversations" },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col justify-center px-8 py-12">
          <Logo className="justify-center mb-8" />
          
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
            Choose Your Goal
          </h1>
          
          <div className="space-y-4">
            {goals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={`w-full p-6 rounded-xl border-2 transition-all transform active:scale-95 text-left ${
                  selectedGoal === goal.id
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{goal.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {goal.title}
                    </h3>
                    <p className="text-base text-gray-600 dark:text-gray-400">
                      {goal.desc}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setScreen("dashboard")}
            disabled={!selectedGoal}
            className="w-full mt-8 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl transition-all transform active:scale-95 shadow-lg"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // Helper function to convert percentage to IELTS band
  const percentToIELTS = (percent: number): string => {
    if (percent >= 90) return "9.0";
    if (percent >= 85) return "8.5";
    if (percent >= 80) return "8.0";
    if (percent >= 75) return "7.5";
    if (percent >= 70) return "7.0";
    if (percent >= 65) return "6.5";
    if (percent >= 60) return "6.0";
    if (percent >= 55) return "5.5";
    if (percent >= 50) return "5.0";
    return "4.5";
  };

  // User Menu Component (renders as overlay)
  const UserMenuOverlay = () => {
    if (!showUserMenu) return null;
    
    return (
      <>
        {/* Invisible backdrop to close menu */}
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
        
        <div className="absolute top-12 right-4 z-50 w-64">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            {/* User Info */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {(nickname || "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-bold text-gray-800 dark:text-white">{userName || "User"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedGoal === "ielts" ? "IELTS Preparation" : selectedGoal === "professional" ? "Professional English" : "General Fluency"}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="p-2">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  setScreen("profile");
                }}
                className="w-full text-left text-base px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-800 dark:text-white"
              >
                📝 Edit Profile
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  setScreen("goals");
                }}
                className="w-full text-left text-base px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-800 dark:text-white"
              >
                🎯 Change Goal
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  setScreen("welcome");
                  setSelectedGoal(null);
                  setNickname("");
                  setUserName("");
                }}
                className="w-full text-left text-base px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-600"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Session Summary Screen
  if (screen === "sessionSummary") {
    const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col px-6 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Great Session!</h2>
            <p className="text-gray-600 dark:text-gray-400">You practiced for {minutes}m {seconds}s</p>
          </div>

          {/* Overall Score */}
          {sessionScores.overall !== null ? (
            <>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 mb-6 text-white text-center">
                <p className="text-sm opacity-90 mb-2">Overall Band Score</p>
                <p className="text-6xl font-bold mb-4">{sessionScores.overall.toFixed(1)}</p>
                <div className="w-full bg-white/20 rounded-full h-2.5">
                  <div 
                    className="h-2.5 rounded-full transition-all duration-500" 
                    style={{
                      width: `${Math.max(5, ((sessionScores.overall || 0) / 9) * 100)}%`,
                      background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Detailed Scores with Progress Bars */}
              <div className="space-y-4 mb-6">
                <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border-2 border-gray-100 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fluency</p>
                    <p className="text-base font-bold text-indigo-600">{sessionScores.fluency?.toFixed(1) ?? '-'}</p>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500" 
                      style={{
                        width: `${Math.max(5, ((sessionScores.fluency || 0) / 9) * 100)}%`,
                        background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e)'
                      }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border-2 border-gray-100 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Vocabulary</p>
                    <p className="text-base font-bold text-indigo-600">{sessionScores.vocabulary?.toFixed(1) ?? '-'}</p>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500" 
                      style={{
                        width: `${Math.max(5, ((sessionScores.vocabulary || 0) / 9) * 100)}%`,
                        background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e)'
                      }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border-2 border-gray-100 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Grammar</p>
                    <p className="text-base font-bold text-indigo-600">{sessionScores.grammar?.toFixed(1) ?? '-'}</p>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500" 
                      style={{
                        width: `${Math.max(5, ((sessionScores.grammar || 0) / 9) * 100)}%`,
                        background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e)'
                      }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-2xl p-4 border-2 border-gray-100 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pronunciation</p>
                    <p className="text-base font-bold text-indigo-600">{sessionScores.pronunciation?.toFixed(1) ?? '-'}</p>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500" 
                      style={{
                        width: `${Math.max(5, ((sessionScores.pronunciation || 0) / 9) * 100)}%`,
                        background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e)'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 mb-6 text-white text-center">
              <p className="text-sm opacity-90 mb-2">Keep Going!</p>
              <p className="text-lg">Have at least 3 exchanges for IELTS scores</p>
            </div>
          )}

          {/* Feedback */}
          <div className="bg-amber-50 dark:bg-gray-700 rounded-2xl p-5 mb-6 border-2 border-amber-100 dark:border-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white mb-2">Coach&apos;s Tip</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {sessionScores.feedback}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mt-auto">
            <button
              onClick={() => {
                setTranscript([]);
                setCurrentFeedback({ grammar: [], vocabulary: [], pronunciation: [] });
                setSessionStartTime(null);
                setScreen("conversation");
              }}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Practice Again
            </button>
            <button
              onClick={() => {
                setTranscript([]);
                setCurrentFeedback({ grammar: [], vocabulary: [], pronunciation: [] });
                setSessionStartTime(null);
                setScreen("dashboard");
              }}
              className="w-full py-4 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-xl transition-all border-2 border-gray-200 dark:border-gray-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conversation Screen
  if (screen === "conversation") {
    // Start session timer if not started
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }

        const handleExitConversation = async () => {
      stopStreaming();

      // Close WebSocket connections
      if (elevenLabsWsRef.current) {
        elevenLabsWsRef.current.close();
        elevenLabsWsRef.current = null;
      }

      if (customAiWsRef.current) {
        customAiWsRef.current.close();
        customAiWsRef.current = null;
      }

      setWsReady(false);
      wsReadyRef.current = false;
      window.speechSynthesis.cancel();

      // Calculate duration
      const duration = sessionStartTime
        ? Math.floor((Date.now() - sessionStartTime) / 1000)
        : 0;

      if (transcript.length > 0) {
        setIsProcessing(true);

        try {
          // 1) Get existing session summary (your current logic)
          const response = await fetch("/api/session-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript, duration }),
          });

          const summary = await response.json();

          // 2) Build a single “answer” text from user utterances
          const userAnswer = transcript
            .filter((m) => m.speaker === "user")
            .map((m) => m.text)
            .join(" ");

          // 3) Call SpeakMate-AI evaluator (GPT-4o mini backend)
          let evalScores: EvaluationResult | null = null;
          try {
            const evaluatorUrl =
              process.env.NEXT_PUBLIC_EVALUATOR_API_URL ||
              "http://localhost:4000/api/evaluate";

            const evalRes = await fetch(evaluatorUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question:
                  "Speaking practice session (general conversation / IELTS-style).",
                answer: userAnswer,
              }),
            });

            if (evalRes.ok) {
              evalScores = (await evalRes.json()) as EvaluationResult;
            } else {
              console.error(
                "Evaluator API error:",
                evalRes.status,
                await evalRes.text()
              );
            }
          } catch (e) {
            console.error("Failed to call evaluator API:", e);
          }

          // 4) Merge scores: use evaluator for bands, keep your summary text
          if (evalScores) {
            setSessionScores({
              ...summary,
              fluency: evalScores.fluency,
              vocabulary: evalScores.vocabulary,
              grammar: evalScores.grammar,
              pronunciation: evalScores.pronunciation,
              overall: evalScores.overall,
              // Combine your existing feedback + evaluator’s feedback into one string
              feedback:
                (summary.feedback ? summary.feedback + " " : "") +
                evalScores.feedback.fluency +
                " " +
                evalScores.feedback.vocabulary +
                " " +
                evalScores.feedback.grammar +
                " " +
                evalScores.feedback.pronunciation,
            });
          } else {
            // Fallback: only your summary if evaluator failed
            setSessionScores(summary);
          }

          setScreen("sessionSummary");
        } catch (error) {
          console.error("Failed to generate summary:", error);
          setScreen("dashboard");
        } finally {
          setIsProcessing(false);
        }
      } else {
        // No conversation, just go back
        setScreen("dashboard");
      }

      // Reset states
      setIsListening(false);
      setIsPaused(false);
      setSessionStartTime(null);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">SpeakMate</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 overflow-hidden px-4 py-6 space-y-4">
            {transcript.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Starting conversation...</p>
              </div>
            ) : (
              transcript.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.speaker === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.speaker === "user" 
                      ? "bg-indigo-600 text-white" 
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                  }`}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-[10px] opacity-60">{msg.timestamp || ''}</span>
                    </div>
                    <p className="text-sm">{msg.text}</p>
                    {msg.feedback && (
                      <p className="text-xs mt-2 opacity-80 border-t border-white/20 pt-2">{msg.feedback}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Real-time Feedback Panel */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border-t border-gray-200 dark:border-gray-600 px-4 py-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Real-time Feedback</p>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                <p className="font-semibold text-emerald-600 mb-1">Grammar ✓</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentFeedback.grammar.length > 0 ? currentFeedback.grammar[0] : "Good"}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                <p className="font-semibold text-blue-600 mb-1">Vocabulary</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentFeedback.vocabulary.length > 0 ? currentFeedback.vocabulary[0] : "Keep going"}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                <p className="font-semibold text-purple-600 mb-1">Pronunciation</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentFeedback.pronunciation.length > 0 ? currentFeedback.pronunciation[0] : "Clear"}
                </p>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-6">
            <div className="flex items-center justify-center gap-6">
              {/* Pause Button */}
              <button
                onClick={async () => {
                  if (isPaused) {
                    setIsPaused(false);
                    if (!isListening) {
                      await toggleListening();
                    }
                  } else {
                    setIsPaused(true);
                    if (isListening) {
                      stopStreaming();
                    }
                  }
                }}
                disabled={isProcessing}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg flex items-center justify-center transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPaused ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                )}
              </button>

              {/* Microphone Button (Center) - Always Active During Call */}
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600"
              >
                {/* Animated rings ONLY when speaking is detected */}
                {isListening && isSpeaking && (
                  <>
                    <span className="absolute w-24 h-24 rounded-full bg-indigo-400 opacity-75 animate-ping"></span>
                    <span className="absolute w-32 h-32 rounded-full bg-indigo-300 opacity-50 animate-ping animation-delay-150"></span>
                  </>
                )}
                
                {/* Microphone Icon */}
                <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>

              {/* Exit Button */}
              <button
                onClick={handleExitConversation}
                disabled={isProcessing}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg flex items-center justify-center transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              {isPaused ? "Paused" : isProcessing ? "Connecting..." : "Speaking with SpeakMate"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Detail Report Screen
  if (activeTab === "dashboard") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between">
              <Logo onClick={() => setActiveTab("home")} />
              <button
                onClick={() => setShowUserMenu(true)}
                className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold active:scale-95 transition-transform"
              >
                {(nickname || "U")[0].toUpperCase()}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 py-6 pb-24">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Detailed Report</h2>

            {/* Skills Breakdown */}
            <div className="space-y-4 mb-6">
              {[
                { name: "Fluency", score: 7.5, strength: "Good flow", improvement: "Reduce hesitation" },
                { name: "Vocabulary", score: 8.0, strength: "Rich word choice", improvement: "Learn collocations" },
                { name: "Grammar", score: 6.5, strength: "Basic structures", improvement: "Complex sentences" },
                { name: "Pronunciation", score: 7.0, strength: "Clear speech", improvement: "Intonation practice" }
              ].map((skill) => (
                <div key={skill.name} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">{skill.name}</h3>
                    <span className="text-2xl font-bold text-indigo-600">{skill.score}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-green-600"><strong>Strength:</strong> {skill.strength}</p>
                    <p className="text-orange-600"><strong>Improve:</strong> {skill.improvement}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Test History */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">Simulation Tests</h3>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Average Score</p>
                <p className="text-2xl font-bold text-indigo-600">7.5</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { date: "Nov 25, 2025", part: "Part 1", score: 7.5 },
                { date: "Nov 20, 2025", part: "Part 2", score: 7.0 },
                { date: "Nov 15, 2025", part: "Part 3", score: 8.0 }
              ].map((test, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{test.part}</p>
                      <p className="text-xs text-gray-500">{test.date}</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{test.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg mt-auto">
            <div className="px-4 py-3 flex justify-around">
              <NavButton icon="🏠" label="Home" active={false} onClick={() => setActiveTab("home")} />
              <NavButton icon="📊" label="Dashboard" active={true} onClick={() => setActiveTab("dashboard")} />
              <NavButton icon="⚙️" label="Settings" active={false} onClick={() => setActiveTab("settings")} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Settings Screen
  if (activeTab === "settings") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between">
              <Logo onClick={() => setActiveTab("home")} />
              <button
                onClick={() => setShowUserMenu(true)}
                className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold active:scale-95 transition-transform"
              >
                {(nickname || "U")[0].toUpperCase()}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 py-6 pb-24">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Settings</h2>

            <div className="space-y-2">
              <button className="w-full text-left px-4 py-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow">
                <span className="text-gray-800 dark:text-white">📄 Terms & Conditions</span>
              </button>
              <button className="w-full text-left px-4 py-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow">
                <span className="text-gray-800 dark:text-white">🔒 Privacy Policy</span>
              </button>
              <button className="w-full text-left px-4 py-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow">
                <span className="text-gray-800 dark:text-white">📧 Contact Us</span>
              </button>
              <button className="w-full text-left px-4 py-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow">
                <span className="text-gray-800 dark:text-white">🔔 Notifications</span>
              </button>
              
              {/* Social Media */}
              <div className="px-4 py-4 bg-white dark:bg-gray-800 rounded-xl shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Follow Us</p>
                <div className="flex gap-4 justify-center">
                  {/* Facebook */}
                  <button className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center hover:opacity-80 transition-opacity">
                    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                  {/* Instagram */}
                  <button className="w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center hover:opacity-80 transition-opacity">
                    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </button>
                  {/* YouTube */}
                  <button className="w-10 h-10 rounded-full bg-[#FF0000] flex items-center justify-center hover:opacity-80 transition-opacity">
                    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </button>
                  {/* TikTok */}
                  <button className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover:opacity-80 transition-opacity">
                    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                  </button>
                  {/* LinkedIn */}
                  <button className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center hover:opacity-80 transition-opacity">
                    <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <button className="w-full text-left px-4 py-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow">
                <span className="text-gray-800 dark:text-white">💬 Feedback</span>
              </button>
              <button 
                onClick={() => {
                  setScreen("welcome");
                  setSelectedGoal(null);
                  setActiveTab("home");
                }}
                className="w-full text-left px-4 py-4 bg-red-50 dark:bg-red-900/20 rounded-xl shadow hover:shadow-lg transition-shadow">
                <span className="text-red-600">🚪 Log Out</span>
              </button>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg mt-auto">
            <div className="px-4 py-3 flex justify-around">
              <NavButton icon="🏠" label="Home" active={false} onClick={() => setActiveTab("home")} />
              <a href="/general/dashboard" className="flex-1 flex flex-col items-center py-2 transition-colors">
                <span className="text-2xl mb-1">📊</span>
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Dashboard</span>
              </a>
              <NavButton icon="⚙️" label="Settings" active={true} onClick={() => setActiveTab("settings")} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard - IELTS Preparation
  if (selectedGoal === "ielts") {
    return (
      <>
        <UserMenuOverlay />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
          <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="scale-125 origin-left"><Logo onClick={() => setActiveTab("home")} /></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[80px]">{nickname || "User"}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">IELTS Preparation</p>
                </div>
                <button
                  onClick={() => setShowUserMenu(true)}
                  className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-base font-bold active:scale-95 transition-transform flex-shrink-0"
                >
                  {(nickname || "U")[0].toUpperCase()}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col px-4 py-3 overflow-y-auto">
            {/* Progress Summary */}
            <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 mb-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] border-2 border-white/80 backdrop-blur-sm flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-gray-800 dark:text-white">Progress Summary</h3>
                <a 
                  href="/ielts/dashboard"
                  className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
                  Details
                </a>
              </div>            <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Total conversation time</p>
                  <p className="text-base font-bold text-gray-800 dark:text-white">12h 30m</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Overall proficiency</p>
                  <p className="text-base font-bold text-indigo-600">7.5</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(7.5 / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Fluency</p>
                  <p className="text-base font-bold text-indigo-600">{percentToIELTS(75)}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(parseFloat(percentToIELTS(75)) / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Vocabulary</p>
                  <p className="text-base font-bold text-indigo-600">{percentToIELTS(82)}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(parseFloat(percentToIELTS(82)) / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Grammar</p>
                  <p className="text-base font-bold text-indigo-600">{percentToIELTS(68)}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(parseFloat(percentToIELTS(68)) / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Pronunciation</p>
                  <p className="text-base font-bold text-indigo-600">{percentToIELTS(71)}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(parseFloat(percentToIELTS(71)) / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Simulation test taken</p>
                  <p className="text-base font-bold text-gray-800 dark:text-white">8</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Average score</p>
                  <p className="text-base font-bold text-gray-800 dark:text-white">7.5</p>
                </div>
              </div>
            </div>

            {/* Main Action Cards */}
            <div className="grid grid-cols-3 gap-3 mb-7">
              {/* 1. Hang out with SpeakMate */}
              <a 
                href="/hangout?goal=ielts"
                className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-gray-800 dark:text-white leading-tight">Hangout with SpeakMate</p>
              </a>

              {/* 2. IELTS Simulation Test */}
              <a 
                href="/ielts/simulation"
                className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-yellow-400 to-lime-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-gray-800 dark:text-white leading-tight">Simulation Test</p>
              </a>

              {/* 3. IELTS Test Videos */}
              <a 
                href="/ielts/videos"
                className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.10-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
                </svg>
                </div>
                <p className="text-xs font-semibold text-gray-800 dark:text-white leading-tight">Watch Test Videos</p>
              </a>
            </div>

            {/* Ad Space */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-10 mb-7 text-center border-2 border-dashed border-gray-300 dark:border-gray-500">
              <p className="text-base text-gray-500 dark:text-gray-400 font-medium">Place your ad</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">(430 px x 120 px)</p>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg mt-auto">
            <div className="px-4 py-3 flex justify-around">
              <NavButton icon="🏠" label="Home" active={true} onClick={() => setActiveTab("home")} />
              <a href="/ielts/dashboard" className="flex-1 flex flex-col items-center py-2 transition-colors">
                <span className="text-2xl mb-1">📊</span>
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Dashboard</span>
              </a>
              <NavButton icon="⚙️" label="Settings" active={false} onClick={() => setActiveTab("settings")} />
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Dashboard - Professional English
  if (selectedGoal === "professional") {
    return (
      <>
        <UserMenuOverlay />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="scale-125 origin-left"><Logo onClick={() => setActiveTab("home")} /></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[80px]">{nickname || "User"}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">Professional English</p>
                </div>
                <button
                  onClick={() => setShowUserMenu(true)}
                  className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-base font-bold active:scale-95 transition-transform flex-shrink-0"
                >
                  {(nickname || "U")[0].toUpperCase()}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col px-4 py-3 overflow-y-auto">
            {/* Progress Summary */}
            <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 mb-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] border-2 border-white/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-gray-800 dark:text-white">Progress Summary</h3>
                <a 
                  href="/professional/dashboard"
                  className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
                  Details
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Total conversation time</p>
                  <p className="text-base font-bold text-gray-800 dark:text-white">15h 45m</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Overall proficiency</p>
                  <p className="text-base font-bold text-indigo-600">8.0</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(8.0 / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Fluency</p>
                  <p className="text-base font-bold text-indigo-600">{percentToIELTS(85)}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(parseFloat(percentToIELTS(85)) / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Vocabulary</p>
                  <p className="text-base font-bold text-indigo-600">{percentToIELTS(88)}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(parseFloat(percentToIELTS(88)) / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Grammar</p>
                  <p className="text-base font-bold text-indigo-600">{percentToIELTS(80)}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(parseFloat(percentToIELTS(80)) / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Pronunciation</p>
                  <p className="text-base font-bold text-indigo-600">{percentToIELTS(83)}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-1.5 rounded-full transition-all duration-500" 
                      style={{
                        width: `${(parseFloat(percentToIELTS(83)) / 9) * 100}%`,
                        background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Real-time situation faced</p>
                  <p className="text-base font-bold text-gray-800 dark:text-white">12</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Average score</p>
                  <p className="text-base font-bold text-gray-800 dark:text-white">8.5</p>
                </div>
              </div>
            </div>

            {/* Main Action Cards */}
            <div className="grid grid-cols-3 gap-3 mb-7">
              {/* 1. Hang out with SpeakMate */}
              <a 
                href="/hangout?goal=professional"
                className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-gray-800 dark:text-white leading-tight">Hangout with SpeakMate</p>
              </a>

              {/* 2. Practice Real Situation */}
              <a href="/professional/situations" className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center">
                <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-yellow-400 to-lime-500 flex items-center justify-center text-xl">💼</div>
                <p className="text-[11px] font-semibold text-gray-800 dark:text-white leading-tight">Practice in Real Situation</p>
              </a>

              {/* 3. Real Situation Videos */}
              <a href="/professional/videos" className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center">
                <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.10-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-gray-800 dark:text-white leading-tight">Real Situation Videos</p>
              </a>
            </div>

            {/* Ad Space */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-10 mb-7 text-center border-2 border-dashed border-gray-300 dark:border-gray-500">
              <p className="text-base text-gray-500 dark:text-gray-400 font-medium">Place your ad</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">(430 px x 120 px)</p>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg mt-auto">
            <div className="px-4 py-3 flex justify-around">
              <NavButton icon="🏠" label="Home" active={true} onClick={() => setActiveTab("home")} />
              <a href="/professional/dashboard" className="flex-1 flex flex-col items-center py-3 transition-colors">
                <span className="text-2xl mb-1">📊</span>
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Dashboard</span>
              </a>
              <NavButton icon="⚙️" label="Settings" active={false} onClick={() => setActiveTab("settings")} />
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Dashboard - General Fluency
  return (
    <>
      <UserMenuOverlay />
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="scale-125 origin-left"><Logo onClick={() => setActiveTab("home")} /></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[80px]">{nickname || "User"}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">General English</p>
              </div>
              <button
                onClick={() => setShowUserMenu(true)}
                className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-base font-bold active:scale-95 transition-transform flex-shrink-0"
              >
                {(nickname || "U")[0].toUpperCase()}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col px-4 py-3 overflow-y-auto">
          {/* Progress Summary */}
          <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 mb-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] border-2 border-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800 dark:text-white">Progress Summary</h3>
              <a 
                href="/general/dashboard"
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
                Details
              </a>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Total conversation time</p>
                <p className="text-base font-bold text-gray-800 dark:text-white">18h 20m</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Overall proficiency</p>
                <p className="text-base font-bold text-indigo-600">7.5</p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-500" 
                    style={{
                      width: `${(7.5 / 9) * 100}%`,
                      background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Fluency</p>
                <p className="text-base font-bold text-indigo-600">{percentToIELTS(78)}</p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-500" 
                    style={{
                      width: `${(parseFloat(percentToIELTS(78)) / 9) * 100}%`,
                      background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Vocabulary</p>
                <p className="text-base font-bold text-indigo-600">{percentToIELTS(80)}</p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-500" 
                    style={{
                      width: `${(parseFloat(percentToIELTS(80)) / 9) * 100}%`,
                      background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Grammar</p>
                <p className="text-base font-bold text-indigo-600">{percentToIELTS(72)}</p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-500" 
                    style={{
                      width: `${(parseFloat(percentToIELTS(72)) / 9) * 100}%`,
                      background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Pronunciation</p>
                <p className="text-base font-bold text-indigo-600">{percentToIELTS(75)}</p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-500" 
                    style={{
                      width: `${(parseFloat(percentToIELTS(75)) / 9) * 100}%`,
                      background: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6)'
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Real-time situation faced</p>
                <p className="text-base font-bold text-gray-800 dark:text-white">15</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">Average score</p>
                <p className="text-base font-bold text-gray-800 dark:text-white">8.0</p>
              </div>
            </div>
          </div>

          {/* Main Action Cards */}
          <div className="grid grid-cols-3 gap-3 mb-7">
            {/* 1. Hang out with SpeakMate */}
            <a 
              href="/hangout?goal=general"
              className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center"
            >
              <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-gray-800 dark:text-white leading-tight">Hangout with SpeakMate</p>
            </a>

            {/* 2. Practice Real Situation */}
            <a href="/general/situations" className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center">
              <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-yellow-400 to-lime-500 flex items-center justify-center text-xl">☕</div>
              <p className="text-[11px] font-semibold text-gray-800 dark:text-white leading-tight">Practice in Real Situation</p>
            </a>

            {/* 3. Real Situation Videos */}
            <a href="/general/videos" className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.15),0_3px_6px_rgba(255,255,255,0.9)_inset,0_-2px_6px_rgba(0,0,0,0.1)_inset] text-center hover:shadow-2xl transition-all active:scale-95 border-2 border-white/80 backdrop-blur-sm aspect-square flex flex-col items-center justify-center">
              <div className="w-9 h-9 mb-2 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.10-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-gray-800 dark:text-white leading-tight">Real Situation Videos</p>
            </a>
          </div>

          {/* Ad Space */}
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-10 mb-7 text-center border-2 border-dashed border-gray-300 dark:border-gray-500">
            <p className="text-base text-gray-500 dark:text-gray-400 font-medium">Place your ad</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">(430 px x 120 px)</p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg mt-auto">
          <div className="px-4 py-3 flex justify-around">
            <NavButton icon="🏠" label="Home" active={true} onClick={() => setActiveTab("home")} />
            <a href="/general/dashboard" className="flex-1 flex flex-col items-center py-3 transition-colors">
              <span className="text-2xl mb-1">📊</span>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Dashboard</span>
            </a>
            <NavButton icon="⚙️" label="Settings" active={false} onClick={() => setActiveTab("settings")} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function PracticeCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer group active:scale-95">
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-white">{title}</span>
      <span className="text-indigo-600">→</span>
    </div>
  );
}

function ScenarioCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer group active:scale-95 flex items-center gap-4">
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform flex-shrink-0">
        {icon}
      </div>
      <h4 className="font-semibold text-gray-800 dark:text-white">{title}</h4>
    </div>
  );
}

function VideoCard({ thumbnail, title, duration }: { thumbnail: string; title: string; duration: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer group active:scale-95">
      <div className="relative">
        <img src={thumbnail} alt={title} className="w-full h-40 object-cover" />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {duration}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-sm text-gray-800 dark:text-white line-clamp-2">{title}</h4>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active = false, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center py-2 transition-colors active:scale-95 ${
        active
          ? "text-indigo-600"
          : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
      }`}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-gray-600 dark:text-gray-300">Loading...</div>
    </div>}>
      <HomeContent />
    </Suspense>
  );
}
