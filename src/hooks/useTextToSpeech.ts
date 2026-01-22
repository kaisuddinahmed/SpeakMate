import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTextToSpeechProps {
  onBargeIn?: () => void; // V.2 Feature B: Called when user interrupts
}

export function useTextToSpeech(props?: UseTextToSpeechProps) {
  const { onBargeIn } = props || {};
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onBargeInRef = useRef(onBargeIn);

  // Keep callback ref up to date
  useEffect(() => {
    onBargeInRef.current = onBargeIn;
  }, [onBargeIn]);

  const speak = useCallback(async (text: string) => {
    const trimmed = text?.trim();
    if (!trimmed) return;

    // Stop any currently playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    try {
      // Call OpenAI TTS API (via our proxy)
      const res = await fetch("/api/hangout/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok || !res.headers.get("Content-Type")?.includes("audio")) {
        throw new Error(`TTS HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        audioRef.current = null;
      };

      setIsSpeaking(true);
      await audio.play();
    } catch (err) {
      console.error("OpenAI TTS error → falling back:", err);

      // Browser fallback
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          // Cancel any existing speech first
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(trimmed);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          setIsSpeaking(true);
          window.speechSynthesis.speak(utterance);
        } catch (fallbackErr) {
          console.error("Browser TTS fallback error:", fallbackErr);
          setIsSpeaking(false);
        }
      } else {
        setIsSpeaking(false);
      }
    }
  }, []);

  const stop = useCallback(() => {
    // Stop OpenAI audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop browser TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }, []);

  // V.2 Feature B: Barge-In trigger (called externally when user speaks)
  const triggerBargeIn = useCallback(() => {
    if (isSpeaking) {
      console.log("[TTS] Barge-In triggered - stopping playback");
      stop();
      onBargeInRef.current?.();
    }
  }, [isSpeaking, stop]);

  return {
    isSpeaking,
    speak,
    stop,
    triggerBargeIn, // V.2: External trigger for barge-in
  };
}
