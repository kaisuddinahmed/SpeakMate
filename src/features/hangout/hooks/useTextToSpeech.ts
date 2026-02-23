import { useRef, useCallback } from 'react';

interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useTextToSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const errorRef = useRef<string | null>(null);

  /**
   * Stop any currently playing audio
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      // Silence handlers to prevent "abort" or "empty src" errors
      audioRef.current.onended = null;
      audioRef.current.onerror = null;

      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = ''; // This normally checks error, but we silenced it
      audioRef.current = null;
    }
  }, []);

  /**
   * Speak text using secure server-side Deepgram Aura
   */
  const speak = useCallback(async (text: string, callbacks?: TTSCallbacks) => {
    // Stop any existing audio
    stop();

    try {
      console.log(`[TTS] Speaking: "${text.substring(0, 30)}..."`);

      // Use secure proxy route
      const encodedText = encodeURIComponent(text);
      const url = `/api/tts?text=${encodedText}`;

      const audio = new Audio(url);
      audioRef.current = audio;

      // Setup event listeners
      audio.oncanplay = () => {
        console.log('[TTS] Audio ready, starting playback');
        callbacks?.onStart?.();
        audio.play().catch(err => {
          console.error('[TTS] Playback failed:', err);
          callbacks?.onError?.(err);
        });
      };

      audio.onended = () => {
        console.log('[TTS] Playback finished');
        audioRef.current = null;
        callbacks?.onEnd?.();
      };

      audio.onerror = (e) => {
        console.error('[TTS] Audio error:', e);
        const error = new Error('TTS playback failed');
        errorRef.current = error.message;
        callbacks?.onError?.(error);
        callbacks?.onEnd?.(); // Still trigger onEnd to unblock flow
      };

      // Start loading
      audio.load();

    } catch (error: any) {
      console.error('[TTS] Error:', error);
      errorRef.current = error.message;
      callbacks?.onError?.(error);
      callbacks?.onEnd?.();
    }
  }, [stop]);

  return {
    speak,
    stop,
    error: errorRef.current
  };
}
