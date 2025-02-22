import mongoose from "mongoose";
const { Schema, model, models, Types } = mongoose;

const schema = new Schema(
  {
    category: { type: String },
  },
  { timestamps: true }
);

export const Category = models.Category || model("Category", schema);
