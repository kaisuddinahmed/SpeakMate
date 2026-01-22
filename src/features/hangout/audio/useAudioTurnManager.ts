import { useEffect, useRef, useState, useCallback } from 'react';

export type ConversationState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface AudioTurnManagerProps {
    onUserTurn: (text: string, history: Message[]) => void;
}

export function useAudioTurnManager({ onUserTurn }: AudioTurnManagerProps) {
    // --- 1. State & Refs ---
    const [state, setState] = useState<ConversationState>('IDLE');
    const stateRef = useRef<ConversationState>('IDLE');

    const [messages, setMessages] = useState<Message[]>([]);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [volume, setVolume] = useState(0);

    // Resources
    const sttWsRef = useRef<WebSocket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const volumeIntervalRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const lastProcessedRef = useRef<{ text: string, time: number } | null>(null);

    const messagesRef = useRef<Message[]>([]);

    // Sync Ref
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // --- 1.5 Smart Turn Detection ---
    const isCompleteThought = (text: string) => {
        const t = text.trim();
        if (t.length < 5) return false;
        const lower = t.toLowerCase().replace(/[.,!?]$/, '');
        const connectors = ['and', 'but', 'so', 'or', 'because', 'then', 'well', 'however'];
        if (connectors.some(c => lower.endsWith(' ' + c) || lower === c)) return false;
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

    const cleanupResources = useCallback(() => {
        stopAudio();
        sttWsRef.current?.close();
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (volumeIntervalRef.current) cancelAnimationFrame(volumeIntervalRef.current);
    }, [stopAudio]);

    // Cleanup on Unmount
    useEffect(() => {
        return () => {
            cleanupResources();
        };
    }, [cleanupResources]);

    // --- 3. External Services (STT Only) ---
    const connectSTT = useCallback(async () => {
        try {
            // Force Cleanup First (Avoid Zombies)
            cleanupResources();

            const response = await fetch('/api/deepgram');
            const { key } = await response.json();
            if (!key) throw new Error('No Deepgram Key');

            // Setup Mic (Echo Cancellation)
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

            const ctx = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Audio Process for STT
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
                    // BARGE-IN logic
                    if (stateRef.current === 'SPEAKING' || stateRef.current === 'THINKING') {
                        console.log('🛑 Barge-In Detected! Stopping AI...');
                        stopAudio();
                        transition('LISTENING');
                    }

                    if (data.is_final) {
                        // Deduplication Check
                        const now = Date.now();
                        if (lastProcessedRef.current &&
                            lastProcessedRef.current.text === transcript &&
                            (now - lastProcessedRef.current.time) < 1000) {
                            console.warn('⚠️ Duplicate Transcript Ignored:', transcript);
                            return;
                        }
                        lastProcessedRef.current = { text: transcript, time: now };

                        console.log('🎤 User Input:', transcript);
                        setInterimTranscript('');

                        // Use Ref for Sync History
                        const currentHistory = messagesRef.current;
                        const newMessage: Message = { role: 'user', content: transcript, timestamp: Date.now() };
                        const newHistory = [...currentHistory, newMessage];

                        setMessages(newHistory);

                        // Smart Turn Check
                        if (isCompleteThought(transcript)) {
                            onUserTurn(transcript, newHistory);
                        } else {
                            console.log('⏳ Incomplete thought. Waiting...');
                        }
                    } else {
                        setInterimTranscript(transcript);
                    }
                }
            };

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

            // Volume
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
    }, [transition, onUserTurn, cleanupResources, stopAudio]);

    // --- 4. Speech Actions (Exposed to Brain) ---
    const speak = useCallback(async (text: string) => {
        // Only accept speech requests if not already speaking (unless logic overrides)
        // But Controller handles logic. We just obey.

        // 1. Add to UI
        // Delay slightly if you want to sync, but usually prompt latency is enough.
        setMessages(prev => [...prev, { role: 'assistant', content: text, timestamp: Date.now() }]);

        try {
            transition('SPEAKING');
            const response = await fetch('/api/deepgram');
            const { key } = await response.json();

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

            // Check for barge-in before playing
            if (stateRef.current === 'LISTENING') {
                console.log('🛑 Aborting TTS play: User barged in during synthesis.');
                return;
            }

            audioRef.current = audio;
            audio.onended = () => {
                audioRef.current = null;
                console.log('✅ Playback finished.');
                transition('LISTENING');
            };

            await audio.play();

        } catch (err) {
            console.error('Speech synthesis failed', err);
            transition('ERROR');
        }
    }, [transition]);

    const setThinking = useCallback(() => {
        transition('THINKING');
    }, [transition]);

    const isConnectingRef = useRef(false);

    // --- 5. Lifecycle ---
    const startListening = useCallback(async () => {
        if (stateRef.current !== 'IDLE' || isConnectingRef.current) return;
        isConnectingRef.current = true;

        try {
            await connectSTT();
            transition('LISTENING');
        } catch (error) {
            console.error('Failed to start listening:', error);
            transition('ERROR');
        } finally {
            isConnectingRef.current = false;
        }
    }, [connectSTT, transition]);

    const stopListening = useCallback(() => {
        stopAudio();
        sttWsRef.current?.close();
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (volumeIntervalRef.current) cancelAnimationFrame(volumeIntervalRef.current);

        transition('IDLE');
        setMessages([]);
        setInterimTranscript('');
    }, [transition, stopAudio]);

    // Persistence
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
        state,
        messages,
        interimTranscript,
        volume,
        startListening,
        stopListening,
        speak,
        setThinking,
        isListening: state === 'LISTENING',
        isAISpeaking: state === 'SPEAKING' || state === 'THINKING'
    };
}
