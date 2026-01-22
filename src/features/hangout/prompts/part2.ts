import { Part1Domain } from './part1';

export type Part2Topic = "daily_routine_detail" | "work_day_detail" | "free_time_detail" | "place_description" | "family_time_detail";

export const PART2_TOPIC_MAPPING: Record<Part1Domain, Part2Topic> = {
    daily_routine: "daily_routine_detail", work_or_study: "work_day_detail", free_time: "free_time_detail", hometown: "place_description", living_place: "place_description", family: "family_time_detail", introduction: "daily_routine_detail", food: "free_time_detail", transport: "daily_routine_detail", technology: "work_day_detail"
};

export const PART2_PROMPTS: Record<Part2Topic, { main: string[], nudge: string[] }> = {
    daily_routine_detail: {
        main: ["I’m really curious how you usually spend a normal weekday from morning to night.", "How does your day typically go, from when you wake up until the end of the day?"],
        nudge: ["I feel like there’s a bit more there — what usually happens next?", "You mentioned earlier... what happens after that?"]
    },
    work_day_detail: {
        main: ["I’d love to understand what a typical workday looks like for you, start to finish.", "How does a normal working day usually go for you?"],
        nudge: ["That sounds busy. What happens in the rest of the day?", "Walk me through the afternoon part."]
    },
    free_time_detail: {
        main: ["When you actually get free time, how do you usually spend it?", "What does a relaxed day usually look like for you?"],
        nudge: ["Is there anything else you like to do?", "How do you usually end those days?"]
    },
    place_description: {
        main: ["What’s the place you live in like, if you were describing it to someone new?", "How would you describe your hometown to someone who’s never been there?"],
        nudge: ["What else is interesting there?", "Paint a picture for me about the surroundings."]
    },
    family_time_detail: {
        main: ["How do you usually spend time with your family?", "What’s family time normally like for you?"],
        nudge: ["Do you do anything else together?", "Tell me more about those times."]
    }
};

export const PART2_NUDGES = [
    "I feel like there’s a bit more there — what usually happens next?", "You mentioned one part, but I’m curious about the rest as well."
];
