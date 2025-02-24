import mongoose from "mongoose";
const { Schema, model, models, Types } = mongoose;

const schema = new Schema(
  {
    scheduledDate: { type: Date },
    scheduledDay: {
      type: String,
      enum: ["sun", "mon", "tues", "wed", "thur", "fri", "sat"],
      required: true,
    },
    client: { type: Types.ObjectId, ref: "User", required: true },
    advocate: { type: Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    category: { type: String, required: true },
    bookingStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", "canceled"],
      required: true,
    },
    isDelete: { type: Boolean, default: false },
    deleted_at: { type: Date },
  },
  { timestamps: true }
);

export const Booking = models.Booking || model("Booking", schema);
