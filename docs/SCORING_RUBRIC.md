# IELTS Speaking Scoring Reference

> **Purpose**: Official scoring rubric used by SpeakMate's evaluator engine.
> **Last Updated**: January 2026

---

## Overall Level Descriptors

| Band | Description |
|------|-------------|
| **9** | Outstanding across all criteria. One minor weakness possible, but none below 8. |
| **8.5** | Very strong, approaching Level 9. Most criteria at 8+; one may be at 7.5. |
| **8** | High, consistent performance. Majority at 8; occasional 7.5 or 7 allowed. |
| **7.5** | Clear upper-intermediate/advanced. Most between 7-8; none below 6.5. |
| **7** | Strong intermediate control. Several at 7; acceptable variation 6.5-7.5. |
| **6.5** | Above intermediate. Strengths at 7 balanced by 6; nothing below 5.5. |
| **6** | Solid intermediate. Some strengths at 6.5-7, weaknesses near 5.5. |
| **5.5** | Lower-intermediate nearing consistency. Most around 5.5-6; none below 4.5. |
| **5** | Clear lower-intermediate. Mostly 5; occasional dip to 4.5 acceptable. |
| **4.5** | Basic user with partial ability. Scores around 4.5-5, occasional 4. |
| **4** | Basic performance. Frequent limitations. Most around 4; nothing above 5. |
| **3.5** | Partial control at basic level. Scores typically 3-4. |
| **3** | Limited ability. Most at 3; occasional rise to 3.5 or fall to 2.5. |
| **2** | Very limited ability. Scores generally at or near 2. |
| **1** | No functional communication; only isolated words or sounds. |
| **0** | No intelligible attempt or no response. |

---

## 4 Evaluation Criteria

### 1. Fluency & Coherence

| Band | Description |
|------|-------------|
| 9 | Smooth, natural flow; fully coherent; pauses only for complex idea planning. |
| 8 | Smooth and well-paced; occasional hesitation but ideas well-organized. |
| 7 | Speaks at length; some pauses, but ideas generally clear and connected. |
| 6 | Speaks at length but rhythm varies; linkers inconsistent; some loss of flow. |
| 5 | Continues speaking but uses repetition or slow pacing; coherence uneven. |
| 4 | Frequent breaks, short turns, basic linking; coherence weak. |
| 3 | Long pauses; difficulty producing more than simple statements. |
| 2 | Mostly isolated words or fragments. |
| 1 | Barely any intelligible words. |

### 2. Vocabulary (Lexical Resource)

| Band | Description |
|------|-------------|
| 9 | Very wide, precise word choice; conveys subtle meaning. |
| 8 | Broad, flexible vocabulary; minor errors. |
| 7 | Good everyday vocabulary; occasional errors but meaning clear. |
| 6 | Enough vocabulary for familiar & abstract topics; simplification noticeable. |
| 5 | Discusses familiar topics but relies on general words; rephrasing may fail. |
| 4 | Limited range; frequent word-choice errors. |
| 3 | Very restricted vocabulary for basic personal info only. |
| 2 | Tiny set of basic words or memorized phrases. |
| 1 | One-word attempts only. |

### 3. Grammar (Range & Accuracy)

| Band | Description |
|------|-------------|
| 9 | Complex structures with natural control; rare slips. |
| 8 | Frequent accurate complex forms; few errors. |
| 7 | Mix of simple/complex structures; errors present but meaning clear. |
| 6 | Simple structures controlled; complex forms attempted with noticeable errors. |
| 5 | Simple sentences mostly accurate; complex ones often inaccurate. |
| 4 | Mostly simple and repetitive; many errors beyond basics. |
| 3 | Frequent errors even in simple structures. |
| 2 | Almost no sentence structure; mostly fragments. |
| 1 | No systematic grammar. |

### 4. Pronunciation

| Band | Description |
|------|-------------|
| 9 | Clear, natural, highly intelligible; excellent stress/intonation control. |
| 8 | Highly intelligible; strong control of rhythm and stress. |
| 7 | Mostly clear; some problematic sounds but rarely impede understanding. |
| 6 | Understandable with little effort; some sound or stress problems. |
| 5 | Understandable but with frequent sound/stress errors. |
| 4 | Pronunciation issues cause loss of clarity at times. |
| 3 | Many words hard to recognize; communication difficult. |
| 2 | Mostly unintelligible sounds. |
| 1 | Speech largely unintelligible. |

---

## Overall Band Calculation

### Step 1: Calculate Mean
```
overall_raw = (fluency + vocabulary + grammar + pronunciation) / 4
```

### Step 2: Round to Nearest 0.5

| Decimal Part | Rounds To |
|--------------|-----------|
| 0.00 – 0.24 | Down (e.g., 6.2 → 6.0) |
| 0.25 – 0.74 | .5 (e.g., 6.5 → 6.5) |
| 0.75 – 0.99 | Up (e.g., 6.8 → 7.0) |

### Step 3: Consistency Check
If any single score is **more than 1 level below** the rounded mean, reduce overall by 0.5.

---

## Examples

### Example 1
| Criterion | Score |
|-----------|-------|
| Fluency | 7.0 |
| Vocabulary | 6.5 |
| Grammar | 6.0 |
| Pronunciation | 7.0 |

**Calculation**: (7 + 6.5 + 6 + 7) / 4 = 6.625 → **6.5**
**Consistency**: All within 1 level → No penalty.
**Final**: **6.5**

### Example 2
| Criterion | Score |
|-----------|-------|
| Fluency | 5.0 |
| Vocabulary | 7.0 |
| Grammar | 5.0 |
| Pronunciation | 4.5 |

**Calculation**: (5 + 7 + 5 + 4.5) / 4 = 5.375 → **5.5**
**Consistency**: Pronunciation (4.5) is >1 level below 5.5 → Reduce by 0.5.
**Final**: **5.0**
