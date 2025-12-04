import { useState, useCallback } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    const trimmed = text?.trim();
    if (!trimmed) return;

    try {
      // Call ElevenLabs TTS API
      const res = await fetch("/api/tts", {
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

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      await audio.play();
    } catch (err) {
      console.error("ElevenLabs TTS error → falling back:", err);

      // Browser fallback
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
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
