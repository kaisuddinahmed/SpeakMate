/**
 * Filler Audio Utility (V.2 Feature A: Latency Masking)
 * Plays "thinking" sounds while waiting for AI response
 */

// Pre-defined filler phrases (will be synthesized on first use)
const FILLER_PHRASES = [
    "Hmm...",
    "Let me think...",
    "Interesting...",
    "I see...",
    "Okay...",
];

// Audio context and state
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let fillerBuffers: AudioBuffer[] = [];
let isPlaying = false;

/**
 * Initialize audio context (call once on user interaction)
 */
export async function initFillerAudio(): Promise<void> {
    if (audioContext) return;

    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Pre-generate filler audio using TTS API
        for (const phrase of FILLER_PHRASES) {
            try {
                const response = await fetch("/api/hangout/speech", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: phrase }),
                });

                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    fillerBuffers.push(audioBuffer);
                }
            } catch (e) {
                console.warn(`[FillerAudio] Failed to pre-generate: ${phrase}`);
            }
        }

        console.log(`[FillerAudio] Initialized with ${fillerBuffers.length} filler sounds`);
    } catch (error) {
        console.error("[FillerAudio] Failed to initialize:", error);
    }
}

/**
 * Play a random filler sound
 */
export function playRandomFiller(): void {
    if (!audioContext || fillerBuffers.length === 0 || isPlaying) {
        return;
    }

    try {
        // Pick random filler
        const randomIndex = Math.floor(Math.random() * fillerBuffers.length);
        const buffer = fillerBuffers[randomIndex];

        // Create and play source
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);

        source.onended = () => {
            isPlaying = false;
            currentSource = null;
        };

        currentSource = source;
        isPlaying = true;
        source.start(0);

        console.log("[FillerAudio] Playing filler sound");
    } catch (error) {
        console.error("[FillerAudio] Playback failed:", error);
        isPlaying = false;
    }
}

/**
 * Stop currently playing filler sound
 */
export function stopFiller(): void {
    if (currentSource && isPlaying) {
        try {
            currentSource.stop();
            currentSource.disconnect();
        } catch (e) {
            // Already stopped
        }
        currentSource = null;
        isPlaying = false;
        console.log("[FillerAudio] Stopped filler sound");
    }
}

/**
 * Check if filler is currently playing
 */
export function isFillerPlaying(): boolean {
    return isPlaying;
}
