import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function run() {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are SpeakMate-AI test assistant." },
        { role: "user", content: "Hello, this is a test. Say 'integration successful'." }
      ]
    });

    console.log("AI Response:", completion.choices[0].message.content);
  } catch (error) {
    console.error("ERROR:", error);
  }
}

run();
