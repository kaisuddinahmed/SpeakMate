import { useState, useRef, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useTextToSpeech } from './useTextToSpeech';

// ============================================
// TYPES
// ============================================

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

// ============================================
// DATA: QUESTION POOLS (Embedded)
// ============================================

// PART 1: General Interview Topics (Sourced from docs/part 1.md)
const PART1_TOPICS = [
    'Personal',         // Comfort, Identity, Neutral facts
    'Work & Studies',   // Description, not ambition
    'Daily Life',       // Strongest bridge to Part 2
    'Hobbies',          // Relax user, increase sentence length
    'Social Life',      // Friends, family, neighbors
    'Food & Drink',     // Culture, cooking, preferences
    'Places & Travel',  // Holidays, homework, future travel
    'Technology',       // Devices, internet, modern life
    'Experiences',      // Past events, memories
    'Nature',           // Weather, parks, environment
    'Festivals',        // Culture, celebration
    'Abstract'          // Only if fluent: happiness, success, etc.
];

// PART 2: Long Turn Themes (Sourced from docs/part 2.md)
const PART2_THEMES = [
    // People & Personalities
    'Describe a person who inspires you.',
    'Describe an energetic person you know.',
    'Describe a successful sportsperson you admire.',
    'Describe a person who helps protect the environment.',
    'Describe an intelligent person you know.',
    'Describe a person who is very open with their feelings.',
    'Describe a teacher who influenced your life.',
    'Describe a person you want to work or study with.',
    'Describe a person who persuaded you to do something.',
    'Describe an interesting old person you have met.',
    'Describe a famous person you would like to meet.',
    'Describe a person who often appears in the news.',
    'Describe a friend from your childhood.',
    'Describe a well-dressed person you know.',
    'Describe a person who likes to grow plants.',
    'Describe an introverted person you know.',
    'Describe a person who is a good cook.',
    'Describe a family member you spend the most time with.',
    'Describe a person who contributes significantly to society.',
    'Describe a person who gave you a piece of good advice.',

    // Places & Environments
    'Describe a country you would like to visit in the future.',
    'Describe a beautiful city you have been to.',
    'Describe a house or apartment you would like to live in.',
    'Describe a place in the countryside you enjoyed visiting.',
    'Describe a place with a lot of trees (e.g., a forest or park).',
    'Describe a noisy place you have been to.',
    'Describe a quiet place you often go to.',
    'Describe a place near water (e.g., a lake or beach).',
    'Describe a shop that recently opened in your area.',
    'Describe a historical building or monument in your country.',
    'Describe a place where you often go to relax.',
    'Describe a crowded place you have visited.',
    'Describe a library you have visited.',
    'Describe a museum or gallery you found interesting.',
    'Describe a place where you saw wild animals.',
    'Describe an area/city that is changing rapidly.',
    'Describe your favorite park or garden in your city.',
    'Describe a place you would recommend to tourists.',
    'Describe a place you visited where the air was polluted.',
    'Describe a street you like to walk in.',

    // Objects & Possessions
    'Describe an object you think is beautiful.',
    'Describe a piece of technology you find difficult to use.',
    'Describe a useful website you visit frequently.',
    'Describe a mobile app you find helpful.',
    'Describe a piece of clothing you often wear.',
    'Describe a gift you gave that took a long time to choose.',
    'Describe an important email you received.',
    'Describe an invention that changed people\'s lives.',
    'Describe a photograph of yourself that you like.',
    'Describe a book you have read many times.',
    'Describe a piece of art (painting/sculpture) you like.',
    'Describe a piece of furniture in your home.',
    'Describe something you bought but didn\'t use much.',
    'Describe a plant or flower that is important in your country.',
    'Describe a traditional object from your culture.',
    'Describe an advertisement you remember well.',
    'Describe a vehicle you would like to buy.',
    'Describe something you received for free.',
    'Describe an unusual meal you had.',
    'Describe a uniform you have worn (e.g., for school or work).',

    // Events & Experiences
    'Describe a time you saw something interesting in the sky.',
    'Describe a time when the electricity suddenly went off.',
    'Describe a time someone apologized to you.',
    'Describe a time you made a promise to someone.',
    'Describe a successful small business you know.',
    'Describe an occasion when many people were smiling.',
    'Describe a time you told a friend an important truth.',
    'Describe a party you attended and enjoyed.',
    'Describe a memorable holiday or vacation.',
    'Describe an occasion when you wasted your time.',
    'Describe a time you felt very proud of yourself.',
    'Describe a difficult decision you made recently.',
    'Describe a time you had to use your imagination.',
    'Describe an exciting activity you tried for the first time.',
    'Describe a time you waited for something or someone for a long time.',
    'Describe a time you got lost in a place you didn\'t know.',
    'Describe a sports event you watched or participated in.',
    'Describe a time you received money as a gift.',
    'Describe a competition you took part in.',
    'Describe a time you helped someone in your community.',

    // Activities & Interests
    'Describe a sport you would like to learn.',
    'Describe an outdoor activity you did for the first time.',
    'Describe a skill you can teach other people.',
    'Describe a hobby you enjoy doing on the weekends.',
    'Describe a job that is useful to society.',
    'Describe a course or subject you want to learn more about.',
    'Describe a daily routine you enjoy.',
    'Describe a language you would like to learn (other than English).',
    'Describe an impressive talk or conversation you remember.',
    'Describe a TV series or movie that made you laugh.',
    'Describe a song that is special to you.',
    'Describe a live performance you enjoyed watching.',
    'Describe a long walk you once took.',
    'Describe a rule you dislike and would like to change.',
    'Describe something you do to stay healthy.',
    'Describe a goal you want to achieve in the future.',
    'Describe a project you worked on as part of a team.',
    'Describe an interesting traditional story or legend.',
    'Describe a time you searched for information on the internet.',
    'Describe a time you had to change your plans.'
];

// ============================================
// TYPES
// ============================================

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    confidence?: number;
}

type ConversationPhase = 'greeting' | 'part1' | 'part2_bridge' | 'part2_monologue' | 'part3' | 'conclusion';
type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface ConversationContext {
    phase: ConversationPhase;
    elapsedMinutes: number;
    part1TopicsUsed: string[];
    part2Theme: string | null;
    depthLevel: 'band4_basic' | 'band6_intermediate' | 'band8_advanced'; // Inferred from user
}

// ============================================
// MAIN HOOK
// ============================================

export function useConversation() {
    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationState, setConversationState] = useState<ConversationState>('idle');
    const [userName, setUserName] = useState<string | null>(null);
    const [interimTranscript, setInterimTranscript] = useState<string>('');

    // Turn counter
    const turnCountRef = useRef<number>(0);

    // Context tracking
    const startTimeRef = useRef<number>(0);
    const contextRef = useRef<ConversationContext>({
        phase: 'greeting',
        elapsedMinutes: 0,
        part1TopicsUsed: [],
        part2Theme: null,
        depthLevel: 'band6_intermediate' // Default start
    });

    const hasBridgeTriggeredRef = useRef(false);

    // Audio hooks
    const tts = useTextToSpeech();

    // Barge-in protection
    const bargeInBlockRef = useRef(false);
    const transcriptBufferRef = useRef<string[]>([]);
    const confidenceBufferRef = useRef<number[]>([]);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ============================================
    // BRAIN: PROMPT BUILDER (Layered)
    // ============================================

    // 0. Load History (Sync for simplicity, or use effect)
    const getHistory = useCallback(() => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem('speakmate_history_part2');
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }, []);

    // 1. Save History Helper
    const saveTopicHistory = useCallback((theme: string) => {
        const current = getHistory();
        if (!current.includes(theme)) {
            const updated = [...current, theme];
            localStorage.setItem('speakmate_history_part2', JSON.stringify(updated));
        }
    }, [getHistory]);


    // LAYER A: THE SOUL (Base Persona)
    const BASE_PERSONA = `
    You are SpeakMate, a warm and friendly conversation partner.
    ROLE: A supportive companion, NOT a teacher or examiner.
    TONE: Soft, calm, encouraging.
    
    CRITICAL RULES (NEVER BREAK):
    1. NEVER mention "IELTS", "Correction", "Practice", "Score", or "Mistakes".
    2. If the user is shy/silent, take the lead gently.
    CRITICAL RULES (NEVER BREAK):
    1. NEVER mention "IELTS", "Correction", "Practice", "Score", or "Mistakes".
    2. If the user is shy/silent, take the lead gently.
    3. Keep replies SHORT (2-4 sentences max) and natural.
    4. If user pauses, be patient.
    5. USER AGENCY: In PART 1, always follow the user's lead if they change topics. In PART 2, try to keep them on the assigned Theme, unless they seem uncomfortable or unable to answer, in which case offer a NEW Theme.
    6. NAME USAGE: Do NOT use the user's name at the end of every sentence. Use it RARELY (max once per session after greeting).
    `;

    // LAYER B & C: Phase + Adaptation
    const selectSystemPrompt = useCallback((userText: string): string => {
        const { phase, part1TopicsUsed, part2Theme, elapsedMinutes } = contextRef.current;
        const previousThemes = getHistory();

        // Simple heuristic for adaptation (could be smarter later)
        // If user text is very short (< 5 words), assume basic. If complex, assume advanced.
        let adaptationInstruction = "ADAPTATION: Speak naturally (Band 6-7 level). Mix simple and slightly advanced phrasing.";
        if (userText.split(' ').length < 6 && phase !== 'greeting') {
            adaptationInstruction = "ADAPTATION: User seems hesitant (Band 4-5). Use short simple sentences. Slow pace.";
        } else if (userText.length > 100) {
            adaptationInstruction = "ADAPTATION: User is fluent (Band 8-9). Speak naturally like a peer.";
        }

        let phaseInstruction = "";

        switch (phase) {
            case 'greeting':
                phaseInstruction = `
                PHASE: GREETING (Follow-up).
                CONTEXT: You have already greeted the user (or they started the chat).
                GOAL: React naturally to their reply, then transition to Part 1.
                INSTRUCTION: 
                1. Acknowledge their news/feeling (briefly).
                2. Do NOT say "Hello", "Welcome", or "My name is..." again.
                3. Bridge smoothly to a Part 1 Topic (Interview).
                `;
                break;

            case 'part1':
                phaseInstruction = `
                PHASE: PART 1 (The Interview).
                AVAILABLE TOPICS: ${PART1_TOPICS.join(', ')}.
                
                GOAL: Conduct a natural Q&A covering 3-4 topics total (approx 1 min per topic).
                INSTRUCTION: 
                1. TOPIC SELECTION: Choose a topic from the list that links naturally to the user's last response.
                2. USER OVERRIDE: If the user asks clearly to talk about a specific topic (even if not in the list), ACCEPT IT and ask about that.
                3. NO REPEATS (Unless User Requests): Do not discuss a topic you have already covered in this session, unless the user brings it up.
                4. STYLE: Ask open-ended questions. Share a tiny 1-sentence opinion before asking ("I love that too. What's your favorite part?").
                `;
                break;

            case 'part2_bridge':
                phaseInstruction = `
                PHASE: BRIDGE TO PART 2.
                GOAL: Transition from small talk to a story request.
                INSTRUCTION: Say: "Listening to you talks about X makes me curious about something bigger..."
                Then ask them to describe: "${part2Theme}".
                `;
                break;

            case 'part2_monologue':
                phaseInstruction = `
                PHASE: PART 2 (The Story).
                GOAL: Listen.
                INSTRUCTION: The user is telling a story. Do NOT interrupt.
                If they touched on the theme (${part2Theme}), just say "Mm-hmm" or "Tell me more".
                PHASE: PART 2 (The Story).
                GOAL: Listen.
                INSTRUCTION: The user is telling a story. Do NOT interrupt. 
                If they touched on the theme (${part2Theme}), just say "Mm-hmm" or "Tell me more".
                
                **RULES FOR OFF-TOPIC:**
                1. If user tries to change topic: Gently steer them back ("That's interesting, but I'd love to hear more about [Theme]...").
                2. EXCEPTION: If user signals DISCOMFORT or "I don't know": Immediately offer a NEW Theme from the pool (pick one yourself).
                
                Only ask a question if they stopped completely.
                `;
                break;

            case 'part3':
                phaseInstruction = `
                PHASE: PART 3 (Discussion).
                GOAL: Abstract ideas related to the Part 2 theme ("${part2Theme}").
                
                RULES (Sourced from docs/part 3.md):
                1. ANCHOR: Start by acknowledging their story, then zoom out to a broader social/global issue. NEVER ask a question cold.
                2. DEPTH (OREO): Guide them through Opinion -> Reason -> Example -> Other Side (Contrast).
                3. STYLE: Be a "Thoughtful Partner", not an examiner. Share your own light opinions. Use hedging ("It seems to me...", "Some might say...").
                4. FLOW: Stick to one abstract theme for 3-4 turns. Challenge them gently.
                `;
                break;

            case 'conclusion':
                phaseInstruction = `
                PHASE: CONCLUSION.
                GOAL: Wrap up warm.
                INSTRUCTION: Say it was lovely chatting. Signal the end of this coffee break.
                `;
                break;
        }

        return `${BASE_PERSONA}
        \n${adaptationInstruction}
        \n${phaseInstruction}
        \nCONTEXT: User Name: ${userName || 'Friend'}. Elapsed: ${elapsedMinutes.toFixed(1)} mins.
        `;

    }, [userName]);


    // ============================================
    // LOGIC: PHASE SWITCHER
    // ============================================
    const updatePhase = useCallback(() => {
        const { elapsedMinutes, phase, part2Theme } = contextRef.current;

        // 1. Part 1 (1 - 4 mins)
        if (phase === 'greeting' && elapsedMinutes > 1) {
            contextRef.current.phase = 'part1';
            return;
        }

        // 2. Part 2 Bridge (At 4 mins)
        if (phase === 'part1' && elapsedMinutes > 4) {
            // Pick a theme (History Aware)
            const previousThemes = getHistory();
            const freshThemes = PART2_THEMES.filter(t => !previousThemes.includes(t));

            // Fallback if user exhausts all 50 themes (Reset or random)
            const available = freshThemes.length > 0 ? freshThemes : PART2_THEMES;
            const theme = available[Math.floor(Math.random() * available.length)];

            contextRef.current.part2Theme = theme;
            contextRef.current.phase = 'part2_bridge';
            hasBridgeTriggeredRef.current = true;

            // Persist immediately so it counts as "used"
            saveTopicHistory(theme);
            return;
        }

        // 3. Part 2 Monologue (After bridge)
        if (phase === 'part2_bridge') {
            // After one turn of bridge, we are in monologue
            contextRef.current.phase = 'part2_monologue';
            return;
        }

        // 4. Part 3 (At 7 mins)
        if (phase === 'part2_monologue' && elapsedMinutes > 7) {
            contextRef.current.phase = 'part3';
            return;
        }

        // 5. Conclusion (At 12+ mins)
        // (User asked for 15, so let's start wrapping at 13)
        if (phase === 'part3' && elapsedMinutes > 13) {
            contextRef.current.phase = 'conclusion';
            return;
        }

    }, [getHistory, saveTopicHistory]);


    // ============================================
    // CONVERSATION LOOP
    // ============================================

    const processUserTurn = useCallback(async (userText: string, confidence?: number) => {
        console.log(`[Conversation] User: "${userText}" (Conf: ${confidence?.toFixed(2)})`);

        // 0. Safety Catch
        setInterimTranscript('');

        // 1. Update History
        const newUserMessage: Message = {
            role: 'user',
            content: userText,
            timestamp: Date.now(),
            confidence
        };
        const updatedHistory = [...messages, newUserMessage];
        setMessages(updatedHistory);

        // 2. Update Context & Phase
        if (startTimeRef.current > 0) {
            contextRef.current.elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
        }
        updatePhase(); // Check if we need to switch gears

        // 3. Thinking State
        setConversationState('thinking');

        try {
            // 4. Brain Logic (Dynamic Instruction)
            const systemPrompt = selectSystemPrompt(userText);

            // 5. Secure API Call
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...updatedHistory.map(m => ({ role: m.role, content: m.content }))
                    ],
                    userName: userName
                })
            });

            if (!response.ok) throw new Error('Chat API failed');

            const data = await response.json();
            const aiText = data.message || "I didn't quite catch that.";

            // 6. Sync UI with Audio
            const aiMessage: Message = { role: 'assistant', content: aiText, timestamp: Date.now() };

            await tts.speak(aiText, {
                onStart: () => {
                    setConversationState('speaking');
                    setInterimTranscript('');
                    setMessages(prev => [...prev, aiMessage]);
                },
                onEnd: () => {
                    setConversationState('listening');
                    setInterimTranscript('');
                    startSilenceTimer();
                }
            });

        } catch (error) {
            console.error('[Conversation] Error:', error);
            setConversationState('listening');
        }

    }, [messages, selectSystemPrompt, updatePhase, tts, userName]);


    // ============================================
    // AUDIO HANDLERS
    // ============================================

    const startSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        silenceTimerRef.current = setTimeout(() => {
            console.log('[Conversation] Silence nudge...');
            const nudge = "Still there?"; // Simple nudge
            tts.speak(nudge, {
                onEnd: () => startSilenceTimer()
            });
        }, 12000); // 12s silence
    }, [tts]);

    const handleFinalTranscript = useCallback((text: string, metadata?: { confidence: number }) => {
        if (bargeInBlockRef.current) return;

        transcriptBufferRef.current.push(text);
        if (metadata?.confidence) confidenceBufferRef.current.push(metadata.confidence);

        const fullText = transcriptBufferRef.current.join(' ');

        console.log(`[Conversation] Final: "${fullText}"`);
        setInterimTranscript('');

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        const isComplete = fullText.length > 5; // Slightly lower threshold

        if (isComplete) {
            const avgConf = confidenceBufferRef.current.length > 0
                ? confidenceBufferRef.current.reduce((a, b) => a + b, 0) / confidenceBufferRef.current.length
                : undefined;

            transcriptBufferRef.current = [];
            confidenceBufferRef.current = [];
            processUserTurn(fullText, avgConf);
        } else {
            setTimeout(() => {
                if (transcriptBufferRef.current.length > 0) {
                    const buffered = transcriptBufferRef.current.join(' ');
                    const avgConf = confidenceBufferRef.current.length > 0
                        ? confidenceBufferRef.current.reduce((a, b) => a + b, 0) / confidenceBufferRef.current.length
                        : undefined;

                    transcriptBufferRef.current = [];
                    confidenceBufferRef.current = [];
                    processUserTurn(buffered, avgConf);
                }
            }, 2000);
        }
    }, [processUserTurn]);

    const handlePartialTranscript = useCallback((text: string) => {
        setInterimTranscript(text);
    }, []);

    const handleUserSpeechStart = useCallback(() => {
        if (bargeInBlockRef.current) return;
        if (conversationState === 'speaking') {
            console.log('[Conversation] Barge-in!');
            tts.stop();
            setConversationState('listening');
        }
    }, [conversationState, tts]);


    // ============================================
    // INIT STT
    // ============================================
    const stt = useSpeechRecognition({
        onPartial: handlePartialTranscript,
        onFinal: handleFinalTranscript,
        onSpeechStart: handleUserSpeechStart
    });

    // ============================================
    // SESSION CONTROLS
    // ============================================

    const startSession = useCallback(async () => {
        console.log('[Conversation] Starting...');

        // 1. Setup
        const storedName = typeof window !== 'undefined' ? localStorage.getItem('speakmate_userName') : null;
        setUserName(storedName);
        startTimeRef.current = Date.now();

        // 2. Start Ears
        await stt.start();

        // 3. Greeting (Dynamic)
        // We let the AI generate the greeting based on the first prompt, 
        // BUT for latency, we still use a canned first opener, then let AI take over.
        // Actually, to follow "New Plan", we should let AI generate it if possible, 
        // but for now, let's keep the fast start.

        let greeting = "Hi there! I'm SpeakMate. Good to see you.";

        // Sophisticated Check: Name + History
        const history = getHistory();
        const isReturningUser = storedName && history.length > 0;

        if (isReturningUser) {
            // True Returning User
            greeting = `Hey ${storedName.split(' ')[0]}! Good to see you again. How are you doing?`;
        } else if (storedName) {
            // Has Name, but New to Hangout (Fresh History)
            greeting = `Hi ${storedName.split(' ')[0]}! I'm SpeakMate. Nice to meet you. How are you doing?`;
        }

        // 4. Initial Speak
        bargeInBlockRef.current = true;
        setMessages([{ role: 'assistant', content: greeting, timestamp: Date.now() }]);

        await tts.speak(greeting, {
            onStart: () => {
                setConversationState('speaking');
                setTimeout(() => { bargeInBlockRef.current = false; }, 1000);
            },
            onEnd: () => {
                setConversationState('listening');
                startSilenceTimer();
            }
        });

    }, [stt, tts, startSilenceTimer]);

    const stopSession = useCallback(() => {
        console.log('[Conversation] Stopping...');
        stt.stop();
        tts.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setConversationState('idle');
    }, [stt, tts]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, []);

    return {
        state: conversationState,
        messages,
        interimTranscript,
        currentTurn: turnCountRef.current,
        isListening: stt.isListening,
        startSession,
        stopSession,
        error: stt.error || tts.error
    };
}
