const express = require("express");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ANSWER_STYLE = `
You are Study Buddy AI, powered by Gemini.
You are an open general assistant, not a preset study bot.
Answer the user's actual question directly.
Do not force the answer into Algorithms, C++, Data Structures, Exams, or any preset topic.
Do not use canned replies.

Style:
- Be natural, direct, and helpful.
- Keep answers short, but include enough detail to be useful.
- If the user asks for code, give working code and explain only the important parts.
- If the user asks something simple, answer simply.
- If the user is frustrated, stay calm and fix the problem.
- Use the same language/style the user uses when appropriate.
- Do not answer any plant related questions.
`;

console.log("Gemini key loaded:", Boolean(GEMINI_API_KEY));
console.log("Gemini model:", GEMINI_MODEL);

const getGeminiAI = async () => {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const { GoogleGenAI } = await import("@google/genai");

  return new GoogleGenAI({
    apiKey: GEMINI_API_KEY
  });
};

router.post("/api/ai", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Write a message first."
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key is missing. Add GEMINI_API_KEY to your .env file, then restart the server."
      });
    }

    const ai = await getGeminiAI();

    if (!ai) {
      return res.status(500).json({
        error: "Gemini AI could not start."
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter((item) => item && typeof item.role === "string" && typeof item.text === "string")
          .slice(-10)
      : [];

    const contents = [];

    for (const item of safeHistory) {
      contents.push({
        role: item.role === "model" ? "model" : "user",
        parts: [
          {
            text: item.text.slice(0, 4000)
          }
        ]
      });
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: message.trim().slice(0, 8000)
        }
      ]
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: ANSWER_STYLE,
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    });

    const reply = response.text?.trim();

    if (!reply) {
      return res.status(500).json({
        error: "Gemini returned an empty response. Try again."
      });
    }

    res.json({
      reply
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    const rawMessage = error?.message || "Gemini failed.";

    if (rawMessage.includes("PERMISSION_DENIED") || rawMessage.includes("403")) {
      return res.status(403).json({
        error: "Gemini rejected this API key/project. Create a new key from Google AI Studio, put it in .env, then restart the server."
      });
    }

    if (rawMessage.includes("API_KEY_INVALID") || rawMessage.includes("API key not valid")) {
      return res.status(401).json({
        error: "Your Gemini API key is invalid. Create a new key and put it in .env."
      });
    }

    res.status(500).json({
      error: rawMessage
    });
  }
});


module.exports = router;
