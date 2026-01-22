"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface RealtimeConnection {
    isConnected: boolean;
    isListening: boolean;
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

export function useRealtimeConnection({
    onUserTranscript,
    onAiTranscript,
}: UseRealtimeConnectionProps): RealtimeConnection {
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Buffer to accumulate transcript deltas
    const transcriptBufferRef = useRef<{ user: string; ai: string }>({
        user: "",
        ai: "",
    });
    const lastAiTranscriptRef = useRef("");

    // Setup audio element for playback
    useEffect(() => {
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioElRef.current = audioEl;
        return () => {
            audioEl.pause();
            audioEl.srcObject = null;
        };
    }, []);

    const stopSession = useCallback(() => {
        console.log("[Realtime] Stopping session...");
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setIsConnected(false);
        setIsListening(false);
        dataChannelRef.current = null;
    }, []);

    const startSession = useCallback(async () => {

        try {
            console.log("[Realtime] Starting session...");
            setError(null);

            // 1. Get ephemeral token
            const tokenRes = await fetch("/api/session");
            if (!tokenRes.ok) throw new Error("Failed to get session token");
            const data = await tokenRes.json();
            const ephemeralKey = data.client_secret.value;

            // 2. Init PC
            const pc = new RTCPeerConnection();
            peerConnectionRef.current = pc;

            // Handle remote audio
            pc.ontrack = (e) => {
                console.log("[Realtime] Received remote audio track");
                if (audioElRef.current) {
                    audioElRef.current.srcObject = e.streams[0];
                }
            };

            // Handle data channel for events
            const dc = pc.createDataChannel("oai-events");
            dataChannelRef.current = dc;

            dc.onopen = () => {
                console.log("[Realtime] Data channel open");
                setIsConnected(true);
                setIsListening(true);

                // --- SESSION CONFIGURATION ---
                // Set voice to 'echo' (calmer) and tune VAD to be less aggressive
                const sessionConfig = {
                    type: "session.update",
                    session: {
                        voice: "shimmer",
                        input_audio_transcription: {
                            model: "whisper-1",
                            language: "en"     // Force English transcription
                        },
                        turn_detection: {
                            type: "server_vad",
                            threshold: 0.6, // Higher threshold = less likely to pick up background noise
                            prefix_padding_ms: 300,
                            silence_duration_ms: 800 // Wait longer before interrupting (slower pace)
                        }
                    }
                };
                dc.send(JSON.stringify(sessionConfig));
                console.log("[Realtime] Sent session config (Voice: Echo, VAD: Tuned)");

                // Unmute mic after a short delay to ensure connection is stable and AI is ready
                // This prevents the "Thank you" hallucination from initial connection noise
                setTimeout(() => {
                    if (streamRef.current) {
                        const track = streamRef.current.getAudioTracks()[0];
                        if (track) {
                            track.enabled = true;
                            setIsMuted(false);
                            console.log("[Realtime] Mic unmuted");
                        }
                    }
                }, 1000);
            };

            dc.onmessage = (e) => {
                try {
                    const event = JSON.parse(e.data);

                    // Debug specific events
                    if (event.type !== 'response.audio_transcript.delta' && event.type !== 'response.audio.delta') {
                        // console.log("[Realtime Event]", event.type, event);
                    }

                    // --- User Transcript Handling ---
                    // 1. Placeholder when server detects user speech item
                    if (event.type === "conversation.item.created" && event.item?.role === "user") {
                        if (onUserTranscript) {
                            console.log("[Realtime] User Item Created (Placeholder)");
                            onUserTranscript("...");
                        }
                    }

                    // 2. Final Transcript
                    if (event.type === "conversation.item.input_audio_transcription.completed") {
                        const text = event.transcript.trim();
                        // --- ECHO GUARD ---
                        // Check if this input is just the AI hearing itself (previous OR current speech)
                        const lastAi = lastAiTranscriptRef.current.trim();
                        const currentAi = transcriptBufferRef.current.ai.trim(); // Also check what's currently being spoken

                        const isEchoMatch = (source: string, input: string) => {
                            if (!source || !input) return false;
                            const src = source.toLowerCase().trim();
                            const inp = input.toLowerCase().trim();

                            // 1. Exact match (or very close)
                            if (src === inp) return true;

                            // 2. Substring match: Input is inside Source (AI spoke it, mic picked it up)
                            // Only trigger if input is substantial to avoid false positives on short words like "yes", "okay"
                            if (src.includes(inp) && inp.length > 20) return true;

                            // 3. Reverse substring: Source is inside Input (rare, but possible if user repeats AI + more)
                            // Only trigger if source is substantial
                            if (inp.includes(src) && src.length > 20) return true;

                            return false;
                        };

                        const isEcho = isEchoMatch(lastAi, text) || isEchoMatch(currentAi, text);

                        if (isEcho) {
                            console.warn("[Realtime] Echo Guard Triggered! Ignoring input:", text);
                            // Cancel any response the server might be generating for this echo
                            if (dataChannelRef.current?.readyState === "open") {
                                dataChannelRef.current.send(JSON.stringify({ type: "response.cancel" }));
                            }
                            // Important: If we sent a placeholder "...", we should probably remove it?
                            // Actually, HangoutPage doesn't handle removal. 
                            // Ideally we would emit onUserTranscript(null) or similar, but for now 
                            // let's leave it - the user usually sees it fade or we can update UI later.
                            // Better fix: Emit a special "[ECHO_CANCELLED]" or just ignore.
                            // If we ignore, the "..." stays forever. 
                            // Let's emit an empty string which the UI can filter or handle?
                            // For this iteration, let's keep it simple. The user asked for ordering fix.
                            // Valid user speech will replace "...", Echo will effectively NOT replace it.
                            // To fix the "stuck ..." issue for echoes, we can emit a distinct signal, 
                            // OR we rely on the fact that if it IS an echo, users might accept a ghost bubble 
                            // or we can suppress the placeholder entirely? 
                            // No, we need the placeholder for valid speech.
                            // Let's try to update "..." to "" (empty) if echo.
                            if (onUserTranscript) onUserTranscript("");
                            return;
                        }

                        if (text && onUserTranscript) {
                            console.log("[Realtime] User Final:", text);
                            onUserTranscript(text);
                        }
                    }

                    // --- AI Transcript Handling ---
                    // 1. Audio Transcript (Primary for audio-only)
                    if (event.type === "response.audio_transcript.delta") {
                        transcriptBufferRef.current.ai += event.delta;
                    }
                    if (event.type === "response.audio_transcript.done") {
                        const text = transcriptBufferRef.current.ai;
                        if (text && onAiTranscript) {
                            console.log("[Realtime] AI Audio Transcript:", text);
                            onAiTranscript(text);
                        }
                        transcriptBufferRef.current.ai = "";
                        lastAiTranscriptRef.current = text; // Store for echo detection
                    }

                    // 2. Text Modality (Fallback/Cleaner if available)
                    if (event.type === "response.text.done") {
                        const text = event.text;
                        if (text && onAiTranscript) {
                            console.log("[Realtime] AI Text Output:", text);
                            // We might get duplicate if both audio-transcript and text are sent.
                            // But usually audio-transcript comes from audio model, text from text model.
                            // For now, let's trust audio_transcript for timing, but text is clearer.
                            // If we use text, we might want to debut it.
                        }
                    }

                    // 3. Fallback: content_part.done
                    if (event.type === "response.content_part.done" && event.part.type === "text") {
                        const text = event.part.text;
                        if (text && onAiTranscript) {
                            console.log("[Realtime] AI Content Part:", text);
                            // Deduplication is handled by UI usually, or we can debounce.
                            // For simplicity: We stick to audio_transcript as it matches what was spoken.
                        }
                    }


                    // Handle Errors
                    if (event.type === "error") {
                        console.error("[Realtime] Error event:", event);
                    }

                } catch (err) {
                    console.error("Failed to parse event", err);
                }
            };

            // 3. Audio Setup (High Quality Constraints)
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    // Chrome-specific constraints for better isolation
                    googEchoCancellation: true,
                    googNoiseSuppression: true,
                    googAutoGainControl: true,
                } as MediaTrackConstraints
            });
            streamRef.current = stream;

            // Add track but mute initially to prevent startup "ghost" inputs (hallucinations)
            const track = stream.getTracks()[0];
            track.enabled = false;
            pc.addTrack(track, stream);

            // 4. Offer / Answer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const baseUrl = "https://api.openai.com/v1/realtime";
            const model = "gpt-4o-realtime-preview-2024-12-17";
            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${ephemeralKey}`,
                    "Content-Type": "application/sdp",
                },
            });

            const answerSdp = await sdpResponse.text();
            await pc.setRemoteDescription({
                type: "answer",
                sdp: answerSdp,
            });

            console.log("[Realtime] Connection established!");
        } catch (err: any) {
            console.error("[Realtime] Connection failed:", err);
            setError(err.message || "Connection failed");
            stopSession();
        }
    }, [onUserTranscript, onAiTranscript]);



    const sendSystemInstruction = useCallback((text: string) => {
        if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
            const event = {
                type: "session.update",
                session: {
                    instructions: text,
                },
            };
            dataChannelRef.current.send(JSON.stringify(event));
            console.log("[Realtime] Sent instructions update");
        } else {
            console.warn("[Realtime] Cannot send instructions: Data channel not open");
        }
    }, []);

    const triggerResponse = useCallback(() => {
        if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
            const event = {
                type: "response.create",
                response: {
                    modalities: ["text", "audio"],
                }
            };
            dataChannelRef.current.send(JSON.stringify(event));
            console.log("[Realtime] Triggered manual response");
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (streamRef.current) {
            const track = streamRef.current.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsMuted(!track.enabled);
                console.log("[Realtime] Mic toggled:", track.enabled ? "Unmuted" : "Muted");
            }
        }
    }, []);





    return {
        isConnected,
        isListening,
        error,
        startSession,
        stopSession,
        sendSystemInstruction,
        triggerResponse,
        toggleMute,
        isMuted,
    };
}
