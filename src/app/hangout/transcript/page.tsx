"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface Message {
    speaker: 'user' | 'ai';
    text: string;
    timestamp?: string;
}

interface Correction {
    quote: string;
    correction: string;
    criterion: 'Grammar' | 'Vocabulary' | 'Fluency' | 'Pronunciation';
    severity: 'MAJOR' | 'MINOR' | 'CRITICAL';
    explanation: string;
}

function TranscriptContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const goal = searchParams.get("goal") || "ielts";

    const [messages, setMessages] = useState<Message[]>([]);
    const [corrections, setCorrections] = useState<Correction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load transcript from sessionStorage
        const transcriptStr = sessionStorage.getItem('hangoutTranscript');
        const correctionsStr = sessionStorage.getItem('corrections');

        if (transcriptStr) {
            try {
                const parsed = JSON.parse(transcriptStr);
                setMessages(parsed);
            } catch (e) {
                console.error("Failed to parse transcript:", e);
            }
        }

        if (correctionsStr) {
            try {
                const parsed = JSON.parse(correctionsStr);
                setCorrections(parsed);
            } catch (e) {
                console.error("Failed to parse corrections:", e);
            }
        }

        setLoading(false);
    }, []);

    const handleBack = () => {
        router.back();
    };

    // Validate corrections data
    useEffect(() => {
        if (corrections.length > 0) {
            console.log("Loaded corrections:", corrections.length);
        }
    }, [corrections]);

    // Find corrections for a specific message with fuzzy matching
    const getCorrectionsForMessage = (messageContent: string): Correction[] => {
        const normalize = (text: string) => text.toLowerCase().replace(/[.,!?;:'"()-]/g, '').trim();
        const normMsg = normalize(messageContent);

        return corrections.filter(c => {
            const normQuote = normalize(c.quote);
            return normMsg.includes(normQuote) || normQuote.includes(normMsg);
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex justify-center font-sans overflow-x-hidden">
            <div className="w-full max-w-[430px] h-[100dvh] relative overflow-hidden shadow-2xl bg-white flex flex-col">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/assets/Home%20Background.svg"
                        alt="Home Background"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Header - Transparent Glass */}
                <div className="relative z-20 flex items-center justify-between px-6 py-6 pt-12">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-gray-700 shadow-sm hover:scale-105 transition-transform"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold text-gray-800 drop-shadow-sm">Full Transcript</h1>
                    <div className="w-10"></div>
                </div>

                {/* Chat Messages */}
                <main className="relative z-10 flex-1 px-5 py-4 space-y-4 overflow-y-auto scrollbar-hide pb-32">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            No conversation found.
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isUser = msg.speaker === 'user';
                            const messageCorrections = isUser ? getCorrectionsForMessage(msg.text) : [];

                            return (
                                <div
                                    key={idx}
                                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                                        {/* Message Bubble */}
                                        <div
                                            className={`rounded-2xl px-5 py-3 shadow-sm backdrop-blur-md ${isUser
                                                ? 'bg-blue-600 text-white rounded-br-md'
                                                : 'bg-white/60 text-gray-800 border border-white/50 rounded-bl-md'
                                                }`}
                                        >
                                            <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                                            {msg.timestamp && (
                                                <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                                                    {msg.timestamp}
                                                </p>
                                            )}
                                        </div>

                                        {/* Corrections (only for user messages) */}
                                        {messageCorrections.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                                {messageCorrections.map((corr, corrIdx) => (
                                                    <div
                                                        key={corrIdx}
                                                        className={`rounded-xl p-3 text-sm backdrop-blur-md border ${corr.severity === 'MAJOR' || corr.severity === 'CRITICAL'
                                                            ? 'bg-red-500/10 border-red-200/50'
                                                            : 'bg-yellow-500/10 border-yellow-200/50'
                                                            }`}
                                                    >
                                                        {/* Severity Badge */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${corr.severity === 'MAJOR' || corr.severity === 'CRITICAL'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                                    }`}
                                                            >
                                                                {corr.severity === 'CRITICAL' ? '🚨 CRITICAL' : corr.severity === 'MAJOR' ? '🔴 MAJOR' : '🟡 MINOR'}
                                                            </span>
                                                            <span className={`text-xs font-medium ${corr.severity === 'MAJOR' || corr.severity === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600'
                                                                }`}>
                                                                [{corr.criterion}]
                                                            </span>
                                                        </div>

                                                        {/* Correction */}
                                                        <div className="flex items-start gap-2 text-gray-700">
                                                            <span className="text-red-500">❌</span>
                                                            <span className="line-through text-gray-500">{corr.quote}</span>
                                                        </div>
                                                        <div className="flex items-start gap-2 text-gray-700 mt-1">
                                                            <span className="text-green-500">✓</span>
                                                            <span className="text-green-700 font-medium">{corr.correction}</span>
                                                        </div>

                                                        {/* Explanation */}
                                                        <p className="text-gray-600 text-xs mt-2 italic">
                                                            {corr.explanation}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </main>

                {/* Fixed Bottom Button with Transparent Glass */}
                <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-lg border-t border-white/30 z-50">
                    <div className="w-full max-w-[430px] mx-auto p-4">
                        <button
                            onClick={handleBack}
                            className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                        >
                            Back to Feedback
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TranscriptPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        }>
            <TranscriptContent />
        </Suspense>
    );
}
