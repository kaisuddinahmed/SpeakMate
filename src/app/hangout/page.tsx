"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Head from "next/head";
import { useConversation } from "@/features/hangout/hooks/useConversation";
import { HangoutUI } from "@/features/hangout/components/HangoutUI";

function HangoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goal = searchParams.get("goal") || "general";

  // New Unified Hook
  const {
    state: conversationState,
    messages,
    interimTranscript,
    isListening,
    startSession,
    stopSession,
    error
  } = useConversation();

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  useEffect(() => {
    setSessionStartTime(Date.now());
  }, []);

  const handleBack = () => {
    stopSession();
    // Force specific redirect to clear any potential shallow routing issues
    window.location.href = goal ? `/?goal=${goal}` : '/';
  };

  const handleFinish = () => {
    stopSession();

    const durationMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const durationStr = `${minutes}m ${seconds}s`;

    const params = new URLSearchParams();
    params.append("duration", durationStr);
    params.append("messages", messages.length.toString());
    if (goal) params.append("goal", goal);

    // Save Transcript for the Summary Page to Evaluate
    sessionStorage.setItem('hangoutTranscript', JSON.stringify(messages));
    sessionStorage.setItem('conversationHistory', JSON.stringify(messages)); // Logic in summary page checks both

    // Clear previous evaluation cache to force new evaluation
    sessionStorage.removeItem('cachedEvaluation');
    sessionStorage.removeItem('detailedFeedback');

    router.push(`/hangout/summary?${params.toString()}`);
  };

  const handleEndCall = () => {
    stopSession();
    if (messages.length > 0) {
      handleFinish();
    }
  };

  const isAISpeaking = conversationState === 'speaking' || conversationState === 'thinking';

  return (
    <HangoutUI
      messages={messages}
      interimTranscript={interimTranscript}
      isListening={isListening}
      isAISpeaking={isAISpeaking}
      conversationState={conversationState.toUpperCase() as any}
      onStartSession={startSession}
      onBack={handleBack}
      onEndCall={handleEndCall}
    />
  );
}

export default function HangoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HangoutContent />
    </Suspense>
  );
}
