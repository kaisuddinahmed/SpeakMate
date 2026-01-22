export type GreetingContext = {
    userName: string;
    lastVisit: number | null; // Timestamp
    timeOfDay: 'morning' | 'afternoon' | 'evening';
};

const GREETING_TEMPLATES = {
    firstTime: [
        "Hi {{name}}. I'm SpeakMate. Nice to meet you.",
        "Hello {{name}}! I'm SpeakMate. Good to see you."
    ],
    returnShow: { // "Show" -> Just now (< 3 hours)
        morning: ["Welcome back {{name}}. Picking up where we left off?"],
        afternoon: ["Welcome back {{name}}. Good to see you again."],
        evening: ["Welcome back {{name}}. Ready to chat?"]
    },
    returnDay: { // "Day" -> Same day but later (> 3 hours)
        morning: ["Good morning {{name}}. How's your day starting?"],
        afternoon: ["Hey {{name}}. How's your day going?"],
        evening: ["Good evening {{name}}. How's your day been?"]
    },
    returnLong: { // "Long" -> > 24 hours
        morning: ["Hey {{name}}. Long time no see. How have you been?"],
        afternoon: ["Hey {{name}}. Nice to see you back. How's it going?"],
        evening: ["Hey {{name}}. Long time no see. How are things?"]
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
