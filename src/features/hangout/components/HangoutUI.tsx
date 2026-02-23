"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowLeft } from "lucide-react";

interface HangoutUIProps {
    messages: any[];
    interimTranscript: string;
    isListening: boolean;
    isAISpeaking: boolean;
    conversationState: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';
    onStartSession: () => void;
    onBack: () => void;
    onEndCall: () => void;
}

export function HangoutUI({
    messages,
    interimTranscript,
    isListening,
    isAISpeaking,
    conversationState,
    onStartSession,
    onEndCall,
    onBack
}: HangoutUIProps) {

    const isActive = conversationState !== 'IDLE';

    const buildDisplayStack = () => {
        const stack: Array<{
            id: string;
            index?: number;
            content: string;
            role: 'user' | 'assistant';
            isInterim?: boolean;
        }> = [];

        const historyLimit = interimTranscript ? 2 : 3;
        const recentMessages = messages.slice(-historyLimit);

        recentMessages.forEach((msg, idx) => {
            const globalIdx = messages.length - recentMessages.length + idx;
            stack.push({
                id: `turn-${globalIdx}`,
                index: globalIdx,
                content: msg.content,
                role: msg.role,
                isInterim: false
            });
        });

        if (interimTranscript) {
            stack.push({
                id: `turn-${messages.length}`,
                content: interimTranscript,
                role: 'user',
                isInterim: true
            });
        }

        return stack;
    };

    const displayStack = buildDisplayStack();

    return (
        <div className="min-h-screen bg-white font-sans flex justify-center">
            <div className="w-full max-w-[430px] h-[100dvh] relative overflow-hidden">

                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/assets/Hangout Background.svg"
                        alt=""
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Back Button */}
                <AnimatePresence>
                    {conversationState === 'IDLE' && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onBack}
                            style={{
                                position: 'absolute',
                                top: '24px',
                                left: '24px',
                                zIndex: 50,
                                padding: '12px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(24px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '50%',
                                color: 'white'
                            }}
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <div style={{ position: 'relative', zIndex: 10, height: '100%' }}>

                    {/* Transcript Area - Anchored above Orb */}
                    <div style={{
                        position: 'absolute',
                        bottom: '530px', // Just above Orb (250px bottom + 264px height + gap)
                        left: 0,
                        right: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '0 24px',
                        pointerEvents: 'none',
                        zIndex: 30
                    }}>
                        <AnimatePresence initial={false} mode="popLayout">
                            {displayStack.map((msg, index) => {
                                const isNewest = index === displayStack.length - 1;
                                const isOldest = index === 0 && displayStack.length >= 3;

                                return (
                                    <motion.div
                                        key={msg.id}
                                        layout
                                        initial={{ opacity: 0, y: 60, scale: 0.9 }}
                                        animate={{
                                            opacity: msg.isInterim ? 0.6 : isNewest ? 1 : isOldest ? 0.3 : 0.7,
                                            y: 0,
                                            scale: isNewest ? 1 : 0.95
                                        }}
                                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                        transition={{
                                            duration: 0.8,
                                            ease: "easeOut",
                                            // Dynamic Delay: 2.5s for start (cold), 0s for ongoing (warm)
                                            delay: (isNewest && msg.role === 'assistant')
                                                ? ((msg.index ?? 0) <= 2 ? 2.5 : 0)
                                                : 0
                                        }}
                                        className={`
                                            mb-3 px-5 py-4 rounded-2xl backdrop-blur-xl shadow-lg max-w-[85%]
                                            ${msg.role === 'user'
                                                ? 'self-end rounded-br-md bg-white/15 border border-white/20'
                                                : 'self-start rounded-bl-md bg-black/25 border border-white/10'}
                                            ${msg.isInterim ? 'border-dashed opacity-70' : ''}
                                        `}
                                    >
                                        <p className={`text-[17px] leading-relaxed text-white ${msg.isInterim ? 'italic' : 'font-medium'}`}>
                                            {msg.content}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Orb - With soft glow blending into background */}
                    <motion.div
                        animate={{
                            scale: isAISpeaking ? [1, 1.05, 1] : isActive ? [1, 1.02, 1] : [1, 1.01, 1],
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: isAISpeaking ? 1.5 : 3.5,
                            ease: "easeInOut"
                        }}
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: '250px',
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        {/* Speaker Rings - Sound Waves when talking */}
                        {isAISpeaking && (
                            <>
                                <motion.div
                                    initial={{ scale: 1, opacity: 0.4 }}
                                    animate={{ scale: 1.6, opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                                    style={{
                                        position: 'absolute', inset: 0, borderRadius: '50%',
                                        zIndex: 10, border: '1px solid rgba(255, 255, 255, 0.4)'
                                    }}
                                />
                                <motion.div
                                    initial={{ scale: 1, opacity: 0.4 }}
                                    animate={{ scale: 1.6, opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 1.8, delay: 0.4, ease: "easeOut" }}
                                    style={{
                                        position: 'absolute', inset: 0, borderRadius: '50%',
                                        zIndex: 10, border: '1px solid rgba(255, 255, 255, 0.2)'
                                    }}
                                />
                            </>
                        )}

                        <div style={{
                            zIndex: 20,
                            width: '264px',
                            height: '264px',
                            borderRadius: '50%',
                            // Soft Purple -> Pink, slightly transparent to mesh
                            background: 'linear-gradient(180deg, rgba(167, 139, 250, 0.85) 0%, rgba(232, 121, 249, 0.85) 100%)',
                            backdropFilter: 'blur(6px)',
                            // Soft meshed glow, no hard 3D edges
                            boxShadow: '0 0 80px rgba(167, 139, 250, 0.5)',
                            filter: 'blur(8px)'
                        }}
                        />
                    </motion.div>

                    {/* Status Text - Closer to orb */}
                    <div style={{ position: 'absolute', bottom: '170px', left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={conversationState}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: conversationState === 'THINKING' ? [0.4, 0.7, 0.4] : 0.7 }}
                                exit={{ opacity: 0 }}
                                transition={conversationState === 'THINKING' ? { repeat: Infinity, duration: 1.5 } : {}}
                                style={{ fontSize: '16px', fontWeight: 300, color: 'white', letterSpacing: '0.05em' }}
                            >
                                {conversationState === 'SPEAKING' && 'SpeakMate is Talking'}
                                {conversationState === 'THINKING' && 'SpeakMate is Thinking'}
                                {conversationState === 'LISTENING' && 'SpeakMate is Listening'}
                                {conversationState === 'IDLE' && 'Tap to start Hangout'}
                            </motion.span>
                        </AnimatePresence>
                    </div>

                    {/* Mic Button - Lower at bottom */}
                    <div style={{ position: 'absolute', bottom: '48px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                        <div className="relative">
                            {/* Wave rings when speaking */}
                            {conversationState === 'SPEAKING' && (
                                <>
                                    <motion.div
                                        initial={{ scale: 1, opacity: 0.4 }}
                                        animate={{ scale: 1.8, opacity: 0 }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="absolute inset-0 rounded-full border-2 border-white/40"
                                    />
                                    <motion.div
                                        initial={{ scale: 1, opacity: 0.3 }}
                                        animate={{ scale: 2.2, opacity: 0 }}
                                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                                        className="absolute inset-0 rounded-full border border-white/30"
                                    />
                                </>
                            )}

                            {/* Pulse when listening */}
                            {conversationState === 'LISTENING' && (
                                <motion.div
                                    animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 rounded-full bg-white/20"
                                />
                            )}

                            {/* Main Button */}
                            <motion.button
                                onClick={isActive ? onEndCall : onStartSession}
                                whileTap={{ scale: 0.92 }}
                                className={`
                                    relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                                    ${isActive
                                        ? "bg-white text-indigo-600 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                        : "bg-white/10 backdrop-blur-xl border-2 border-white/30 text-white hover:bg-white/15"
                                    }
                                `}
                            >
                                {isActive ? (
                                    <div className="w-8 h-8 rounded-md bg-indigo-600" />
                                ) : (
                                    <Mic className="w-10 h-10" strokeWidth={2} />
                                )}
                            </motion.button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
