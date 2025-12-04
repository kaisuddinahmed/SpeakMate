import { useState, useCallback, useRef } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      // Call ElevenLabs TTS API
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
      console.error("ElevenLabs TTS error → falling back:", err);

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
    // Stop ElevenLabs audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Stop browser TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
  };
}
