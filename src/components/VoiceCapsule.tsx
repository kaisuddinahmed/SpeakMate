"use client";

import { motion, AnimatePresence } from "framer-motion";

interface VoiceCapsuleProps {
    isActive: boolean;
    isSpeaking: boolean;
    onStart: () => void;
    onEnd: () => void;
}

export function VoiceCapsule({ isActive, isSpeaking, onStart, onEnd }: VoiceCapsuleProps) {
    return (
        <div className="flex items-center justify-center p-6">
            <motion.div
                className="relative flex items-center justify-center"
                animate={{
                    scale: isSpeaking ? 1.05 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                {/* Outer Glow Ring (Active State) */}
                <AnimatePresence>
                    {isActive && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1.1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                            className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl"
                            style={{ width: '120%', height: '120%', left: '-10%', top: '-10%' }}
                        />
                    )}
                </AnimatePresence>

                {/* Main Mic Button */}
                <motion.button
                    onClick={isActive ? onEnd : onStart}
                    whileTap={{ scale: 0.95 }}
                    className={`
                        relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
                        ${isActive
                            ? "bg-violet-600 shadow-[0_0_30px_rgba(139,92,246,0.4)] ring-4 ring-violet-500/30"
                            : "bg-slate-800 shadow-xl border border-slate-700/50 hover:bg-slate-700"
                        }
                    `}
                >
                    {/* Animated Waveform (Inside Mic) */}
                    <AnimatePresence mode="wait">
                        {isSpeaking ? (
                            <motion.div
                                key="waves"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex gap-1 items-center"
                            >
                                {[1, 2, 3].map((i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ height: [4, 16, 4] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                                        className="w-1 bg-white rounded-full"
                                    />
                                ))}
                            </motion.div>
                        ) : (
                            /* Mic Icon */
                            <motion.svg
                                key="mic"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className={`w-8 h-8 ${isActive ? 'text-white' : 'text-slate-400'}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </motion.svg>
                        )}
                    </AnimatePresence>
                </motion.button>
            </motion.div>
        </div>
    );
}
