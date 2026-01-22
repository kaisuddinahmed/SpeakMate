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
        morning: [
            "Hey {{name}}.",
            "Hi again {{name}}. What's on your mind now?",
            "Welcome back, {{name}}.",
            "Hey {{name}}, good to see you again."
        ],
        afternoon: [
            "Welcome back {{name}}. Good to see you again.",
            "Hey {{name}}.",
            "Hi again {{name}}. How's your afternoon going?"
        ],
        evening: [
            "Welcome back {{name}}. Ready to chat?",
            "Hey {{name}}.",
            "Hi again {{name}}. Good to have you back."
        ]
    },
    returnDay: { // "Day" -> Same day but later (> 3 hours)
        morning: [
            "Good morning {{name}}. How's your day starting?",
            "Hey {{name}}. How's your morning been?",
            "Welcome back {{name}}. Ready to start the day?"
        ],
        afternoon: [
            "Hey {{name}}. How's your day going?",
            "Hi {{name}}. How's your afternoon treating you?",
            "Welcome back {{name}}. How's your day been so far?"
        ],
        evening: [
            "Good evening {{name}}. How's your day been?",
            "Hey {{name}}. How was your day?",
            "Hi {{name}}. Relaxing evening?"
        ]
    },
    returnLong: { // "Long" -> > 24 hours
        morning: [
            "Hey {{name}}. Long time no see. How have you been?",
            "Welcome back {{name}}! It's been a while.",
            "Hey {{name}}. Good to see you again!"
        ],
        afternoon: [
            "Hey {{name}}. Nice to see you back. How's it going?",
            "Welcome back {{name}}! Long time no see.",
            "Hey {{name}}. Good to have you here again."
        ],
        evening: [
            "Hey {{name}}. Long time no see. How are things?",
            "Welcome back {{name}}! How've you been keeping?",
            "Hey {{name}}. Good to see you back."
        ]
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
