"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useSmartVAD } from "./useSmartVAD";

interface UseSpeechRecognitionProps {
  onFinalTranscript?: (text: string) => void;
  isAISpeaking?: boolean;
  onBargeIn?: () => void; // V.2 Feature B: Called when user interrupts
}

export function useSpeechRecognition({
  onFinalTranscript,
  isAISpeaking = false,
  onBargeIn,
}: UseSpeechRecognitionProps = {}) {
  // Keep callback ref up to date to avoid stale closures
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const [isSupported] = useState(
    typeof window !== "undefined" &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // ---------- VAD Signals ---------- //

  // Safety timer to prevent infinite recording
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSpeechStart = useCallback(() => {
    console.log("[STT] Speech Start Detected");
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'recording') return;

    chunksRef.current = [];
    try {
      mediaRecorderRef.current.start();

      // Safety: Force stop after 15 seconds (reduced from 30s for faster failsafe)
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = setTimeout(() => {
        console.log("[STT] Max duration reached (15s), forcing stop.");
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 15000);

    } catch (e) {
      console.error("Failed to start recorder:", e);
    }
  }, []);

  const handleSpeechEnd = useCallback(() => {
    console.log("[STT] Speech End Detected");
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Use Smart VAD with barge-in support
  const { startVAD, stopVAD, isListening, isSpeechDetected, volume } = useSmartVAD({
    isAISpeaking,
    onSpeechStart: handleSpeechStart,
    onSpeechEnd: handleSpeechEnd,
    onBargeIn, // V.2 Feature B
  });

  // ---------- Recording Logic ---------- //

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Microphone not supported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true, // Re-enabled to ensure user is heard clearly
        },
      });
      streamRef.current = stream;

      // Initialize Recorder
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Chrome supports webm
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        if (blob.size < 1000) {
          console.log("[STT] Audio too short, ignoring.");
          return;
        }

        console.log("[STT] Sending audio to Whisper...", blob.size);

        // Transcribe
        try {
          const formData = new FormData();
          formData.append('file', blob);

          const res = await fetch('/api/hangout/transcribe', {
            method: 'POST',
            body: formData
          });

          if (!res.ok) throw new Error("Transcription API failed");

          const data = await res.json();
          if (data.text && onFinalTranscriptRef.current) {
            console.log("[STT] Transcript:", data.text);
            onFinalTranscriptRef.current(data.text);
          }
        } catch (err: any) {
          console.error("[STT] Transcription error:", err);
          setError("Transcription failed");
        }
      };

      // Start VAD monitoring
      await startVAD(stream);
      setError(null);

    } catch (err: any) {
      console.error("[STT] Start error:", err);
      setError("Failed to access microphone");
    }
  }, [isSupported, startVAD, onFinalTranscript]);

  const stopListening = useCallback(() => {
    stopVAD();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [stopVAD]);

  const cleanup = useCallback(() => {
    stopListening();
  }, [stopListening]);

  return {
    isSupported,
    isListening, // VAD is active/monitoring
    isSpeechDetected, // Currently speaking
    volume,
    error,
    startListening,
    stopListening,
    cleanup,
  };
}
