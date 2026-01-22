"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, MoreHorizontal, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

interface HangoutUIProps {
    messages: any[];
    interimTranscript: string;
    isListening: boolean;
    isAISpeaking: boolean;
    onStartSession: () => void;
    onBack: () => void;
    onEndCall: () => void;
}

export function HangoutUI({
    messages,
    interimTranscript,
    isListening,
    isAISpeaking,
    onStartSession,
    onEndCall,
    onBack
}: HangoutUIProps) {

    // --- Floating Stack Logic ---
    // We want the last 2 completed messages + the current interim one (if any).
    // Or just the last 3 completed messages if no interim.

    // 1. Get relevant history (reversed so newest is first for stack logic, but we render bottom-up)
    const recentHistory = messages.slice(-2);

    // 2. Combine with interim
    const stackItems = [
        ...recentHistory,
        ...(interimTranscript ? [{ id: 'interim', content: interimTranscript, role: 'user' }] : [])
    ];

    // If we only have 1 or 0 items including interim, maybe show one more from history?
    // Let's keep it simple: Show max 3 items total.
    const displayStack = messages.length > 0 && !interimTranscript
        ? messages.slice(-3)
        : [...messages.slice(-2), ...(interimTranscript ? [{ id: 'interim', content: interimTranscript, role: 'user' }] : [])];


    return (
        <div className="min-h-screen bg-white font-sans flex justify-center selection:bg-violet-500/30">

            {/* Mobile Canvas */}
            <div className="w-full max-w-[430px] min-h-screen relative shadow-2xl overflow-hidden flex flex-col">

                {/* 1. Immersive Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/assets/Hangout%20Background.svg"
                        alt="Space Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                </div>

                {/* 2. Back Button (Conditional) */}
                <AnimatePresence>
                    {!isListening && !isAISpeaking && messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-0 left-0 p-6 z-50"
                        >
                            <button
                                onClick={onBack}
                                className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white/80 hover:bg-white/20 transition-all hover:text-white"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 3. Main Stage */}
                <main className="relative z-10 flex flex-col items-center justify-end min-h-screen pb-40 px-6">

                    {/* --- Floating Transcript Stack --- */}
                    {/* Container positioned above the Orb */}
                    <div className="w-full flex flex-col justify-end items-center mb-6 h-[300px] overflow-hidden mask-linear-gradient">
                        <AnimatePresence initial={false}>
                            {displayStack.map((msg, index) => {
                                // Smart Key Logic: Unify Interim & Final identity to prevent flashing
                                // Interim is always the "next" index (messages.length)
                                // Finalized message at the end is ALSO that index.
                                const getStableKey = (m: any) => {
                                    if (m.id === 'interim') return `turn-${messages.length}`;
                                    const globalIndex = messages.indexOf(m);
                                    return globalIndex !== -1 ? `turn-${globalIndex}` : `fallback-${index}`;
                                };

                                const stableKey = getStableKey(msg);

                                // Visual Logic
                                const isNewest = index === displayStack.length - 1;
                                const isOldest = index === 0 && displayStack.length > 1;

                                return (
                                    <motion.div
                                        key={stableKey}
                                        layout
                                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                                        animate={{
                                            opacity: isNewest ? 1 : isOldest ? 0.4 : 0.7,
                                            y: 0,
                                            scale: isNewest ? 1 : 0.95
                                        }}
                                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className={`
                                            mb-3 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg max-w-[90%]
                                            ${msg.role === 'user' ? 'bg-white/10 self-end rounded-tr-sm' : 'bg-black/20 self-start rounded-tl-sm'}
                                        `}
                                        style={{ originY: 1 }}
                                    >
                                        <p className="text-lg md:text-xl font-medium text-white/95 leading-snug">
                                            {msg.content}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>


                    {/* AI Presence Orb */}
                    <div className="relative flex items-center justify-center mb-12">
                        {/* Core Orb */}
                        <motion.div
                            animate={{
                                scale: isAISpeaking ? [1, 1.1, 1] : isListening ? [1, 1.05, 1] : 1,
                                opacity: isAISpeaking ? 1 : 0.8,
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: isAISpeaking ? 2 : 4,
                                ease: "easeInOut"
                            }}
                            className="w-60 h-60 rounded-full bg-gradient-to-b from-indigo-400 via-violet-400 to-fuchsia-400 shadow-[0_0_100px_rgba(139,92,246,0.6)] blur-sm"
                        />

                        {/* Outer Rings (Breathing) */}
                        <motion.div
                            animate={{
                                scale: isAISpeaking ? [1.1, 1.3, 1.1] : [1.05, 1.15, 1.05],
                                opacity: isAISpeaking ? 0.4 : 0.2,
                            }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.2 }}
                            className="absolute inset-0 rounded-full border border-white/20"
                        />
                        <motion.div
                            animate={{
                                scale: isAISpeaking ? [1.3, 1.5, 1.3] : [1.15, 1.25, 1.15],
                                opacity: isAISpeaking ? 0.2 : 0.1,
                            }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 0.4 }}
                            className="absolute -inset-4 rounded-full border border-white/10"
                        />
                    </div>

                    {/* Status Text (Between Orb and Mic) */}
                    <div className="h-6 mb-4 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {isAISpeaking ? (
                                <motion.span
                                    key="talking"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-sm font-medium text-white/90 drop-shadow-md tracking-wide"
                                >
                                    SpeakMate is Talking...
                                </motion.span>
                            ) : isListening ? (
                                <motion.div
                                    key="listening"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    <span className="flex gap-1" >
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <motion.div
                                                key={i}
                                                className="w-1 bg-white/70 rounded-full"
                                                animate={{ height: [4, 12, 4] }}
                                                transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                                            />
                                        ))}
                                    </span>
                                    <span className="text-sm font-medium text-white/80 tracking-wide">SpeakMate is Listening...</span>
                                </motion.div>
                            ) : (messages.length > 0) ? (
                                <motion.span
                                    key="thinking"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-sm font-medium text-indigo-200 animate-pulse tracking-wide"
                                >
                                    SpeakMate is Thinking...
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="start"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-sm font-medium text-white/50 tracking-wide"
                                >
                                    Tap to start Hangout
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>

                </main>

                {/* 4. Bottom Controls: Mic Only */}
                <div className="absolute bottom-0 left-0 right-0 z-40 pb-12 flex flex-col items-center">
                    <motion.button
                        onClick={isListening || isAISpeaking ? onEndCall : onStartSession}
                        whileTap={{ scale: 0.95 }}
                        className={`
                            w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
                            ${isListening
                                ? "bg-white text-indigo-600 shadow-white/30 scale-105"
                                : "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
                            }
                        `}
                    >
                        {isListening ? (
                            <div className="w-8 h-8 rounded-sm bg-indigo-600" />
                        ) : (
                            <Mic className="w-10 h-10" strokeWidth={1.5} />
                        )}
                    </motion.button>
                </div>

            </div>
        </div>
    );
}
