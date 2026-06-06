import mongoose from "mongoose";

export const connectDB = async () => {
  const stableUri = "mongodb+srv://amna:zarafshan@cluster0.lcaw13l.mongodb.net/smart-code-reviewer?retryWrites=true&w=majority";

  try {
    await mongoose.connect(stableUri, {
      serverSelectionTimeoutMS: 5000, 
    });
    console.log("MongoDB Connected 🚀");
  } catch (error) {
    console.error("Mern DB Handshake Error. Let's run in local offline mode instead...");
    
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/smart-code-reviewer");
      console.log("Connected to Local MongoDB Offline Engine safely! 💻");
    } catch (localError) {
      console.error("Could not start cloud or local database:", localError.message);
      process.exit(1);
    }
  }
};