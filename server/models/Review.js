import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },

    review: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Review", reviewSchema);