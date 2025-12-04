// src/hooks/useSpeechRecognition.ts

"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface UseSpeechRecognitionProps {
  onFinalTranscript?: (text: string) => void;
}

export function useSpeechRecognition(
  props: UseSpeechRecognitionProps = {}
) {
  const { onFinalTranscript } = props;

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionReadyRef = useRef(false);

  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(
    typeof window !== "undefined" && 
    navigator.mediaDevices &&
    "getUserMedia" in navigator.mediaDevices
  );
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // ---------- Start Listening (ElevenLabs WebSocket STT) ---------- //
  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Microphone not supported");
      return;
    }

    // Define audio capture function
    const startAudioCapture = async (ws: WebSocket) => {
      try {
        console.log("[STT] Starting audio capture...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        streamRef.current = stream;

        // Create AudioContext and processor
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        let chunkCount = 0;
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN && sessionReadyRef.current) {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Convert float32 to int16 PCM
            const int16Data = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Convert to base64
            const bytes = new Uint8Array(int16Data.buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);

            const message = {
              message_type: "input_audio_chunk",
              audio_base_64: base64Audio,
            };

            ws.send(JSON.stringify(message));
            
            // Log first few chunks for debugging
            chunkCount++;
            if (chunkCount <= 3) {
              console.log(`[STT] Sent audio chunk ${chunkCount}, size: ${base64Audio.length} bytes`);
            }
          }
        };

        source.connect(processor);
        // Must connect processor to keep it active, but use zero gain to avoid feedback
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Mute output
        processor.connect(gainNode);
        gainNode.connect(audioContext.destination);
        console.log("[STT] Audio capture started successfully");
      } catch (err: any) {
        console.error("[STT] Microphone error:", err);
        setError(err.message || "Microphone access denied");
        ws.close();
      }
    };

    try {
      // Get single-use token from backend
      console.log("[STT] Requesting token...");
      const tokenRes = await fetch("/api/scribe-token");
      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        console.error("[STT] Token error:", errorData);
        throw new Error(errorData.error || "Failed to get scribe token");
      }
      const { token } = await tokenRes.json();
      console.log("[STT] Token received, connecting...");

      // Connect to ElevenLabs WebSocket
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=${token}&model_id=scribe_v2_realtime&audio_format=pcm_16000&commit_strategy=vad&language_code=en`
      );
      wsRef.current = ws;
      sessionReadyRef.current = false;

      ws.onopen = async () => {
        console.log("[STT] WebSocket opened, waiting for session_started...");
      };

      ws.onmessage = (event) => {
        console.log("[STT] Message received:", event.data);
        try {
          const data = JSON.parse(event.data);

          // Handle different message types (ElevenLabs uses message_type, not event)
          if (data.message_type === "session_started") {
            console.log("[STT] Session started successfully:", data);
            sessionReadyRef.current = true;
            setError(null);
            setIsListening(true);

            // Now start capturing microphone audio
            startAudioCapture(ws);
          } else if (data.message_type === "partial_transcript") {
            console.log("[STT] Partial:", data.text);
            // Optional: show live transcript in UI
          } else if (data.message_type === "committed_transcript") {
            console.log("[STT] Committed:", data.text);
            if (data.text && onFinalTranscript) {
              onFinalTranscript(data.text);
            }
          } else if (data.message_type === "error" || data.error) {
            console.error("[STT] Error event:", data);
            setError(data.message || data.error || "Transcription error");
          }
        } catch (err) {
          console.error("[STT] Message parse error:", err, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("[STT] WebSocket error:", error);
        setError("Connection error");
      };

      ws.onclose = (event) => {
        console.log("[STT] WebSocket closed:", event.code, event.reason);
        setIsListening(false);
        sessionReadyRef.current = false;
        cleanup();
      };

    } catch (e: any) {
      console.error("[STT] Start listening error:", e);
      setError(e.message || "Failed to start transcription");
      setIsListening(false);
    }
  }, [isSupported, onFinalTranscript]);

  // ---------- Stop Listening ---------- //
  const stopListening = useCallback(() => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      cleanup();
      setIsListening(false);
    } catch (e) {
      console.error("Stop listening error", e);
      setIsListening(false);
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    sessionReadyRef.current = false;
    
    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  return {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    cleanup,
  };
}
