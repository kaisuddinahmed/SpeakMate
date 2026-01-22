import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSmartVADProps {
    isAISpeaking: boolean;
    onSpeechStart: () => void;
    onSpeechEnd: () => void;
    onBargeIn?: () => void; // V.2 Feature B: Called when user interrupts AI
    minVolumeDecibels?: number; // Threshold (e.g., -50dB)
    silenceDurationMs?: number; // Time to wait before triggering onSpeechEnd
    bargeInThreshold?: number; // Higher threshold for barge-in detection
}

export function useSmartVAD({
    isAISpeaking,
    onSpeechStart,
    onSpeechEnd,
    onBargeIn,
    minVolumeDecibels = -35, // Sensitive to catch quiet voice endings (engineer: -35dB)
    silenceDurationMs = 600, // Speech end after 600ms silence (engineer: 600-800ms)
    bargeInThreshold = -15, // Higher threshold for barge-in (must be loud)
}: UseSmartVADProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSpeechDetected, setIsSpeechDetected] = useState(false);
    const [volume, setVolume] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const requestRef = useRef<number | null>(null);

    // Timer for silence detection
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    // To track if we are currently "in a speech phrase"
    const isSpeakingRef = useRef(false);
    // Stuck state recovery timer
    const stuckStateTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize and Start VAD
    const startVAD = useCallback(async (stream: MediaStream) => {
        if (!stream) return;

        // 1. Setup Audio Context
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        const audioContext = new AudioContextClass({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        // 2. Create Source
        const source = audioContext.createMediaStreamSource(stream);
        microphoneRef.current = source;

        // 3. Bandpass Filter Chain (Highpass 300Hz -> Lowpass 3400Hz)
        const highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 300;

        const lowpass = audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 3400;

        // 4. Analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024; // Resolution
        analyser.smoothingTimeConstant = 0.4; // Responsiveness
        analyserRef.current = analyser;

        // Connect Graph
        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(analyser);

        setIsListening(true);
        detectVolume();
    }, []);

    // Stop VAD
    const stopVAD = useCallback(() => {
        setIsListening(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (stuckStateTimerRef.current) clearTimeout(stuckStateTimerRef.current);

        isSpeakingRef.current = false;
        setIsSpeechDetected(false);
        setVolume(0);
    }, []);

    // Refs for props to avoid closure staleness in RAF loop
    const isAISpeakingRef = useRef(isAISpeaking);
    const onSpeechStartRef = useRef(onSpeechStart);
    const onSpeechEndRef = useRef(onSpeechEnd);
    const onBargeInRef = useRef(onBargeIn); // V.2 Feature B

    // Update refs when props change
    useEffect(() => {
        isAISpeakingRef.current = isAISpeaking;
        onSpeechStartRef.current = onSpeechStart;
        onSpeechEndRef.current = onSpeechEnd;
        onBargeInRef.current = onBargeIn;
    }, [isAISpeaking, onSpeechStart, onSpeechEnd, onBargeIn]);

    // Detection Loop
    const detectVolume = useCallback(() => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS (Root Mean Square) Volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        // Convert to Decibels (safe/approx)
        const db = 20 * Math.log10(rms / 255);

        setVolume(Math.floor(db));

        // --- V.1 Semantic Echo Cancellation (Gate) ---
        // If AI is speaking, completely ignore all input to prevent self-triggering
        if (isAISpeakingRef.current) {
            // Continue loop but don't process any speech detection
            requestRef.current = requestAnimationFrame(detectVolume);
            return;
        }

        // VAD Logic (only active when AI is NOT speaking)
        if (db > minVolumeDecibels) {
            // Speech Detected - clear any pending silence timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }

            if (!isSpeakingRef.current) {
                isSpeakingRef.current = true;
                setIsSpeechDetected(true);
                console.log(`[VAD] Speech START detected (volume: ${Math.floor(db)}dB > threshold: ${minVolumeDecibels}dB)`);
                onSpeechStartRef.current();
            }
        } else {
            // Silence Detected - start timer if user was speaking
            if (isSpeakingRef.current && !silenceTimerRef.current) {
                // console.log(`[VAD] Silence detected (volume: ${Math.floor(db)}dB), starting ${silenceDurationMs}ms timer`);
                // Start silence timer - this SHOULD trigger speech end
                silenceTimerRef.current = setTimeout(() => {
                    console.log(`[VAD] Speech END triggered after ${silenceDurationMs}ms silence`);
                    isSpeakingRef.current = false;
                    setIsSpeechDetected(false);
                    onSpeechEndRef.current();
                    silenceTimerRef.current = null;
                }, silenceDurationMs);
            }
        }

        // Keep looping
        requestRef.current = requestAnimationFrame(detectVolume);
    }, [minVolumeDecibels, silenceDurationMs]);


    return {
        startVAD,
        stopVAD,
        isListening,
        isSpeechDetected,
        volume // helpful for UI visualization
    };
}
