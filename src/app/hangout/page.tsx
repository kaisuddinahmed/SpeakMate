"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

function HangoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transcript, setTranscript] = useState<
    { speaker: "user" | "ai"; text: string; timestamp?: string }[]
  >([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentGoal, setCurrentGoal] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const conversationHistoryRef = useRef<{ role: string; content: string }[]>(
    []
  );
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Greeting / personalization metadata
  const [userName, setUserName] = useState<string>("friend");
  const [isFirstEverHangout, setIsFirstEverHangout] = useState<boolean>(true);
  const [lastHangoutAt, setLastHangoutAt] = useState<string | null>(null);
  const [sameSession, setSameSession] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // TTS hook (ElevenLabs + browser fallback)
  const { isSpeaking, speak: speakText, stop: stopSpeaking } =
    useTextToSpeech();

  // On mount: start session timer and read goal from URL
  useEffect(() => {
    setMounted(true);
    setSessionStartTime(Date.now());

    const goal = searchParams.get("goal");
    if (goal) setCurrentGoal(goal);

    if (typeof window !== "undefined") {
      // 1) Preferred name (if you store it elsewhere, adjust key accordingly)
      const storedName = window.localStorage.getItem("speakmate_userName");
      setUserName(
        storedName && storedName.trim().length > 0
          ? storedName.trim()
          : "friend"
      );

      // 2) Previous hangout info
      const lastAt = window.localStorage.getItem("speakmate_lastHangoutAt");
      const lastSessionId =
        window.localStorage.getItem("speakmate_lastSessionId");

      // 3) Current session id (per browser session)
      let sessionId =
        window.sessionStorage.getItem("speakmate_currentSessionId");
      if (!sessionId) {
        const generated =
          (window.crypto &&
            "randomUUID" in window.crypto &&
            (window.crypto as any).randomUUID()) ||
          Math.random().toString(36).slice(2);
        sessionId = String(generated);
        window.sessionStorage.setItem("speakmate_currentSessionId", sessionId);
      }

      setCurrentSessionId(sessionId);
      setLastHangoutAt(lastAt);
      setIsFirstEverHangout(!lastAt);
      setSameSession(
        !!lastSessionId && !!sessionId && lastSessionId === sessionId
      );
    }
  }, [searchParams]);

  // Add a message to transcript + conversation history
  const addTranscriptMessage = useCallback(
    (speaker: "user" | "ai", text: string) => {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setTranscript((prev) => [...prev, { speaker, text, timestamp }]);

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        {
          role: speaker === "user" ? "user" : "assistant",
          content: text,
        },
      ];
    },
    []
  );

  // Called when STT has a full utterance - defined early
  const handleFinalTranscript = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      addTranscriptMessage("user", trimmed);
      
      // Call OpenAI API
      try {
        const res = await fetch("/api/hangout/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...conversationHistoryRef.current,
              { role: "user", content: trimmed },
            ],
            metadata: {
              userName,
              isFirstEverHangout,
              lastHangoutAt,
              sameSession,
            },
          }),
        });

        if (!res.ok) {
          console.error("Chat API error:", res.status);
          addTranscriptMessage(
            "ai",
            "Sorry, I had trouble responding just now. Can you say that again?"
          );
          return;
        }

        const data = await res.json();
        const aiReply: string = data?.reply ?? "";

        if (aiReply) {
          addTranscriptMessage("ai", aiReply);
          await speakText(aiReply);
        }
      } catch (error) {
        console.error("OpenAI conversation error:", error);
        addTranscriptMessage(
          "ai",
          "Sorry, something went wrong on my side. Let's try again."
        );
      }
    },
    [addTranscriptMessage, speakText, userName, isFirstEverHangout, lastHangoutAt, sameSession]
  );

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // STT hook (ElevenLabs STT + browser fallback)
  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    onFinalTranscript: handleFinalTranscript,
  });

  // Finish session, store data, go to summary page
  const endConversation = () => {
    // stop audio output (safety; also stopped by buttons that call this)
    stopSpeaking();

    const nowIso = new Date().toISOString();

    // Persist last hangout info so greetings can adapt next time
    if (typeof window !== "undefined") {
      window.localStorage.setItem("speakmate_lastHangoutAt", nowIso);
      if (currentSessionId) {
        window.localStorage.setItem(
          "speakmate_lastSessionId",
          currentSessionId
        );
      }
    }
    setLastHangoutAt(nowIso);
    setIsFirstEverHangout(false);
    setSameSession(true);

    const durationSeconds = sessionStartTime
      ? Math.floor((Date.now() - sessionStartTime) / 1000)
      : 0;

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationStr = `${minutes}m ${seconds}s`;

    const messageCount = transcript.filter(
      (msg) => msg.speaker === "user"
    ).length;

    // save transcript + history for evaluator
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "hangoutTranscript",
        JSON.stringify(transcript)
      );
      window.sessionStorage.setItem(
        "conversationHistory",
        JSON.stringify(conversationHistoryRef.current)
      );
    }

    const goalParam = currentGoal ? `&goal=${currentGoal}` : "";
    router.push(
      `/hangout/summary?duration=${durationStr}&messages=${messageCount}${goalParam}`
    );
  };

  // Track whether conversation has started
  const [hasStartedConversation, setHasStartedConversation] = useState(false);

  // Handler for mic button - only starts conversation, doesn't toggle
  const handleMicButton = () => {
    // Only allow starting if not already started
    if (!hasStartedConversation && !isListening) {
      startListening();
      setHasStartedConversation(true);
    }
    // Once started, mic button does nothing (non-tappable)
  };

  // Handle back button - only shown if conversation hasn't started
  const handleBackButton = () => {
    stopListening();
    stopSpeaking();
    
    // Navigate to home based on goal
    if (currentGoal) {
      router.push(`/?goal=${currentGoal}`);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-gray-800 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Back button - only shown if conversation hasn't started */}
            {!hasStartedConversation ? (
              <button
                onClick={handleBackButton}
                className="text-gray-600 dark:text-gray-300"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            ) : (
              <div className="w-6" />
            )}
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Hangout
            </h1>
            <div className="w-6" />
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!mounted ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : !isSupported ? (
            <div className="text-center py-12">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
                  Speech Recognition Not Available
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Please use Chrome (desktop/Android) or Safari on iOS 14.5+ for voice features.
                </p>
              </div>
            </div>
          ) : transcript.length === 0 && !isListening ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                Tap the mic to start talking to SpeakMate
              </p>
            </div>
          ) : (
            transcript.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.speaker === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.speaker === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  {msg.timestamp && (
                    <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Controls */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-6">
          <div className="flex items-center justify-center gap-8">
            {/* Pause Button - only active after conversation starts */}
            <button
              onClick={() => {
                if (hasStartedConversation && isListening) {
                  stopListening();
                }
              }}
              disabled={!hasStartedConversation || !isListening}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                !hasStartedConversation || !isListening
                  ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50"
                  : "bg-yellow-500 hover:bg-yellow-600"
              }`}
          >
              {/* Icon stays the same: pause when active */}
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {/* Mic Button - starts conversation, then just blinks */}
            <button
              onClick={handleMicButton}
              disabled={!mounted || !isSupported || hasStartedConversation}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all relative ${
                hasStartedConversation && isListening
                  ? "bg-red-500 cursor-default"
                  : hasStartedConversation && !isListening
                  ? "bg-gray-400 dark:bg-gray-600 cursor-default"
                  : !mounted || !isSupported
                  ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
              )}
              <svg
                className="w-10 h-10 text-white relative z-10"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* End Button - only active after conversation starts */}
            <button
              onClick={() => {
                stopListening();
                stopSpeaking();
                endConversation();
              }}
              disabled={!hasStartedConversation}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                !hasStartedConversation
                  ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HangoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-gray-600 dark:text-gray-300">Loading...</div>
    </div>}>
      <HangoutContent />
    </Suspense>
  );
}
