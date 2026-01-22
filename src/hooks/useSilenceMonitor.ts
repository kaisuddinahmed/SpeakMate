import { useState, useEffect, useRef, useCallback } from "react";

interface UseSilenceMonitorProps {
    isListening: boolean;      // Only active when VAD is listening
    isSpeechDetected: boolean; // Reset timer when user speaks
    onVisualWarning?: () => void; // 8s
    onEncouragement?: () => void; // 15s
    onTimeout?: () => void;       // 20s
}

export function useSilenceMonitor({
    isListening,
    isSpeechDetected,
    onVisualWarning,
    onEncouragement,
    onTimeout,
}: UseSilenceMonitorProps) {
    const [silenceDuration, setSilenceDuration] = useState(0);
    const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);

    // Reset function
    const resetSilence = useCallback(() => {
        setSilenceDuration(0);
        setStage(0);
        startTimeRef.current = Date.now();
    }, []);

    useEffect(() => {
        // Only run when listening and NOT detecting speech
        if (isListening && !isSpeechDetected) {
            startTimeRef.current = Date.now();

            intervalRef.current = setInterval(() => {
                const now = Date.now();
                const duration = now - (startTimeRef.current || now);
                setSilenceDuration(duration);

                // Check Thresholds
                // Stage 1: 8 seconds (Visual Warning)
                if (duration > 8000 && duration < 15000 && stage < 1) {
                    setStage(1);
                    onVisualWarning?.();
                }

                // Stage 2: 15 seconds (Encouragement)
                if (duration > 15000 && duration < 20000 && stage < 2) {
                    setStage(2);
                    onEncouragement?.();
                }

                // Stage 3: 20 seconds (Timeout/Check-in)
                if (duration > 20000 && stage < 3) {
                    setStage(3);
                    onTimeout?.();
                    // Stop counting at timeout? No, let parent handle it.
                }

            }, 100); // Update every 100ms
        } else {
            // If not listening or speech detected, reset
            resetSilence();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isListening, isSpeechDetected, stage, onVisualWarning, onEncouragement, onTimeout, resetSilence]);

    return {
        silenceDuration,
        stage,
        resetSilence
    };
}
