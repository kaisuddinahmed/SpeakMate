import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { evaluateAnswer } from "./evaluator.js";

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log("=== SpeakMate-AI CLI Evaluator ===");
    console.log("Type your question and answer. Press Enter after each.\n");

    const question = await rl.question("Question: ");
    const answer = await rl.question("Your answer: ");

    console.log("\nEvaluating... please wait...\n");

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
    console.log("\n=== Done ===");
  } catch (err) {
    console.error("Error during evaluation:", err);
  } finally {
    rl.close();
  }
}

main();
