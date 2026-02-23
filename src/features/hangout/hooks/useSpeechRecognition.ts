import { useState, useRef, useCallback, useEffect } from 'react';

export interface SpeechRecognitionProps {
    onPartial: (text: string) => void;
    onFinal: (text: string, metadata?: { confidence: number }) => void;
    onSpeechStart?: () => void;
}

export interface SpeechRecognitionResult {
    isListening: boolean;
    error: string | null;
    start: () => Promise<void>;
    stop: () => void;
    warmup: () => Promise<void>;
}

export function useSpeechRecognition({ onPartial, onFinal, onSpeechStart }: SpeechRecognitionProps): SpeechRecognitionResult {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Resources
    const sttWsRef = useRef<WebSocket | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null); // NEW: Worklet
    const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Cache
    const apiKeyRef = useRef<string | null>(null);
    const apiKeyPromiseRef = useRef<Promise<string> | null>(null);

    // Callbacks
    const onPartialRef = useRef(onPartial);
    const onFinalRef = useRef(onFinal);
    const onSpeechStartRef = useRef(onSpeechStart);

    useEffect(() => {
        onPartialRef.current = onPartial;
        onFinalRef.current = onFinal;
        onSpeechStartRef.current = onSpeechStart;
    }, [onPartial, onFinal, onSpeechStart]);

    // --- 1. Key Management ---
    const getDeepgramKey = useCallback(async () => {
        if (apiKeyRef.current) return apiKeyRef.current;
        if (apiKeyPromiseRef.current) return apiKeyPromiseRef.current;

        const fetchPromise = (async () => {
            const response = await fetch('/api/deepgram');
            if (!response.ok) throw new Error('Failed to fetch Deepgram key');
            const { key } = await response.json();
            apiKeyRef.current = key;
            return key;
        })();

        apiKeyPromiseRef.current = fetchPromise;
        return fetchPromise;
    }, []);

    // Prefetch
    useEffect(() => {
        getDeepgramKey().catch(e => console.warn("[Speech] Prefetch failed:", e));
    }, [getDeepgramKey]);

    // --- 2. Cleanup ---
    const cleanup = useCallback(() => {
        sttWsRef.current?.close();
        sttWsRef.current = null;
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);

        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;

        if (workletNodeRef.current) {
            workletNodeRef.current.port.close(); // Close port
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setIsListening(false);
    }, []);

    const isStartActive = useRef(false);

    // --- 3. Start Recording ---
    const connectionIdRef = useRef<number>(0);

    const start = useCallback(async () => {
        if (isListening) return;

        // CLEANUP ZOMBIES: Always clean up before starting fresh
        cleanup();

        const myConnectionId = Date.now();
        connectionIdRef.current = myConnectionId;
        isStartActive.current = true;
        setError(null);

        try {
            console.log(`[Speech] Starting... (ID: ${myConnectionId})`);
            const key = await getDeepgramKey();

            // Check cancellation after async key fetch
            if (connectionIdRef.current !== myConnectionId || !isStartActive.current) {
                console.log("[Speech] Start aborted (Stale ID)");
                return;
            }

            // A. Setup Audio
            let stream = mediaStreamRef.current;
            let ctx = audioContextRef.current;

            if (!stream || !stream.active) {
                console.log("[Speech] Cold boot: Getting user media...");
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: 1,
                        sampleRate: 16000
                    }
                });
                mediaStreamRef.current = stream;
            }

            if (!ctx || ctx.state === 'closed') {
                ctx = new AudioContext({ sampleRate: 16000 });
                try {
                    await ctx.audioWorklet.addModule('/worklets/pcm-processor.js');
                    console.log("[Speech] AudioWorklet Loaded");
                } catch (e) {
                    throw new Error("Failed to load AudioWorklet: " + e);
                }
                audioContextRef.current = ctx;
            }
            if (ctx.state === 'suspended') await ctx.resume();

            // Create Nodes
            const source = ctx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
            workletNodeRef.current = workletNode;

            source.connect(workletNode);
            workletNode.connect(ctx.destination);

            // B. Setup Socket (Promisified)
            await new Promise<void>((resolve, reject) => {
                if (connectionIdRef.current !== myConnectionId) {
                    reject(new Error("Aborted"));
                    return;
                }

                const ws = new WebSocket(
                    'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&interim_results=true&endpointing=500&encoding=linear16&sample_rate=16000&channels=1',
                    ['token', key]
                );
                sttWsRef.current = ws;

                ws.onopen = () => {
                    if (connectionIdRef.current !== myConnectionId) {
                        console.log("[Speech] Socket opened but is stale. Closing.");
                        ws.close();
                        return;
                    }
                    console.log('[Speech] ✅ Deepgram Connected');
                    setIsListening(true);
                    keepAliveIntervalRef.current = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'KeepAlive' }));
                    }, 3000);
                    resolve();
                };

                // C. Pump Audio (From Worklet Port)
                workletNode.port.onmessage = (event) => {
                    const int16Data = event.data;
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(int16Data.buffer);
                    }
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    const alternative = data.channel?.alternatives?.[0];
                    const text = alternative?.transcript;

                    if (text) {
                        if (onSpeechStartRef.current) onSpeechStartRef.current();

                        if (data.is_final) {
                            console.log('[Speech] Final:', text, 'Conf:', alternative?.confidence);
                            onFinalRef.current(text, { confidence: alternative?.confidence || 0 });
                        } else {
                            onPartialRef.current(text);
                        }
                    }
                };

                ws.onerror = (e) => {
                    console.error('[Speech] Socket Error', e);
                    setError("Connection lost");
                    reject(e); // Reject start() if connection fails
                };

                ws.onclose = () => {
                    console.log('[Speech] Socket Closed');
                    setIsListening(false);
                };
            });

        } catch (err: any) {
            console.error("[Speech] Start Failed:", err);
            setError(err.message || "Failed to start microphone");
            if (!mediaStreamRef.current) cleanup();
            setIsListening(false);
        }
    }, [isListening, getDeepgramKey, cleanup]);

    // --- 4. Stop ---
    const stop = useCallback(() => {
        console.log("[Speech] Stop");
        isStartActive.current = false;
        sttWsRef.current?.close();
        sttWsRef.current = null;

        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            // Port close optional but good practice
            workletNodeRef.current.port.close();
            workletNodeRef.current = null;
        }

        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
        setIsListening(false);
    }, []);

    // Warmup
    const warmup = useCallback(async () => {
        // ... (Same warmup logic)
        console.log("[Speech] 🔥 Warming up resources...");
        getDeepgramKey();
        try {
            if (!mediaStreamRef.current) {
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 }
                });
            }
            if (!audioContextRef.current) {
                const ctx = new AudioContext({ sampleRate: 16000 });
                await ctx.audioWorklet.addModule('/worklets/pcm-processor.js'); // Warmup load
                audioContextRef.current = ctx;
                await ctx.suspend();
            }
        } catch (e) {
            console.warn("[Speech] Warmup failed", e);
        }
    }, [getDeepgramKey]);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    return { isListening, error, start, stop, warmup };
}
