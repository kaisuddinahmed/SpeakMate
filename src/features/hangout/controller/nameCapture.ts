export type GreetingContext = {
    userName: string;
    lastVisit: number | null; // Timestamp
    timeOfDay: 'morning' | 'afternoon' | 'evening';
};

const GREETING_TEMPLATES = {
    firstTime: [
        "Hi {{name}}. I'm SpeakMate. Ready to start?",
        "Hello {{name}}! I'm SpeakMate. Excited to chat with you today."
    ],
    returnShow: { // "Show" -> Just now (< 3 hours)
        morning: ["Welcome back {{name}}! Ready to keep going?"],
        afternoon: ["Welcome back {{name}}! Hope your afternoon is going well."],
        evening: ["Welcome back {{name}}! Good to see you again."]
    },
    returnDay: { // "Day" -> Same day but later (> 3 hours)
        morning: ["Good morning {{name}}! Ready for a fresh session?"],
        afternoon: ["Good afternoon {{name}}! Great to see you back."],
        evening: ["Good evening {{name}}! Perfect time for a chat."]
    },
    returnLong: { // "Long" -> > 24 hours
        morning: ["Long time no see, {{name}}! Good morning."],
        afternoon: ["Long time no see, {{name}}! Hope you've been well."],
        evening: ["Long time no see, {{name}}! Ready to jump back in?"]
    }
};

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
}

export function generateSessionGreeting(context: GreetingContext): string {
    const { userName, lastVisit, timeOfDay } = context;
    const now = Date.now();
    let templates: string[] = [];

    // 1. Determine User State
    if (!lastVisit) {
        templates = GREETING_TEMPLATES.firstTime;
    } else {
        const diffHours = (now - lastVisit) / (1000 * 60 * 60);

        if (diffHours < 3) {
            // Just now
            templates = GREETING_TEMPLATES.returnShow[timeOfDay];
        } else if (diffHours < 24) {
            // Same day, later
            templates = GREETING_TEMPLATES.returnDay[timeOfDay];
        } else {
            // Long time
            templates = GREETING_TEMPLATES.returnLong[timeOfDay];
        }
    }

    // 2. Select Template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // 3. Hydrate
    return template.replace('{{name}}', userName || "Friend");
}
