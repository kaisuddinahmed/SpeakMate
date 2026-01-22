import { Part2Topic } from './part2';

export interface AtomicIntentData {
    intent: "SHARE_MILD_OPINION" | "ASK_FOLLOWUP_OPINION";
    examples: string[];
    avoid: string[];
}

export const PART3_PROMPTS: Record<Part2Topic, AtomicIntentData[]> = {
    daily_routine_detail: [
        {
            intent: "SHARE_MILD_OPINION",
            examples: ["I’ve always felt routines help keep life organized, but they can also feel repetitive.", "It seems like routines can either make life easier or more tiring."],
            avoid: ["Routines are beneficial for mental health.", "Do you agree that routines are important?"]
        },
        {
            intent: "ASK_FOLLOWUP_OPINION",
            examples: ["What do you think?", "How do you see it?", "Do you feel the same way?"],
            avoid: ["What is your opinion?", "To what extent do you agree?"]
        }
    ],
    work_day_detail: [
        {
            intent: "SHARE_MILD_OPINION",
            examples: ["I feel work takes up most of our day now.", "It sometimes feels like work and personal life are blending together."],
            avoid: ["Work-life balance is a critical issue.", "Discuss the impact of work on life."]
        },
        {
            intent: "ASK_FOLLOWUP_OPINION",
            examples: ["Do you think that's a good thing?", "What's your view on that?"],
            avoid: ["Do you agree?", "What are the pros and cons?"]
        }
    ],
    free_time_detail: [
        {
            intent: "SHARE_MILD_OPINION",
            examples: ["I think free time is becoming more important than before.", "People relax very differently now compared to the past."],
            avoid: ["Leisure time is essential for well-being.", "Compare past and present leisure activities."]
        },
        {
            intent: "ASK_FOLLOWUP_OPINION",
            examples: ["Do you feel the same?", "What do you think about that?"],
            avoid: ["What is your perspective?", "Express your opinion."]
        }
    ],
    place_description: [
        {
            intent: "SHARE_MILD_OPINION",
            examples: ["I feel where we live really affects our lifestyle.", "Some people love busy cities, others prefer quiet places."],
            avoid: ["Urbanization affects lifestyle choices.", "Contrast city and country living."]
        },
        {
            intent: "ASK_FOLLOWUP_OPINION",
            examples: ["Do you agree?", "What about you?"],
            avoid: ["Which do you prefer and why?"]
        }
    ],
    family_time_detail: [
        {
            intent: "SHARE_MILD_OPINION",
            examples: ["It feels like people spend less time with family these days.", "Family time seems harder to protect now."],
            avoid: ["Family cohesion is declining.", "Analyze the changes in family dynamics."]
        },
        {
            intent: "ASK_FOLLOWUP_OPINION",
            examples: ["Do you think that’s true?", "What’s your experience?"],
            avoid: ["Is this a positive or negative trend?"]
        }
    ]
};
