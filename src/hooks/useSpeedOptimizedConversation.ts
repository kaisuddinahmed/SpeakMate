import { useEffect, useRef, useState, useCallback } from 'react';

type ConversationState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const SPEAKMATE_SYSTEM_PROMPT = `
You are SpeakMate—a calm, neutral, peer-like speaking partner.
NOT a teacher. NOT an examiner. NOT a coach.
You never talk about practice, learning, exams, IELTS, scores, mistakes, grammar rules, or lessons.
You simply have pleasant, human-like conversations.

CORE BEHAVIOR:
- **Style**: Casual, friendly, peer-like. NOT a therapist. NOT an interviewer.
- **Rule**: 1. REACT/ANSWER -> 2. FOLLOW-UP. (Max 40 words total).
- **Structure**:
  - IF User asks "What about you?": ANSWER relevantly first! Then ask back.
  - IF User shares something: React naturally ("Oh nice!", "That sucks.") before asking.
  - DO NOT say "That sounds X" constantly. vary your reactions.
- **Question Strategy**: Simple, natural questions. Don't be too deep ("What's holding you back?" -> NO).
- **Ratio**: User 70% / AI 30%.
- **Audio**: Never describe audio/sounds.

ALLOWED TOPICS (Assign input to one of these):
1. personal (Hometown, family)
2. work_study (Job, education)
3. daily_life (Routines)
4. hobbies (Sports, games)
5. social_life (Friends)
6. food_drink (Cooking)
7. places_travel (Trips)
8. technology (Apps, media)
9. experiences (Memories)
10. nature (Weather)
11. abstract (Dreams)
12. festivals (Holidays)
*If OUT_OF_SCOPE: Gently redirect to a related topic.*

TRANSITIONS:
- Use bridge phrases (e.g. "Speaking of food, have you tried...?").

EMOTIONAL SAFETY:
- If sure, ignore empty/partial inputs.
- If anxious, reassure gently.
`.trim();

export function useSpeedOptimizedConversation() {
    // --- 1. State & Refs ---
    const [state, setState] = useState<ConversationState>('IDLE');
    const stateRef = useRef<ConversationState>('IDLE');

    const [messages, setMessages] = useState<Message[]>([]);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [volume, setVolume] = useState(0);
    const [silenceStage, setSilenceStage] = useState<'none' | 'timer' | 'encourage' | 'checkin'>('none');

    // Resources
    const sttWsRef = useRef<WebSocket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null); // For TTS playback
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const volumeIntervalRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null); // For Mic/STT only
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- 1.5 Smart Turn Detection ---
    const isCompleteThought = (text: string) => {
        const t = text.trim();
        if (t.length < 5) return false; // Too short (e.g. "Um", "Yeah") - Wait for more

        // Check for connectors at the end (ignoring punctuation)
        const lower = t.toLowerCase().replace(/[.,!?]$/, '');
        const connectors = ['and', 'but', 'so', 'or', 'because', 'then', 'well', 'however'];
        if (connectors.some(c => lower.endsWith(' ' + c) || lower === c)) return false;

        // Check for sentence completion (Deepgram usually adds punctuation)
        // If it DOESN'T end in . ! ?, assume incomplete
        // But Deepgram is aggressive with periods, so we rely more on the connector check above.
        // We will stricter the length check.

        return true;
    };

    // --- 2. FSM Helpers ---
    const transition = useCallback((next: ConversationState) => {
        console.log(`[FSM] Transition: ${stateRef.current} -> ${next}`);
        stateRef.current = next;
        setState(next);
    }, []);

    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = '';
            audioRef.current = null;
        }
    }, []);

    // --- 3. External Services (STT, LLM, TTS) ---

    // A. STT (Deepgram WebSocket)
    const connectSTT = useCallback(async () => {
        try {
            const response = await fetch('/api/deepgram');
            const { key } = await response.json();
            if (!key) throw new Error('No Deepgram Key');

            // Setup Mic
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 16000
                }
            });
            mediaStreamRef.current = stream;

            // Setup Mic AudioContext (just for analyzing volume & raw PCM for STT)
            const ctx = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);

            // Analyser (Volume)
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Processor (Send PCM to STT)
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            source.connect(processor);
            processor.connect(ctx.destination);

            // Setup WebSocket
            const ws = new WebSocket(
                'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&interim_results=true&endpointing=1500&encoding=linear16&sample_rate=16000&channels=1',
                ['token', key]
            );
            sttWsRef.current = ws;

            ws.onopen = () => {
                console.log('✅ STT Connected');
                // KeepAlive
                keepAliveIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'KeepAlive' }));
                    }
                }, 3000);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const transcript = data.channel?.alternatives?.[0]?.transcript;

                if (transcript) {
                    // BARGE-IN LOGIC
                    if (stateRef.current === 'SPEAKING' || stateRef.current === 'THINKING') {
                        console.log('🛑 Barge-In Detected! Stopping AI...');
                        stopAudio();
                        transition('LISTENING');
                        // Note: The async handleUserTurnComplete will be aborted via checks
                    }

                    if (data.is_final) {
                        console.log('🎤 User Input:', transcript);
                        setInterimTranscript('');

                        // 1. Add to history
                        setMessages(prev => [...prev, { role: 'user', content: transcript, timestamp: Date.now() }]);

                        // 2. Smart Turn-Taking
                        if (isCompleteThought(transcript)) {
                            handleUserTurnComplete(transcript);
                        } else {
                            console.log('⏳ Incomplete thought. Waiting...');
                        }
                    } else {
                        // Show interim
                        setInterimTranscript(transcript);
                    }
                }
            };

            // Audio Process Loop (Always Send Audio for Continuous Listening)
            processor.onaudioprocess = (e) => {
                if (sttWsRef.current?.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]));
                        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    sttWsRef.current.send(pcm16.buffer);
                }
            };

            // Volume Loop
            const updateVolume = () => {
                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                    setVolume(average / 128);
                }
                volumeIntervalRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

        } catch (error) {
            console.error('STT Setup Failed', error);
            transition('ERROR');
        }
    }, [transition, stopAudio]); // Added stopAudio to dependencies

    // B. LLM (Groq - Full Response)
    const fetchLLMResponse = async (userText: string) => {
        console.log('🧠 Thinking...');
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SPEAKMATE_SYSTEM_PROMPT },
                    ...messages.map(m => ({ role: m.role, content: m.content })),
                    { role: 'user', content: userText },
                ],
                stream: false, // Wait for full response (Atomic)
                temperature: 0.7,
                max_tokens: 150,
            }),
        });

        const data = await response.json();
        const aiText = data.choices[0]?.message?.content || "I didn't catch that.";
        return aiText;
    };

    // C. TTS (Deepgram REST - Full Audio)
    const synthesizeSpeech = async (text: string): Promise<HTMLAudioElement> => {
        console.log('🗣️ Synthesizing:', text);
        const response = await fetch('/api/deepgram');
        const { key } = await response.json();

        // Use REST API for simplicity & robustness
        const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-2-iris-en', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const blob = await ttsResponse.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        return audio;
    };

    // --- 4. Main Actions (The "Driver") ---

    const handleUserTurnComplete = async (text: string) => {
        transition('THINKING');

        try {
            // 1. Get LLM Response
            const aiText = await fetchLLMResponse(text);

            // Check if we were interrupted (Barge-In)
            if (stateRef.current !== 'THINKING') {
                console.log('🛑 Aborting LLM Playback due to Barge-In');
                return;
            }

            // DELAY UI to match Audio Latency
            setTimeout(() => {
                // Double check before showing
                if (stateRef.current === 'SPEAKING' || stateRef.current === 'THINKING') {
                    setMessages(prev => [...prev, { role: 'assistant', content: aiText, timestamp: Date.now() }]);
                }
            }, 1000);

            // 2. Synthesize Audio
            const audio = await synthesizeSpeech(aiText);

            // Check interruption again
            if (stateRef.current !== 'THINKING') {
                console.log('🛑 Aborting TTS Playback due to Barge-In');
                return;
            }

            // 3. Play
            transition('SPEAKING'); // Mic is ignored here (Wait, Mic is active now!)
            audioRef.current = audio;

            audio.onended = () => {
                console.log('✅ Playback finished.');
                audioRef.current = null;
                transition('LISTENING');
            };

            audio.onerror = (e) => {
                console.error('Playback error', e);
                transition('ERROR');
            };

            await audio.play();

        } catch (error) {
            console.error('Turn Error:', error);
            transition('ERROR');
        }
    };

    // --- 4.5 Silence Monitoring ---
    useEffect(() => {
        // Clear existing timer on any change
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        // Only monitor in LISTENING state, and if user is NOT speaking (no interim)
        if (state === 'LISTENING' && !interimTranscript) {
            setSilenceStage('none'); // Start fresh

            const startTime = Date.now();
            silenceTimerRef.current = setInterval(() => {
                const elapsed = Date.now() - startTime;

                if (elapsed > 20000) {
                    setSilenceStage('checkin'); // > 20s
                } else if (elapsed > 15000) {
                    setSilenceStage('encourage'); // > 15s
                } else if (elapsed > 8000) {
                    setSilenceStage('timer'); // > 8s
                }
            }, 1000);
        } else {
            // If speaking or not listening, reset stage
            setSilenceStage('none');
        }

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [state, interimTranscript]);

    // --- 5. Lifecycle ---
    const startListening = useCallback(async () => {
        if (stateRef.current !== 'IDLE') return;

        // Initial Startup
        await connectSTT();

        // Send Greeting
        setTimeout(async () => {
            // 1. Get Name & Last Visit
            const fullName = localStorage.getItem('speakmate_userName') || 'Friend';
            const firstName = fullName.split(' ')[0];
            const lastVisitStr = localStorage.getItem('speakmate_lastVisit');
            const now = Date.now();

            let greeting = '';

            if (!lastVisitStr) {
                // 1. First Time User
                greeting = `Hi ${firstName}! I'm SpeakMate. I'm really happy to meet you. How are you doing today?`;
            } else {
                // 2. Existing User Logic
                const lastVisit = parseInt(lastVisitStr, 10);
                const diffMs = now - lastVisit;
                const diffHours = diffMs / (1000 * 60 * 60);
                const diffDays = diffHours / 24;

                const variations = {
                    justNow: [
                        `Welcome back ${firstName}! Did you want to carry on with what we were saying?`,
                        `Hey ${firstName}! Back so soon? What's on your mind?`,
                        `Hi again ${firstName}! Ready to continue where we left off?`
                    ],
                    laterToday: [
                        `Hey again ${firstName}! How's the rest of your day turning out?`,
                        `Hi ${firstName}! How has your day been going since we last spoke?`,
                        `Good to see you again ${firstName}. How are things going?`
                    ],
                    nextDay: [
                        `Hi ${firstName}! Ready for our daily chat? How was your day?`,
                        `Hey ${firstName}! How have you been since yesterday?`,
                        `Welcome back ${firstName}. Tell me about your day!`
                    ],
                    fewDays: [
                        `Hey ${firstName}! Nice to see you back. How has your week been going?`,
                        `Hi ${firstName}! It's been a few days. What have you been up to?`,
                        `Good to see you ${firstName}. How's your week treating you?`
                    ],
                    longTime: [
                        `Hey ${firstName}! It's been a while, so good to hear your voice again! How have you been?`,
                        `Long time no see, ${firstName}! I missed our chats. How are you?`,
                        `Welcome back ${firstName}! It's been a bit. What's new with you?`
                    ]
                };

                const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

                if (diffHours < 3) {
                    greeting = pick(variations.justNow);
                } else if (diffHours < 12) {
                    greeting = pick(variations.laterToday);
                } else if (diffHours < 48) {
                    greeting = pick(variations.nextDay);
                } else if (diffDays < 7) {
                    greeting = pick(variations.fewDays);
                } else {
                    greeting = pick(variations.longTime);
                }
            }

            // Update Last Visit
            localStorage.setItem('speakmate_lastVisit', now.toString());

            // 2. Add to Chat UI (Delayed)
            setTimeout(() => {
                setMessages([{ role: 'assistant', content: greeting, timestamp: Date.now() }]);
            }, 1500);

            // 3. Synthesize & Play
            try {
                transition('THINKING');
                const audio = await synthesizeSpeech(greeting);

                transition('SPEAKING'); // Mic is ignored here
                audioRef.current = audio;

                audio.onended = () => {
                    audioRef.current = null;
                    console.log('✅ Greeting finished. Listening...');
                    transition('LISTENING');
                };

                audio.onerror = () => {
                    console.error('Greeting playback failed');
                    transition('ERROR');
                };

                await audio.play();
            } catch (error) {
                console.error('Greeting failed:', error);
                console.error('Greeting failed:', error);
                transition('LISTENING');
            }
        }, 1000);

    }, [connectSTT, transition]);

    const stopListening = useCallback(() => {
        stopAudio();
        sttWsRef.current?.close();
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);

        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (volumeIntervalRef.current) cancelAnimationFrame(volumeIntervalRef.current);

        transition('IDLE');
        setMessages([]);
        setInterimTranscript('');
    }, [transition, stopAudio]);

    // --- 5. Session Persistence (Fix for 0.0 Score) ---
    useEffect(() => {
        if (messages.length > 0) {
            const transcript = messages.map(m => ({
                speaker: m.role === 'user' ? 'user' : 'ai',
                text: m.content,
                timestamp: new Date(m.timestamp).toLocaleTimeString()
            }));
            sessionStorage.setItem('hangoutTranscript', JSON.stringify(transcript));
            sessionStorage.setItem('conversationHistory', JSON.stringify(messages));
        }
    }, [messages]);

    return {
        state: stateRef.current,
        messages,
        interimTranscript,
        volume,
        startListening, // Call this to boot up
        stopListening,  // Cleanup

        // Compatibility props for UI if needed
        isListening: state === 'LISTENING',
        isAISpeaking: state === 'SPEAKING' || state === 'THINKING',
        silenceStage
    };
}