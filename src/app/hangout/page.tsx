"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConversationController } from "@/features/hangout/controller/useConversationController";
import { HangoutUI } from "./HangoutUI";

function HangoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goal = searchParams.get("goal") || "ielts";

  const controller = useConversationController();
  const { messages, stopListening } = controller;

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  useEffect(() => {
    setSessionStartTime(Date.now());
  }, []);

  const handleBack = () => {
    stopListening();
    router.push(goal ? `/?goal=${goal}` : '/');
  };

  const handleFinish = () => {
    stopListening();

    const durationMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const durationStr = `${minutes}m ${seconds}s`;

    const params = new URLSearchParams();
    params.append("duration", durationStr);
    params.append("messages", messages.length.toString());
    if (goal) params.append("goal", goal);

    router.push(`/hangout/summary?${params.toString()}`);
  };

  const handleEndCall = () => {
    stopListening();
    if (messages.length > 0) {
      handleFinish();
    }
  };

  return (
    <HangoutUI
      messages={controller.messages}
      interimTranscript={controller.interimTranscript}
      isListening={controller.isListening}
      isAISpeaking={controller.isAISpeaking}
      onStartSession={controller.startSession}
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
