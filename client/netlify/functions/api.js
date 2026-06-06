import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";
import mongoose from "mongoose";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Main serverless connection routine with forced timeouts to prevent 502 loop hangs
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000 // Fails fast instead of hanging if MongoDB is unreachable
    });
    console.log("Database connected smoothly via serverless pipeline ✅");
  } catch (err) {
    console.error("Database connection failure:", err);
    throw err;
  }
};

// Re-creates your structural Review Schema safely inside the serverless layer
const ReviewSchema = new mongoose.Schema({
  code: { type: String, required: true },
  review: { type: String, required: true },
  mode: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);

// Initializing groq client safely on runtime declaration
const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST route handler
app.post("/.netlify/functions/api/review", async (req, res) => {
  try {
    await connectDB();
    const { code, mode } = req.body;

    const systemPrompt = mode === "summary" 
      ? "You are an elite, highly concise code reviewer. Identify critical issues in under 4 bullet points. Provide an updated bug-free version inside standard markdown blocks."
      : "You are a professional software security auditor. Conduct a deep logic evaluation. Use structured markdown headers: 'Code Analysis', 'Problems Found', and 'Improved Code'. Highlight bugs clearly.";

    const groq = getGroqClient();
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: code }
      ],
      model: "llama-3.3-70b-versatile",
    });

    const aiResponse = chatCompletion.choices[0].message.content;

    const savedRecord = new Review({ code, review: aiResponse, mode });
    await savedRecord.save();

    res.json({ review: aiResponse });
  } catch (error) {
    console.error("Core Engine Error:", error);
    res.status(500).json({ error: "Review processing pipelines failed.", details: error.message });
  }
});

// GET history route handler
app.get("/.netlify/functions/api/history", async (req, res) => {
  try {
    await connectDB();
    const databaseHistory = await Review.find().sort({ createdAt: -1 }).limit(15);
    res.json(databaseHistory);
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const handler = serverless(app);