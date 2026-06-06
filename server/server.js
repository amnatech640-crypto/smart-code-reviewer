import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Groq } from "groq-sdk";
import { connectDB } from "./db.js";
import Review from "./models/Review.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "./.env") });

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post("/api/review", async (req, res) => {
  const { code, mode } = req.body;

  const systemPrompt = mode === "summary" 
    ? "You are an elite, highly concise code reviewer. Identify critical issues in under 4 bullet points. Provide an updated bug-free version inside standard markdown blocks."
    : "You are a professional software security auditor. Conduct a deep logic evaluation. Use structured markdown headers: 'Code Analysis', 'Problems Found', and 'Improved Code'. Highlight bugs clearly.";

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: code }
      ],
      model: "llama-3.3-70b-versatile",
    });

    const aiResponse = chatCompletion.choices[0].message.content;

  const savedRecord = new Review({
      code,
      review: aiResponse,
      mode
    });
    await savedRecord.save();

    res.json({ review: aiResponse });
  } catch (error) {
    console.error("Groq/DB Core Error:", error);
    res.status(500).json({ error: "Review processing pipelines failed." });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const databaseHistory = await Review.find().sort({ createdAt: -1 }).limit(15);
    res.json(databaseHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server blasting off on port ${PORT} 🚀`));