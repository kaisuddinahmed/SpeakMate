"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    role: 'user' | 'assistant'; // Normalized to 'role' to match controller
    content: string;          // Normalized to 'content'
    timestamp: number;
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
                // Normalize data structure if needed (handle both 'speaker' and 'role')
                const normalized = parsed.map((m: any) => ({
                    role: m.role || (m.speaker === 'user' ? 'user' : 'assistant'),
                    content: m.content || m.text,
                    timestamp: m.timestamp
                }));
                setMessages(normalized);
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

    // Find corrections for a specific message with improved matching
    const getCorrectionsForMessage = (messageContent: string): Correction[] => {
        if (!messageContent) return [];
        const normalize = (text: string) => text.toLowerCase().replace(/[.,!?;:'"()-]/g, '').trim();
        const normMsg = normalize(messageContent);

        return corrections.filter(c => {
            const normQuote = normalize(c.quote);
            // Check if the quote describes a substantial part of this message
            return normMsg.includes(normQuote) || (normQuote.length > 5 && normQuote.includes(normMsg));
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
                <main className="relative z-10 flex-1 px-5 py-4 space-y-6 overflow-y-auto scrollbar-hide pb-32">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <p>No conversation found.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            const messageCorrections = isUser ? getCorrectionsForMessage(msg.content) : [];

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                                >
                                    {/* Sender Label */}
                                    <span className={`text-[10px] font-semibold tracking-wider mb-1 px-1 ${isUser ? 'text-blue-600' : 'text-purple-600'}`}>
                                        {isUser ? 'YOU' : 'SPEAKMATE'}
                                    </span>

                                    <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                                        {/* Message Bubble */}
                                        <div
                                            className={`rounded-2xl px-5 py-3 shadow-md backdrop-blur-md border ${isUser
                                                ? 'bg-blue-600/90 text-white border-blue-500/50 rounded-tr-sm'
                                                : 'bg-white/70 text-gray-800 border-white/60 rounded-tl-sm'
                                                }`}
                                        >
                                            <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                                        </div>

                                        {/* Corrections OR Perfect Badge */}
                                        {messageCorrections.length > 0 ? (
                                            <div className="mt-3 space-y-3 pl-2">
                                                {messageCorrections.map((corr, corrIdx) => (
                                                    <div
                                                        key={corrIdx}
                                                        className={`relative overflow-hidden rounded-xl p-3 text-sm backdrop-blur-md border shadow-sm ${corr.severity === 'MAJOR' || corr.severity === 'CRITICAL'
                                                            ? 'bg-red-50/90 border-red-200'
                                                            : 'bg-amber-50/90 border-amber-200'
                                                            }`}
                                                    >
                                                        {/* Left Accent Bar */}
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${corr.severity === 'MAJOR' || corr.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'
                                                            }`} />

                                                        {/* Header */}
                                                        <div className="flex items-center justify-between mb-2 pl-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs font-bold uppercase tracking-wide ${corr.severity === 'MAJOR' || corr.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-700'
                                                                    }`}>
                                                                    {corr.criterion}
                                                                </span>
                                                            </div>
                                                            {corr.severity === 'CRITICAL' && (
                                                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                                                    CRITICAL
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="pl-2 space-y-2">
                                                            <div>
                                                                <div className="flex items-start gap-2 text-gray-400 text-xs mb-1">
                                                                    <span className="line-through decoration-red-400 decoration-2 text-gray-500 font-medium">
                                                                        {corr.quote}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-start gap-2 text-green-700 font-bold text-sm">
                                                                    <span>{corr.correction}</span>
                                                                </div>
                                                            </div>
                                                            <div className={`text-xs leading-relaxed pt-1 border-t ${corr.severity === 'MAJOR' ? 'border-red-100 text-red-800' : 'border-amber-100 text-amber-800'
                                                                }`}>
                                                                {corr.explanation}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Perfect Badge for Good Speech (>2 words) */
                                            isUser && msg.content.split(' ').length > 2 && (
                                                <div className="mt-2 pl-2">
                                                    <div className="inline-flex items-center gap-1.5 bg-green-100/80 border border-green-200 text-green-700 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span className="text-xs font-bold uppercase tracking-wide">Perfect</span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </motion.div>
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
