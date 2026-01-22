import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioTurnManager, Message } from '../audio/useAudioTurnManager';
import {
    buildPrompt,
    getPart1Question,
    Part1Domain,
    Part2Topic,
    PART2_TOPIC_MAPPING,
    PART2_PROMPTS,
    PART3_PROMPTS
} from '../prompts/promptEngine';
import { HangoutPhase } from './phases';
import { generateSessionGreeting, getTimeOfDay } from './nameCapture';

export function useConversationController(initialTopic: Part1Domain = 'introduction') {
    // --- 1. Brain State ---
    const [phase, setPhase] = useState<HangoutPhase>('SESSION_ENTRY');
    const [currentPart1Domain, setPart1Domain] = useState<Part1Domain>(initialTopic);
    const [currentPart2Topic, setPart2Topic] = useState<Part2Topic>('daily_routine_detail');

    // Memory
    const usedQuestionIds = useRef(new Set<string>());
    const turnCountRef = useRef(0);

    // --- 2. Logic (The Brain decides WHAT happens) ---
    const processUserTurn = async (text: string, history: Message[]) => {
        console.log(`[Brain] User: "${text}" | Phase: ${phase}`);
        turnCountRef.current++;

        let systemPrompt = "";

        // --- PHASE LOGIC ---
        if (phase === "PART1") {
            const question = getPart1Question(currentPart1Domain, usedQuestionIds.current);

            if (question) {
                usedQuestionIds.current.add(question.id);
                systemPrompt = buildPrompt({
                    intent: question.intent,
                    domain: question.domain,
                    examples: question.examples,
                    avoid: question.avoid
                });
            } else {
                console.log("Part 1 Domain exhausted. Moving to Part 2.");
                const mappedTopic = PART2_TOPIC_MAPPING[currentPart1Domain];
                setPart2Topic(mappedTopic);
                setPhase("PART2");
                turnCountRef.current = 0;

                // Immediate transition to Part 2 Main Prompt
                const promptData = PART2_PROMPTS[mappedTopic];
                systemPrompt = buildPrompt({
                    intent: "ASK_PART2_LONG_TURN",
                    domain: mappedTopic,
                    examples: promptData.main
                });
            }
        }

        else if (phase === "PART2") {
            const isLongResponse = text.split(' ').length > 20;
            const promptData = PART2_PROMPTS[currentPart2Topic];

            if (turnCountRef.current === 0) {
                if (isLongResponse) {
                    // Satisfied -> Move to Part 3 (Share Opinion)
                    setPhase("PART3");
                    const part3Data = PART3_PROMPTS[currentPart2Topic][0]; // 0 = SHARE_MILD_OPINION
                    systemPrompt = buildPrompt({
                        intent: part3Data.intent,
                        domain: currentPart2Topic,
                        examples: part3Data.examples,
                        avoid: part3Data.avoid
                    });
                } else {
                    // Nudge
                    systemPrompt = buildPrompt({
                        intent: "NUDGE_PART2",
                        domain: currentPart2Topic,
                        examples: promptData.nudge
                    });
                }
            } else {
                // Forced move to Part 3 (Share Opinion)
                setPhase("PART3");
                const part3Data = PART3_PROMPTS[currentPart2Topic][0];
                systemPrompt = buildPrompt({
                    intent: part3Data.intent,
                    domain: currentPart2Topic,
                    examples: part3Data.examples,
                    avoid: part3Data.avoid
                });
            }
        }

        else if (phase === "PART3") {
            // Already shared opinion? Now ask followup.
            const part3Data = PART3_PROMPTS[currentPart2Topic][1]; // 1 = ASK_FOLLOWUP
            systemPrompt = buildPrompt({
                intent: part3Data.intent,
                domain: currentPart2Topic,
                examples: part3Data.examples,
                avoid: part3Data.avoid
            });
        } else {
            systemPrompt = buildPrompt({
                intent: "CHAT_NATURALLY",
                domain: "general",
                examples: ["That's interesting!", "Tell me more."]
            });
        }

        // --- C. Call LLM ---
        audioManager.setThinking();

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...history.map(m => ({ role: m.role, content: m.content })),
                    ],
                    temperature: 0.7,
                    max_tokens: 150,
                }),
            });

            const data = await response.json();
            const aiText = data.choices[0]?.message?.content || "I didn't quite catch that.";

            // D. Speak
            audioManager.speak(aiText);

        } catch (err) {
            console.error('LLM Error', err);
            audioManager.speak("I'm having trouble thinking right now. Can you say that again?");
        }
    };

    // --- 3. Initialize Audio Layer ---
    const audioManager = useAudioTurnManager({
        onUserTurn: processUserTurn
    });

    // Unpack state for Silence Breaker
    const { state } = audioManager;

    // --- 4. Greeting Logic (Session Entry) ---
    const startSession = useCallback(async () => {
        if (audioManager.isListening) return;

        // A. Start Audio Layer
        await audioManager.startListening();

        // B. Generate Greeting (Session Entry)
        // Retrieve context from localStorage
        const storedName = typeof window !== 'undefined' ? localStorage.getItem('speakmate_userName') : "Friend";
        const lastVisitStr = typeof window !== 'undefined' ? localStorage.getItem('speakmate_lastVisit') : null;
        const lastVisit = lastVisitStr ? parseInt(lastVisitStr) : null;

        const greeting = generateSessionGreeting({
            userName: storedName?.split(' ')[0] || "Friend",
            lastVisit: lastVisit,
            timeOfDay: getTimeOfDay()
        });

        // C. Update Visits (Future Proofing)
        if (typeof window !== 'undefined') {
            localStorage.setItem('speakmate_lastVisit', Date.now().toString());
        }

        // D. Speak Greeting
        audioManager.speak(greeting);

        // E. Transition to Part 1 (Internal Flow)
        // The greeting is a "Session Event", not a conversation turn.
        // We immediately enter Part 1 so the next user input is processed as Part 1.
        setPhase("PART1");

    }, [audioManager]);

    // --- 5. Silence Breaker (Post-Greeting) ---
    useEffect(() => {
        let timer: NodeJS.Timeout;

        // Condition: Just listened to greeting (turn 0), waiting for user (LISTENING), phase is SESSION_ENTRY or PART1
        // Note: startSession sets phase to PART1 immediately.
        if (state === 'LISTENING' && turnCountRef.current === 0) {
            console.log("[SilenceBreaker] Timer started (6s)...");
            timer = setTimeout(() => {
                console.log("[SilenceBreaker] Silence detected! Nudging user...");

                // Random Natural Nudges
                const nudges = [
                    "Everything okay?",
                    "I'm listening.",
                    "Take your time.",
                    "You there?",
                    "Ready when you are."
                ];
                const randomNudge = nudges[Math.floor(Math.random() * nudges.length)];

                // Speak directly (bypassing LLM for speed/cost)
                audioManager.speak(randomNudge);

            }, 6000); // 6 seconds
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [state]); // Re-runs when state changes (e.g. LISTENING -> SPEAKING -> LISTENING)

    return {
        ...audioManager,
        topic: currentPart1Domain,
        phase,
        startSession
    };
}
