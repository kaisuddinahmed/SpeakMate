"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface DynamicIslandProps {
    isListening: boolean;
    isSpeaking: boolean;
    isConnected: boolean;
}

export function DynamicIsland({ isListening, isSpeaking, isConnected }: DynamicIslandProps) {
    const [state, setState] = useState<"idle" | "listening" | "speaking" | "connecting">("idle");

    useEffect(() => {
        if (!isConnected) {
            setState("connecting");
        } else if (isSpeaking) {
            setState("speaking");
        } else if (isListening) {
            setState("listening");
        } else {
            setState("idle");
        }
    }, [isConnected, isSpeaking, isListening]);

    const variants = {
        idle: { width: 120, height: 36, borderRadius: 24 },
        connecting: { width: 120, height: 36, borderRadius: 24 },
        listening: { width: 180, height: 50, borderRadius: 30 },
        speaking: { width: 220, height: 60, borderRadius: 32 },
    };

    return (
        <div className="flex justify-center w-full my-4">
            <motion.div
                animate={state}
                variants={variants}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-black dark:bg-black text-white flex items-center justify-center overflow-hidden shadow-2xl relative z-50"
            >
                <AnimatePresence mode="wait">
                    {state === "connecting" && (
                        <motion.div
                            key="connecting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2"
                        >
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                            <span className="text-xs font-medium">Connecting...</span>
                        </motion.div>
                    )}

                    {state === "idle" && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2"
                        >
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs font-medium">SpeakMate</span>
                        </motion.div>
                    )}

                    {state === "listening" && (
                        <motion.div
                            key="listening"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center justify-between w-full px-6"
                        >
                            <div className="flex gap-1 h-3 items-center">
                                {[1, 2, 3, 4].map((i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ height: [8, 16, 8] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 0.5,
                                            delay: i * 0.1,
                                        }}
                                        className="w-1 bg-red-500 rounded-full"
                                    />
                                ))}
                            </div>
                            <span className="text-sm font-semibold ml-3">Listening</span>
                        </motion.div>
                    )}

                    {state === "speaking" && (
                        <motion.div
                            key="speaking"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center justify-center w-full px-4"
                        >
                            <div className="w-full flex items-center justify-center gap-1">
                                {/* Waveform Visualization */}
                                {[...Array(8)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            height: [10, 25, 10],
                                            opacity: [0.5, 1, 0.5]
                                        }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 0.8,
                                            ease: "easeInOut",
                                            delay: i * 0.05,
                                        }}
                                        className="w-1.5 bg-gradient-to-t from-indigo-400 to-purple-400 rounded-full"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
