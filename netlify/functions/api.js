import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";
import mongoose from "mongoose";

// Setup config
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 1. Direct MongoDB Connection handling for Serverless environments
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected via Serverless pipeline ✅");
  } catch (err) {
    console.error("Database connection failure:", err);
  }
};

// 2. Re-create your structural Review Schema safely
const ReviewSchema = new mongoose.Schema({
  code: { type: String, required: true },
  review: { type: String, required: true },
  mode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 3. Your exact POST routing endpoint logic
app.post("/.netlify/functions/api/review", async (req, res) => {
  await connectDB();
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

// 4. Your exact GET history endpoint logic
app.get("/.netlify/functions/api/history", async (req, res) => {
  await connectDB();
  try {
    const databaseHistory = await Review.find().sort({ createdAt: -1 }).limit(15);
    res.json(databaseHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export the serverless wrapper
export const handler = serverless(app);