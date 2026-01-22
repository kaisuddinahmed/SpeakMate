"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface RealtimeConnection {
    isConnected: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    startSession: () => Promise<void>;
    stopSession: () => void;
    sendSystemInstruction: (text: string) => void;
    triggerResponse: () => void;
    toggleMute: () => void;
    isMuted: boolean;
    error: string | null;
}

interface UseRealtimeConnectionProps {
    onUserTranscript?: (text: string) => void;
    onAiTranscript?: (text: string) => void;
}

// VAD Constants
const VAD_THRESHOLD = -50;  // dB (Adjust based on mic, -50 is typical for "Quiet")
const SILENCE_DURATION = 500; // ms to wait after speech stops before triggering turn (LOWERED for speed)

export function useRealtimeConnection({
    onUserTranscript,
    onAiTranscript,
}: UseRealtimeConnectionProps): RealtimeConnection {
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false); // UI State: "Listening for user"
    const [isProcessing, setIsProcessing] = useState(false); // UI State: "Thinking..."
    const [isSpeaking, setIsSpeaking] = useState(false);    // UI State: "AI Speaking"
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Turn-Based Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const conversationHistoryRef = useRef<{ role: "system" | "user" | "assistant"; content: string }[]>([]);
    const lastAiResponseRef = useRef<string>(""); // For Semantic Echo Cancellation

    // VAD Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const hasSpokenRef = useRef(false); // Valid speech detected in this turn
    const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Config
    const isSessionActiveRef = useRef(false);

    // Setup Audio Player
    useEffect(() => {
        const audio = new Audio();
        audioPlayerRef.current = audio;
        return () => {
            audio.pause();
            audio.src = "";
            stopVAD();
        };
    }, []);

    const stopSession = useCallback(() => {
        console.log("[TurnRef] Stopping session...");
        isSessionActiveRef.current = false;
        lastAiResponseRef.current = "";

        stopVAD();

        // Stop Context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        // Stop Recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }

        // Stop Stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        // Stop Audio
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = "";
        }

        setIsConnected(false);
        setIsListening(false);
        setIsProcessing(false);
        setIsSpeaking(false);
        setError(null);
    }, []);

    const stopVAD = () => {
        if (vadIntervalRef.current) {
            clearInterval(vadIntervalRef.current);
            vadIntervalRef.current = null;
        }
    };

    // --- PIPELINE HANDLER ---
    const handleTurn = useCallback(async (audioBlob: Blob) => {
        if (!isSessionActiveRef.current) return;

        try {
            setIsListening(false);
            stopVAD(); // Ensure VAD is off during processing

            setIsProcessing(true);
            if (onUserTranscript) onUserTranscript("..."); // Placeholder

            // 1. STT (Whisper)
            console.log("[TurnRef] Sending to STT...", audioBlob.size);
            const sttFormData = new FormData();
            sttFormData.append("audio", audioBlob);

            const sttRes = await fetch("/api/stt", {
                method: "POST",
                body: sttFormData
            });

            if (!sttRes.ok) throw new Error("STT Failed");
            const sttData = await sttRes.json();
            const userText = sttData.text;

            // --- SEMANTIC ECHO CANCELLATION ---
            if (!userText || !userText.trim()) {
                console.warn("[TurnRef] No speech detected (Empty STT).");
                setIsProcessing(false);
                startListeningLoop();
                return;
            }

            // Check if user text is just an echo of the AI's last response
            const cleanUser = userText.toLowerCase().replace(/[^a-z0-9]/g, "");
            const cleanAi = lastAiResponseRef.current.toLowerCase().replace(/[^a-z0-9]/g, "");

            // If the user text is short and contained in the last AI text, it's likely an echo
            // or if they are identical
            if (cleanAi.length > 0 && (cleanAi.includes(cleanUser) || cleanUser.includes(cleanAi))) {
                console.warn(`[TurnRef] ECHO DETECTED via Semantic Check. Ignoring.\nUser: "${userText}"\nAI: "${lastAiResponseRef.current}"`);
                setIsProcessing(false);
                // Resume listening without responding
                startListeningLoop();
                return;
            }
            // ----------------------------------

            console.log("[TurnRef] User said:", userText);
            if (onUserTranscript) onUserTranscript(userText);
            conversationHistoryRef.current.push({ role: "user", content: userText });

            // 2. LLM (GPT-4o-mini)
            console.log("[TurnRef] Sending to Chat...");
            const chatRes = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: conversationHistoryRef.current,
                    metadata: {
                        userName: localStorage.getItem("speakmate_userName") || "User",
                    }
                })
            });

            if (!chatRes.ok) throw new Error("Chat Failed");
            const chatData = await chatRes.json();
            const aiText = chatData.reply;
            lastAiResponseRef.current = aiText; // Store for next turn's echo check

            console.log("[TurnRef] AI Replied:", aiText);

            // 3. TTS
            // Note: Don't show transcript yet. Wait for audio to be ready for sync.
            console.log("[TurnRef] Generating TTS...");
            const ttsRes = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: aiText })
            });

            if (!ttsRes.ok) {
                const errText = await ttsRes.text();
                throw new Error(`TTS Failed: ${errText}`);
            }

            const audioBlobUrl = URL.createObjectURL(await ttsRes.blob());

            // 4. Play Audio
            setIsProcessing(false);

            // SYNC: Show text now that audio is ready
            conversationHistoryRef.current.push({ role: "assistant", content: aiText });
            if (onAiTranscript) onAiTranscript(aiText);

            setIsSpeaking(true);

            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = audioBlobUrl;
                audioPlayerRef.current.play();

                audioPlayerRef.current.onended = () => {
                    console.log("[TurnRef] Audio ended. Waiting 1s grace period...");
                    setIsSpeaking(false);
                    // Add delay to prevent Echo/VAD self-trigger
                    setTimeout(() => {
                        startListeningLoop();
                    }, 1000);
                };
            }

        } catch (err: any) {
            console.error("[TurnRef] Pipeline Error:", err);
            setError(err.message || "Something went wrong");
            setIsProcessing(false);
            // Try to recover?
            startListeningLoop();
        }
    }, [onUserTranscript, onAiTranscript]);


    const startListeningLoop = useCallback(() => { // ... (Unchanged logic, just keeping ref)
        if (!isSessionActiveRef.current) return;
        if (isMuted) return;

        console.log("[TurnRef] Starting VAD/Recorder Loop...");
        setIsListening(true);
        audioChunksRef.current = []; // Reset chunks
        hasSpokenRef.current = false;
        silenceStartRef.current = null;

        // 1. Restart MediaRecorder if needed
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
            try {
                mediaRecorderRef.current.start();
                console.log("[TurnRef] MediaRecorder started");
            } catch (e) {
                console.error("Failed to start recorder", e);
            }
        }

        // 2. Start VAD Interval (See logic below)
        if (analyserRef.current) {
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            stopVAD(); // Clear previous

            vadIntervalRef.current = setInterval(() => {
                if (!analyserRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                // ... VAD Logic ... (Use file content for rest)
                // Threshold tuning:
                // Quiet room ~ 5-10
                // Speaking ~ 30-100
                // LOWERED to 10 to catch quiet mics
                const RAW_THRESHOLD = 10;

                if (average > RAW_THRESHOLD) {
                    // Speech Detected
                    if (!hasSpokenRef.current) {
                        console.log("[VAD] Speech STARTED (Vol:", average.toFixed(0), ")");
                        hasSpokenRef.current = true;
                    }
                    silenceStartRef.current = null; // Reset silence timer
                } else if (hasSpokenRef.current) {
                    // Speech Previously Detected, Now Quiet -> Checks for End
                    if (silenceStartRef.current === null) {
                        silenceStartRef.current = Date.now();
                    } else {
                        const silenceDuration = Date.now() - silenceStartRef.current;
                        if (silenceDuration > SILENCE_DURATION) {
                            console.log("[VAD] Silence detected (" + SILENCE_DURATION + "ms). Stopping.");
                            stopRecordingAndProcess();
                        }
                    }
                }

            }, 100);
        }

    }, [isMuted, handleTurn]);

    const stopRecordingAndProcess = () => {
        stopVAD();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop(); // This triggers ondataavailable -> onstop
        }
    };


    const startSession = useCallback(async () => {
        try {
            console.log("[TurnRef] Initializing Session with Smart VAD...");
            setError(null);

            // 1. Get User Media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            streamRef.current = stream;

            // 2. Setup Audio Context & Filters
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyserRef.current = analyser;

            // Sources & Filters
            const source = audioCtx.createMediaStreamSource(stream);
            sourceRef.current = source;

            // Bandpass Filter (Human Voice Range: 300Hz - 3400Hz)
            const lowPass = audioCtx.createBiquadFilter();
            lowPass.type = 'lowpass';
            lowPass.frequency.value = 3400; // Cut off high hiss/sibilance

            const highPass = audioCtx.createBiquadFilter();
            highPass.type = 'highpass';
            highPass.frequency.value = 300; // Cut off low rumble/hum

            // Chain: Source -> HighPass -> LowPass -> Analyser
            // Note: We ONLY filter the VAD analyser. The Recorder gets the raw (but echo-cancelled) stream.
            source.connect(highPass);
            highPass.connect(lowPass);
            lowPass.connect(analyser);

            console.log("[TurnRef] Smart VAD (300-3400Hz) Configured.");

            // 3. Setup Recorder
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log("[TurnRef] Recorder stopped. Blob size:", blob.size);
                // Pipeline Trigger!
                if (hasSpokenRef.current && blob.size > 1000) {
                    handleTurn(blob);
                } else {
                    console.log("[TurnRef] Ignored (No speech detected or empty).");
                    // Only restart if we are supposed to be active (and not processing)
                    if (isSessionActiveRef.current) startListeningLoop();
                }
            };

            setIsConnected(true);
            isSessionActiveRef.current = true;

            // Start Loop
            setTimeout(() => startListeningLoop(), 100);

        } catch (err: any) {
            console.error("[TurnRef] Init Failed:", err);
            setError(err.message || "Failed to access microphone");
            stopSession();
        }
    }, [startListeningLoop, handleTurn, stopSession]);


    const sendSystemInstruction = useCallback((text: string) => {
        conversationHistoryRef.current.push({ role: "system", content: text });
    }, []);

    const triggerResponse = useCallback(() => { /* No-op */ }, []);
    const toggleMute = useCallback(() => { setIsMuted(prev => !prev); }, []);

    return {
        isConnected,
        isListening,
        isSpeaking,
        startSession,
        stopSession,
        sendSystemInstruction,
        triggerResponse,
        toggleMute,
        isMuted,
        error
    };
}
