export type TopicID =
    | 'personal' | 'work_study' | 'daily_life' | 'hobbies' | 'social_life'
    | 'food_drink' | 'places_travel' | 'technology' | 'experiences' | 'nature'
    | 'abstract' | 'festivals';

export type ConversationPhase =
    | 'GREETING'       // Hello, how are you?
    | 'WARMUP'         // Easy opening question
    | 'DEEP_DIVE'      // Follow-up, "Tell me more"
    | 'CHALLENGE'      // "What do you think about...?" (Abstract)
    | 'WRAP_UP';       // "Nice talking, see you!"

export type Intent =
    | 'ACKNOWLEDGE_AND_ASK' // Standard: "Cool! What...?"
    | 'CLARIFY'             // "Did you mean...?"
    | 'PIVOT'               // "Speaking of X, what about Y?"
    | 'ANSWER_USER'         // User asked something
    | 'REDIRECT';           // User is off-topic

export interface ConversationState {
    topic: TopicID;
    phase: ConversationPhase;
    turnsInPhase: number;
    lastUserText: string;
    historySummary: string; // Brief summary for context window
}

export const TOPICS: Record<TopicID, string> = {
    personal: "Home, Family, and Background",
    work_study: "Job, Studies, and Career",
    daily_life: "Daily Routine and Habits",
    hobbies: "Interests, Sports, and Leisure",
    social_life: "Friends and Social Activities",
    food_drink: "Food, Cooking, and Restaurants",
    places_travel: "Travel, Cities, and Transport",
    technology: "Computers, Phones, and Internet",
    experiences: "Past Events and Memories",
    nature: "Weather, Environment, and Animals",
    abstract: "Dreams, Art, and Ideas",
    festivals: "Holidays, Celebrations, and Culture"
};
