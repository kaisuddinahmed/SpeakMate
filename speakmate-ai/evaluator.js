import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Compact rubric (same as before)
const RUBRIC = `
You are SpeakMate-AI, an English speaking evaluator for exam preparation.

You MUST rate the candidate on these four criteria:
1) Fluency & Coherence
2) Vocabulary
3) Grammar
4) Pronunciation (approximate from text; assume neutral accent unless errors are obvious)

Scoring rules:
- Each criterion score must be between 0.0 and 9.0 in steps of 0.5 (e.g., 4.0, 4.5, 5.0, 5.5, ... 9.0).
- Overall score is the average of the four criteria, then rounded to nearest 0.5.

General band meaning (independent, original rubric):
- 9: Nearly native-like. Very smooth, precise, few minor slips.
- 8: Very strong. Occasional issues but communication always clear and detailed.
- 7: Strong intermediate/advanced. Can speak at length; some mistakes but message clear.
- 6: Solid intermediate. Can discuss many topics; noticeable mistakes but usually clear.
- 5: Lower intermediate. Can talk about familiar topics; frequent mistakes and hesitation.
- 4: Basic. Short, simple sentences; breaks in communication.
- 3: Very limited. Short phrases, frequent pauses, difficult to follow.
- 2: Minimal. Isolated words or memorised chunks.
- 1: Almost no usable language.
- 0: No answer.

Interpretation guidelines:
- Fluency & Coherence: speed, flow, pauses, ability to extend answers and connect ideas logically (even if grammar is wrong).
- Vocabulary: range, appropriacy, ability to avoid repeating very basic words.
- Grammar: control of sentence structure and verb tenses; how often errors confuse the meaning.
- Pronunciation: how easy it would be to understand the speaker in real life, assuming the transcript reflects what they said.

Output rules:
- Be STRICT but FAIR.
- Base your decision ONLY on the provided question and answer.
- Make it very clear that this is an unofficial estimate for practice only.

You MUST output ONLY valid JSON in this exact structure:
{
  "fluency": number,
  "vocabulary": number,
  "grammar": number,
  "pronunciation": number,
  "overall": number,
  "feedback": {
    "fluency": "short feedback (max 2 sentences)",
    "vocabulary": "short feedback (max 2 sentences)",
    "grammar": "short feedback (max 2 sentences)",
    "pronunciation": "short feedback (max 2 sentences)"
  },
  "note": "This score is an unofficial estimate for exam preparation only."
}
Do not add any extra text outside the JSON.
`;

// Main evaluator function: returns a JS object
export async function evaluateAnswer({ question, answer }) {
  const userContent = `
Question:
${question}

Candidate answer:
${answer}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RUBRIC },
      { role: "user", content: userContent }
    ]
  });

  const raw = completion.choices[0].message.content;

  // Try to parse JSON safely
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse evaluator JSON. Raw output:");
    console.error(raw);
    throw err;
  }

  return parsed;
}

// ============ QUANTITATIVE ANALYSIS HELPERS ============

/**
 * Analyze transcript metrics before AI evaluation
 * Provides objective, measurable data points
 */
function analyzeTranscriptMetrics(transcript) {
  // Extract only student messages
  const studentMessages = transcript
    .filter(msg => msg.speaker === 'user')
    .map(msg => msg.text)
    .join(' ');
  
  if (!studentMessages || studentMessages.trim().length === 0) {
    return {
      totalWords: 0,
      uniqueWords: 0,
      lexicalDiversity: 0,
      hesitationMarkers: 0,
      discourseMarkers: 0,
      sentenceCount: 0,
      avgSentenceLength: 0,
      repetitionCount: 0,
      complexSentences: 0,
      simpleConnectors: 0
    };
  }

  const words = studentMessages.match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const sentences = studentMessages.match(/[.!?]+/g) || ['.'];
  
  return {
    totalWords: words.length,
    uniqueWords: uniqueWords.size,
    lexicalDiversity: words.length > 0 ? uniqueWords.size / words.length : 0,
    hesitationMarkers: countHesitationMarkers(studentMessages),
    discourseMarkers: countDiscourseMarkers(studentMessages),
    sentenceCount: sentences.length,
    avgSentenceLength: words.length / sentences.length,
    repetitionCount: detectRepetitions(studentMessages),
    complexSentences: countComplexSentences(studentMessages),
    simpleConnectors: countSimpleConnectors(studentMessages)
  };
}

function countHesitationMarkers(text) {
  const markers = ['um', 'uh', 'er', 'ah', 'hmm', 'well', 'like you know', 'i mean'];
  let count = 0;
  const lowerText = text.toLowerCase();
  markers.forEach(marker => {
    const regex = new RegExp(`\\b${marker}\\b`, 'g');
    const matches = lowerText.match(regex);
    count += matches ? matches.length : 0;
  });
  return count;
}

function countDiscourseMarkers(text) {
  const markers = [
    'firstly', 'secondly', 'thirdly', 'finally', 
    'moreover', 'furthermore', 'however', 'therefore', 
    'in addition', 'for example', 'for instance',
    'in conclusion', 'to sum up', 'on the other hand', 
    'nevertheless', 'consequently', 'meanwhile'
  ];
  let count = 0;
  markers.forEach(marker => {
    if (new RegExp(`\\b${marker}\\b`, 'i').test(text)) {
      count++;
    }
  });
  return count;
}

function detectRepetitions(text) {
  const words = text.toLowerCase().split(/\s+/);
  let repetitionCount = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && words[i].length > 3) {
      repetitionCount++;
    }
  }
  return repetitionCount;
}

function countComplexSentences(text) {
  const complexIndicators = [
    /\b(because|although|while|when|if|unless|since|though|whereas)\b/gi,
    /\b(who|which|that|whose|where)\b.*\b(is|are|was|were|have|has)\b/gi
  ];
  let count = 0;
  complexIndicators.forEach(pattern => {
    const matches = text.match(pattern);
    count += matches ? matches.length : 0;
  });
  return count;
}

function countSimpleConnectors(text) {
  const connectors = ['and', 'but', 'or', 'so'];
  let count = 0;
  connectors.forEach(conn => {
    const matches = text.match(new RegExp(`\\b${conn}\\b`, 'gi'));
    count += matches ? matches.length : 0;
  });
  return count;
}

/**
 * Generate improvement suggestions based on metrics and scores
 */
function generateImprovementSuggestions(scores, metrics) {
  const suggestions = [];
  
  // Fluency-based suggestions
  if (scores.fluency < 6) {
    if (metrics.hesitationMarkers > metrics.totalWords * 0.05) {
      const rate = ((metrics.hesitationMarkers / metrics.totalWords) * 100).toFixed(1);
      suggestions.push(`Reduce hesitation markers (um, uh, er) - you used ${metrics.hesitationMarkers} in ${metrics.totalWords} words (${rate}%)`);
    }
    if (metrics.avgSentenceLength < 8) {
      suggestions.push(`Try to extend your sentences - your average was ${metrics.avgSentenceLength.toFixed(1)} words per sentence`);
    }
    if (metrics.repetitionCount > 3) {
      suggestions.push(`Avoid repeating words - detected ${metrics.repetitionCount} repetitions`);
    }
  }
  
  // Vocabulary-based suggestions
  if (scores.vocabulary < 6) {
    if (metrics.lexicalDiversity < 0.5) {
      const percentage = (metrics.lexicalDiversity * 100).toFixed(1);
      suggestions.push(`Expand vocabulary variety - only ${percentage}% of your words were unique (${metrics.uniqueWords} unique out of ${metrics.totalWords})`);
    }
  }
  
  // Grammar/coherence suggestions
  if (scores.grammar < 6 || scores.fluency < 6) {
    if (metrics.discourseMarkers === 0) {
      suggestions.push(`Use linking words like 'however', 'moreover', 'therefore' to connect your ideas more clearly`);
    }
    if (metrics.complexSentences < 2 && metrics.totalWords > 50) {
      suggestions.push(`Try using more complex sentences with 'because', 'although', 'while' to show range`);
    }
  }
  
  return suggestions;
}

// New function for evaluating full conversations (Hangout sessions)
export async function evaluateConversation({ transcript }) {
  // First, analyze quantitative metrics
  const metrics = analyzeTranscriptMetrics(transcript);
  
  // Build conversation text from transcript
  const conversationText = transcript
    .map((msg) => `${msg.speaker === 'user' ? 'Student' : 'AI Coach'}: ${msg.text}`)
    .join('\n');

  const conversationRubric = `
You are SpeakMate-AI, an expert English speaking evaluator. Evaluate the following conversation session.

IMPORTANT: You are evaluating ONLY the STUDENT's performance, NOT the AI Coach's questions or prompts.

Objective Metrics Detected from Student's Speech:
- Total words spoken: ${metrics.totalWords}
- Unique vocabulary: ${metrics.uniqueWords} words (diversity: ${(metrics.lexicalDiversity * 100).toFixed(1)}%)
- Hesitation markers (um, uh, er): ${metrics.hesitationMarkers} occurrences
- Discourse markers (however, moreover, etc.): ${metrics.discourseMarkers} used
- Sentence count: ${metrics.sentenceCount}
- Average sentence length: ${metrics.avgSentenceLength.toFixed(1)} words
- Word repetitions: ${metrics.repetitionCount}
- Complex sentence structures: ${metrics.complexSentences}

Use these metrics to inform your evaluation, but also consider context and natural language aspects that metrics cannot capture.

Context Awareness:
- The AI Coach's questions provide context for understanding the student's responses
- Consider question complexity when judging answer appropriacy
- A simple question deserves a developed answer; a complex question may get simpler responses
- Focus entirely on how well the STUDENT communicates, not the AI Coach

Rate the STUDENT ONLY on these criteria (0-9 scale, 0.5 increments):
1) Fluency - Student's speech flow, pauses, ability to connect ideas
2) Vocabulary - Student's word choice, range, and appropriacy  
3) Grammar - Student's sentence structures, tense control, accuracy
4) Pronunciation - Infer from Student's text quality, assumed clarity

Scoring rules:
- Each criterion: 0.0 to 9.0 in steps of 0.5
- Overall: average of four criteria, rounded to nearest 0.5
- IGNORE the AI Coach's language quality - rate ONLY the Student
- Use the metrics provided but don't be purely mechanical - consider natural language quality

Band descriptors (for STUDENT performance):
- 9: Native-like fluency, precise vocabulary, nearly perfect grammar
- 8: Very strong control, occasional minor slips, clear communication
- 7: Strong intermediate/advanced, can speak at length, message always clear despite some errors
- 6: Solid intermediate, discusses various topics, noticeable mistakes but communication usually clear
- 5: Lower intermediate, handles familiar topics, frequent mistakes and hesitation
- 4: Basic level, short simple sentences, communication breaks occur
- 3: Very limited, short phrases, frequent pauses, difficult to follow
- 2: Minimal ability, isolated words or memorized chunks only
- 1: Almost no usable language
- 0: No response or completely unintelligible

Evaluation Guidelines:
- Fluency: Look at Student's ability to speak smoothly, extend answers, connect ideas logically
  * Hesitation rate: Less than 3% is excellent, 3-5% is acceptable, over 5% shows struggle
  * Does the student hesitate frequently or speak with natural flow?
  * Can they elaborate on topics or just give minimal answers?
  * Do they use linking words (however, because, although, etc.)?
  
- Vocabulary: Assess Student's word choice and range
  * Lexical diversity over 60% is strong, 40-60% is moderate, below 40% needs improvement
  * Do they repeat basic words or use varied vocabulary?
  * Are words used appropriately and precisely?
  * Do they attempt less common words or idiomatic expressions?
  * Consider the question complexity: sophisticated question = expect richer vocabulary
  
- Grammar: Evaluate Student's grammatical control
  * Range of structures (simple, compound, complex sentences)?
  * Tense and aspect control (past, present, future, perfect forms)?
  * How often do errors impede understanding?
  * Are errors systematic or just slips?
  * Complex sentences show range and confidence
  
- Pronunciation: Infer from text transcript
  * Assume if transcript is clear, pronunciation was understandable
  * Look for indicators like "uh", "um", repetitions suggesting unclear speech
  * Consider if ideas are expressed clearly enough to be transcribed accurately

Provide feedback in this EXACT JSON structure:
{
  "overallProficiency": <number>,
  "fluency": <number>,
  "vocabulary": <number>,
  "grammar": <number>,
  "pronunciation": <number>,
  "briefFeedback": "<1-2 encouraging sentences acknowledging Student's strengths and suggesting growth areas>",
  "detailedFeedback": {
    "whatYouDidWell": [
      "<specific positive point based on Student's actual performance and metrics>",
      "<specific positive point based on Student's actual performance and metrics>",
      "<specific positive point based on Student's actual performance and metrics>"
    ],
    "whatToImproveNext": [
      "<practical, achievable action for the Student with specific reference to their metrics>",
      "<practical, achievable action for the Student with specific reference to their metrics>",
      "<practical, achievable action for the Student with specific reference to their metrics>"
    ],
    "recommendedPractice": "<one clear directive for Student's next session>"
  },
  "metrics": {
    "totalWords": ${metrics.totalWords},
    "vocabularyDiversity": ${(metrics.lexicalDiversity * 100).toFixed(1)},
    "hesitationRate": ${metrics.totalWords > 0 ? ((metrics.hesitationMarkers / metrics.totalWords) * 100).toFixed(1) : 0},
    "discourseMarkersUsed": ${metrics.discourseMarkers},
    "avgSentenceLength": ${metrics.avgSentenceLength.toFixed(1)},
    "complexSentences": ${metrics.complexSentences}
  }
}

Brief Feedback: Be specific to the Student's performance, encouraging, reference actual strengths and metrics where relevant.
Example: "You spoke ${metrics.totalWords} words with good clarity. Your vocabulary diversity of ${(metrics.lexicalDiversity * 100).toFixed(1)}% shows decent range, but reducing hesitation markers could improve fluency."

What You Did Well: Base on Student's actual scores, responses, and metrics.
Examples based on metrics:
- If vocabularyDiversity > 60%: "You used a wide variety of vocabulary with ${metrics.uniqueWords} unique words"
- If discourseMarkers > 3: "You effectively used ${metrics.discourseMarkers} discourse markers to connect your ideas"
- If avgSentenceLength > 12: "Your sentences averaged ${metrics.avgSentenceLength.toFixed(1)} words, showing good development"

What to Improve: Small, doable actions specific to what the Student showed in this conversation.
Examples based on metrics:
- If hesitationRate > 5%: "Reduce hesitation markers - you used ${metrics.hesitationMarkers} 'um/uh' in ${metrics.totalWords} words"
- If vocabularyDiversity < 50%: "Expand your vocabulary - only ${(metrics.lexicalDiversity * 100).toFixed(1)}% of words were unique"
- If complexSentences < 2: "Practice using complex sentences with 'because', 'although', 'while'"

Recommended Practice: One specific, actionable goal for the Student's next hangout session based on their weakest area.

Return ONLY the JSON object.`;

  const userContent = `
Conversation transcript:
${conversationText}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: conversationRubric },
      { role: "user", content: userContent }
    ],
    temperature: 0.3,
    max_tokens: 800
  });

  const raw = completion.choices[0].message.content;

  // Parse JSON safely
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse conversation evaluation JSON. Raw output:");
    console.error(raw);
    throw err;
  }

  // Ensure scores are rounded to 0.5
  const roundToHalf = (num) => Math.round(num * 2) / 2;
  
  // Generate additional improvement suggestions based on metrics
  const improvementSuggestions = generateImprovementSuggestions({
    fluency: parsed.fluency,
    vocabulary: parsed.vocabulary,
    grammar: parsed.grammar,
    pronunciation: parsed.pronunciation
  }, metrics);
  
  return {
    overallProficiency: roundToHalf(parsed.overallProficiency || 0),
    fluency: roundToHalf(parsed.fluency || 0),
    vocabulary: roundToHalf(parsed.vocabulary || 0),
    grammar: roundToHalf(parsed.grammar || 0),
    pronunciation: roundToHalf(parsed.pronunciation || 0),
    briefFeedback: parsed.briefFeedback || "",
    detailedFeedback: parsed.detailedFeedback || {
      whatYouDidWell: [],
      whatToImproveNext: [],
      recommendedPractice: ""
    },
    metrics: parsed.metrics || {
      totalWords: metrics.totalWords,
      vocabularyDiversity: parseFloat((metrics.lexicalDiversity * 100).toFixed(1)),
      hesitationRate: metrics.totalWords > 0 ? parseFloat(((metrics.hesitationMarkers / metrics.totalWords) * 100).toFixed(1)) : 0,
      discourseMarkersUsed: metrics.discourseMarkers,
      avgSentenceLength: parseFloat(metrics.avgSentenceLength.toFixed(1)),
      complexSentences: metrics.complexSentences
    },
    improvementSuggestions: improvementSuggestions
  };
}

// Small test runner so you can try it from terminal
async function test() {
  const question = "Describe your favorite holiday.";
  const answer =
    "My favorite holiday is Eid because my whole family meets together. We cook special food, visit relatives, and talk until late at night. I feel very happy and relaxed on that day.";

  const result = await evaluateAnswer({ question, answer });

  console.log("Scores:");
  console.log("  Fluency      :", result.fluency);
  console.log("  Vocabulary   :", result.vocabulary);
  console.log("  Grammar      :", result.grammar);
  console.log("  Pronunciation:", result.pronunciation);
  console.log("  Overall      :", result.overall);
  console.log("\nFeedback:");
  console.log("  Fluency      :", result.feedback.fluency);
  console.log("  Vocabulary   :", result.feedback.vocabulary);
  console.log("  Grammar      :", result.feedback.grammar);
  console.log("  Pronunciation:", result.feedback.pronunciation);
  console.log("\nNote:", result.note);
}

if (import.meta.main) {
  test();
}
