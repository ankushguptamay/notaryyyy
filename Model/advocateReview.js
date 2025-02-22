import mongoose from "mongoose";
const { Schema, model, models, Types } = mongoose;

const schema = new Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 }, // star Rating
    message: { type: String },
    client: { type: Types.ObjectId, ref: "User", required: true },
    advocate: { type: Types.ObjectId, ref: "User", required: true },
    advocateReply: {
      reply: { type: String, required: true },
      givenAt: { type: Date, default: Date.now },
    },
    reactions: [{ type: Types.ObjectId, ref: "User" }],
    isDelete: { type: Boolean, default: false },
    deleted_at: { type: Date },
  },
  { timestamps: true }
);

export const AdvocateReview =
  models.AdvocateReview || model("AdvocateReview", schema);
