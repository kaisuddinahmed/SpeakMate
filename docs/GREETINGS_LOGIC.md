# GREETINGS_LOGIC.md  
**SpeakMate – Variable Greeting System (Non-Repetitive, Voice-First)**

---

## Purpose

This document defines the authoritative greeting logic for the SpeakMate Hangout feature.

The goal is to ensure that:
- greetings feel natural, not scripted
- greetings never feel repetitive (even at 20–24 logins/day)
- greetings never rush the user into conversation phases
- greetings never feel like a test, instruction, or system message

Greetings are treated as conversation entry, not as a feature.

---

## Core Principle

SpeakMate does not “greet”.  
It enters the conversation like a human would.

---

## Greeting Is a Phase (Mandatory)

Phase = GREETING

While in GREETING phase:
- No Part 1 domains
- No topic framing
- No Part 2 eligibility
- No timing-based advancement
- No domain counters

The GREETING phase exists only to:
- set emotional tone
- make the user comfortable
- transition smoothly into conversation

---

## Identity Handling

- User nickname is collected during signup
- SpeakMate must not ask for the user’s name
- SpeakMate may address the user by nickname selectively (not every time)

---

## Inputs Used by Greeting Logic

```
nickname: string
isFirstTimeUser: boolean
lastSessionState?: INCOMPLETE | COMPLETED
lastSeenMinutesAgo?: number
dailyLoginCount: number
lastGreetingStyle?: EntryStyle
```

---

## Entry Styles (Anti-Repetition Core)

```
EntryStyle =
  WARM_GREETING
  SEAMLESS_CONTINUATION
  CONTEXTUAL_OBSERVATION
  LIGHT_PERSONAL_SHARE
  CURIOUS_HOOK
  ULTRA_MINIMAL
```

---

## Entry Style Definitions

### WARM_GREETING
Use sparingly (1–2x/day max).  
Examples:
- “Hey Kais — nice to hear from you.”
- “Hi Kais. How are you feeling right now?”

---

### SEAMLESS_CONTINUATION
Default for frequent users.  
Examples:
- “Alright, picking up from before.”
- “So — we’re back.”

---

### CONTEXTUAL_OBSERVATION
Examples:
- “This part of the day always feels a bit strange.”
- “Feels like one of those in-between moments.”

---

### LIGHT_PERSONAL_SHARE
1 sentence max.  
Examples:
- “I usually need a mental reset around now.”
- “My energy tends to dip a bit at this time.”

---

### CURIOUS_HOOK
Question-first, no greeting.  
Examples:
- “How’s this part of your day been?”
- “Has your routine changed today?”

---

### ULTRA_MINIMAL
Examples:
- “Okay.”
- “Alright.”
- “So.”

---

## Entry Style Selection Rules

- Never use the same EntryStyle twice in a row
- Never use WARM_GREETING more than 2× per day
- dailyLoginCount > 6 → disable WARM_GREETING
- dailyLoginCount > 10 → prefer CURIOUS_HOOK or ULTRA_MINIMAL

---

## Time-Gap Based Style Eligibility

| Time Since Last Session | Allowed Entry Styles |
|------------------------|----------------------|
| First-time user | WARM_GREETING |
| > 7 days | WARM_GREETING |
| 2–6 days | WARM_GREETING, CONTEXTUAL_OBSERVATION |
| 12–48 hrs | CONTEXTUAL_OBSERVATION, LIGHT_PERSONAL_SHARE |
| 3–12 hrs | SEAMLESS_CONTINUATION, CURIOUS_HOOK |
| < 3 hrs | SEAMLESS_CONTINUATION, CURIOUS_HOOK, ULTRA_MINIMAL |

---

## Greeting Intents

Allowed intents during GREETING:
- ENTER_CONVERSATION
- CONFUSION_RECOVERY
- SILENCE_RECOVERY

---

## Confusion Handling

If user expresses confusion:
- respond with light clarification
- do not explain system or agenda

Example:
“Sorry — I just meant talking for a bit.”

---

## Silence Handling

- Silence < 2s → do nothing
- Silence ≥ 2s → gentle reassurance

Example:
“No rush — take your time.”

---

## Exit Conditions (GREETING → PART 1)

Exit GREETING when:
- user acknowledges greeting (e.g. “Hi”, “Yeah”, “Okay”)
- or user responds meaningfully

Then:
- transition silently to Part 1
- reset Part 1 counters

---

## Anti-Patterns (Never Allowed)

- Repeating the same greeting shape
- Always using the user’s name
- Always asking a question
- Explaining what will happen
- Mentioning IELTS, tests, or practice

---

## Ownership

- Logic → useConversationController.ts
- Language → promptEngine.ts
- Audio → useAudioTurnManager.ts

---

---

## Introduction Arc ("The Coffee Shop Flow")

For **First-Time Users Only**, the system enforces a strict 4-turn "getting to know you" arc before entering the standard topic loop.

**Goal**: Mimic meeting a new person in a casual setting.

| Turn | Intent | Script / Prompt Logic |
|------|--------|-----------------------|
| **1** | **Vibe Check** | "Hi [Name]. I'm SpeakMate. Nice to meet you. How's your day going?" |
| **2** | **Location** | User response -> "Nice. So where are you joining from today?" |
| **3** | **Occupation** | User response -> "Ah, [City]! Do you work there or are you studying?" |
| **4** | **Pivot** | User response -> Bridge -> **Transition to Hobbies** (Part 1 Topic). |

> **Note**: This overrides the standard "Topic Selection" logic for the first 4 turns of a new user's life cycle.

---

## Final Note

If greetings ever feel noticeable, the system has failed.
The best greeting is the one the user doesn’t think about.

---

## Randomized Variations (Anti-Repetition Layer)

To prevent robotic repetition (especially for frequent users), the system **MUST** randomise the exact phrasing within each time-gap category.

**Logic**:
- Determine the time gap (e.g., `< 3 hours`).
- Select the category (e.g., `JUST_NOW`).
- Randomly pull 1 string from a pool of 3-4 variations.

**Example Pools**:
*   **< 3 Hours**: "Picking up where we left off?", "Ready to keep going?", "Back so soon?"
*   **Next Day**: "How was your day?", "Ready to practice?", "How's everything going?"

This ensures that even if a user logs in 20 times a day, they won't hear the exact same phrase 20 times.
