import express from "express";
import cors from "cors";
import { evaluateAnswer } from "./evaluator.js";

const app = express();
const PORT = 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Simple health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "speakmate-ai" });
});

// Evaluation endpoint
app.post("/api/evaluate", async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        error: "Both 'question' and 'answer' are required."
      });
    }

    const result = await evaluateAnswer({ question, answer });
    return res.json(result);
  } catch (err) {
    console.error("Error in /api/evaluate:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`SpeakMate-AI API running on http://localhost:${PORT}`);
});
