/**
 * Personal Fact Extraction
 * Analyzes user messages to extract memorable personal information
 */

export interface ExtractedFact {
  fact: string;
  topic: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Extract personal facts from user message
 * Uses pattern matching to identify factual statements
 */
export function extractPersonalFacts(
  userMessage: string,
  currentTopic: string
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const lowerMessage = userMessage.toLowerCase();

  // Pattern 1: "I am/I'm [profession/status]"
  const professionPatterns = [
    /i(?:'m| am) (?:a |an )?([a-z\s]+(?:student|teacher|engineer|doctor|designer|developer|manager|analyst|consultant|chef|artist|writer|nurse|lawyer|accountant|architect))/i,
    /i work (?:as (?:a |an )?)?([a-z\s]+)/i,
    /i(?:'m| am) studying ([a-z\s]+)/i,
  ];

  for (const pattern of professionPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const fact = `Works/studies as ${match[1].trim()}`;
      facts.push({
        fact,
        topic: currentTopic === "work_study" ? "work_study" : currentTopic,
        confidence: "high",
      });
    }
  }

  // Pattern 2: "I have [family/pets]"
  const familyPatterns = [
    /i have (?:a |an |two |three )?([a-z\s]*(?:brother|sister|sibling|son|daughter|child|kid|dog|cat|pet)s?)/i,
    /my ([a-z\s]*(?:brother|sister|mom|dad|mother|father|son|daughter|dog|cat|pet)) (?:is|are) (?:named |called )?([a-z]+)/i,
  ];

  for (const pattern of familyPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      if (match[2]) {
        // Has name
        facts.push({
          fact: `Has a ${match[1]} named ${match[2]}`,
          topic: "personal",
          confidence: "high",
        });
      } else {
        facts.push({
          fact: `Has ${match[1]}`,
          topic: "personal",
          confidence: "high",
        });
      }
    }
  }

  // Pattern 3: "I live in/from [location]"
  const locationPatterns = [
    /i(?:'m| am) from ([a-z\s]+(?:city|town|village|country)?)/i,
    /i live in ([a-z\s]+)/i,
    /i(?:'m| am) (?:currently )?in ([a-z\s]+)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const location = match[1].trim();
      // Filter out common false positives
      if (
        !["bed", "school", "office", "home", "work", "class"].includes(
          location
        )
      ) {
        facts.push({
          fact: `From/lives in ${location}`,
          topic: "personal",
          confidence: "high",
        });
      }
    }
  }

  // Pattern 4: "I like/love/enjoy [activity/thing]"
  const preferencePatterns = [
    /i (?:really |absolutely )?(?:like|love|enjoy|adore) (?:to )?([a-z\s]+(?:ing)?)/i,
    /i(?:'m| am) (?:really )?into ([a-z\s]+)/i,
  ];

  for (const pattern of preferencePatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const preference = match[1].trim();
      // Only capture if it's specific enough (more than 2 words or contains specific keywords)
      const specificKeywords = [
        "play",
        "watch",
        "read",
        "cook",
        "travel",
        "run",
        "swim",
        "dance",
        "paint",
        "music",
        "movie",
        "book",
        "food",
        "sport",
      ];
      if (
        preference.split(" ").length > 2 ||
        specificKeywords.some((kw) => preference.includes(kw))
      ) {
        facts.push({
          fact: `Enjoys ${preference}`,
          topic: currentTopic || "hobbies",
          confidence: "medium",
        });
      }
    }
  }

  // Pattern 5: "I've been [doing something] for [duration]"
  const experiencePatterns = [
    /i(?:'ve| have) been ([a-z\s]+ing) for ([a-z0-9\s]+)/i,
    /i(?:'ve| have) been (?:a |an )?([a-z\s]+) for ([a-z0-9\s]+)/i,
  ];

  for (const pattern of experiencePatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      facts.push({
        fact: `Has been ${match[1].trim()} for ${match[2].trim()}`,
        topic: currentTopic,
        confidence: "medium",
      });
    }
  }

  // Pattern 6: Age/Education mentions
  if (lowerMessage.includes("years old") || lowerMessage.includes("year old")) {
    const ageMatch = userMessage.match(/(\d+) years? old/i);
    if (ageMatch) {
      facts.push({
        fact: `${ageMatch[1]} years old`,
        topic: "personal",
        confidence: "high",
      });
    }
  }

  if (
    lowerMessage.includes("university") ||
    lowerMessage.includes("college")
  ) {
    const uniMatch = userMessage.match(
      /(?:at|from|in) ([a-z\s]+(?:university|college))/i
    );
    if (uniMatch) {
      facts.push({
        fact: `Studies/studied at ${uniMatch[1].trim()}`,
        topic: "work_study",
        confidence: "high",
      });
    }
  }

  // Pattern 7: Hobbies and activities
  const hobbyKeywords = [
    "play",
    "practice",
    "train",
    "compete",
    "perform",
    "create",
    "build",
    "collect",
  ];
  for (const keyword of hobbyKeywords) {
    if (lowerMessage.includes(`i ${keyword}`)) {
      const hobbyMatch = userMessage.match(
        new RegExp(`i ${keyword} ([a-z\\s]+)`, "i")
      );
      if (hobbyMatch) {
        const activity = hobbyMatch[1].trim().split(/\s+/).slice(0, 4).join(" ");
        if (activity.length > 3) {
          facts.push({
            fact: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}s ${activity}`,
            topic: "hobbies",
            confidence: "medium",
          });
        }
      }
    }
  }

  // Remove duplicates and return high/medium confidence facts
  const uniqueFacts = facts.filter(
    (fact, index, self) =>
      index === self.findIndex((f) => f.fact === fact.fact) &&
      fact.confidence !== "low"
  );

  return uniqueFacts;
}

/**
 * Check if a fact is already stored (fuzzy matching)
 */
export function isFactAlreadyStored(
  newFact: string,
  existingFacts: string[]
): boolean {
  const normalizedNew = newFact.toLowerCase().trim();

  return existingFacts.some((existing) => {
    const normalizedExisting = existing.toLowerCase().trim();

    // Exact match
    if (normalizedNew === normalizedExisting) return true;

    // Check if one contains the other (for variations)
    if (
      normalizedNew.includes(normalizedExisting) ||
      normalizedExisting.includes(normalizedNew)
    ) {
      return true;
    }

    // Check for similar key phrases
    const newWords = normalizedNew.split(/\s+/);
    const existingWords = normalizedExisting.split(/\s+/);
    const commonWords = newWords.filter((word) =>
      existingWords.includes(word)
    );

    // If more than 50% of words are common, consider it duplicate
    return (
      commonWords.length >= 3 &&
      commonWords.length / Math.max(newWords.length, existingWords.length) > 0.5
    );
  });

  return false;
}

/**
 * Format a fact for natural use in conversation
 */
export function formatFactForConversation(fact: string): string {
  // Remove topic prefixes if present
  let formatted = fact
    .replace(/^(Works\/studies as|Has|From\/lives in|Enjoys|Plays|Studies\/studied at)\s+/i, "")
    .trim();

  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  return formatted;
}
