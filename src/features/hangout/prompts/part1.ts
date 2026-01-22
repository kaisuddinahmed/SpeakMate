export type Part1Domain = "introduction" | "work_or_study" | "hometown" | "living_place" | "family" | "daily_routine" | "free_time" | "food" | "transport" | "technology";

export const PART1_DOMAINS: Part1Domain[] = [
    "introduction", "work_or_study", "hometown", "living_place", "family", "daily_routine", "free_time", "food", "transport", "technology"
];

export interface Part1Question {
    id: string;
    domain: Part1Domain;
    intent: "ASK_PART1_BASIC" | "ASK_PART1_HABIT" | "ASK_PART1_PREFERENCE";
    examples: string[];
    avoid: string[];
}

export const PART1_QUESTIONS: Part1Question[] = [
    {
        id: "intro_name", domain: "introduction", intent: "ASK_PART1_BASIC",
        examples: ["So, what should I call you?", "What name do you usually go by?"],
        avoid: ["What is your full name?", "Please state your name for the record."]
    },
    {
        id: "work_status", domain: "work_or_study", intent: "ASK_PART1_BASIC",
        examples: ["What do you usually do during the day?", "Are you working right now, or studying?"],
        avoid: ["Do you work or are you a student?", "What is your current occupation?"]
    },
    {
        id: "work_feeling", domain: "work_or_study", intent: "ASK_PART1_PREFERENCE",
        examples: ["How do you feel about the work you’re doing?", "Is it something you enjoy most days?"],
        avoid: ["Do you like your job?", "What are the advantages of your job?"]
    },
    {
        id: "hometown_origin", domain: "hometown", intent: "ASK_PART1_BASIC",
        examples: ["Where are you originally from?", "Is that the place you grew up?"],
        avoid: ["Describe your hometown.", "Where is your hometown located?"]
    },
    {
        id: "living_now", domain: "living_place", intent: "ASK_PART1_HABIT",
        examples: ["Do you live in a busy area, or somewhere quieter?", "What’s the area around your home like?"],
        avoid: ["Describe your accommodation.", "What kind of housing do you live in?"]
    },
    {
        id: "family_people", domain: "family", intent: "ASK_PART1_BASIC",
        examples: ["Do you live with your family?", "Who do you usually spend time with at home?"],
        avoid: ["Describe your family structure.", "How many people are in your immediate family?"]
    },
    {
        id: "weekday_routine", domain: "daily_routine", intent: "ASK_PART1_HABIT",
        examples: ["How do your weekdays usually start?", "Do your weekdays follow a routine, or change a lot?"],
        avoid: ["Describe your daily routine.", "What do you do every morning?"]
    },
    {
        id: "free_time_activity", domain: "free_time", intent: "ASK_PART1_PREFERENCE",
        examples: ["What do you usually do when you have free time?", "How do you like to relax after a long day?"],
        avoid: ["What are your hobbies?", "How do you spend your leisure time?"]
    }
];

export function getPart1Question(domain: Part1Domain, usedIds: Set<string>): Part1Question | undefined {
    return PART1_QUESTIONS.find(q => q.domain === domain && !usedIds.has(q.id));
}
