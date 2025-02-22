import mongoose from "mongoose";
const { Schema, model, models, Types } = mongoose;

const notification = [
  "profile",
  "review",
  "category",
  "booking",
  "information",
];

const schema = new Schema(
  {
    recipient: { type: Types.ObjectId, ref: "User", required: true }, // Recipient of the notification
    sender: { type: Types.ObjectId, ref: "User", default: null }, // Who triggered the notification if notification auto generated then no one is sender
    type: {
      type: String,
      enum: {
        values: notification,
        message: "{VALUE} is not supported",
      },
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true }, // Notification body
    link: { type: String, default: null }, // Optional link external
    metadata: { type: Schema.Types.Mixed, default: {} }, // Stores extra data like id: messageId, id:bookingId, etc.
    isRead: { type: Boolean, default: false }, // When a user actively clicks on it.
    isSeen: { type: Boolean, default: false }, // When an user sees the notification but hasn't clicked it.
  },
  { timestamps: true }
);

// Indexing for faster queries
schema.index({ recipient: 1, isRead: 1, isSeen: 1, sender: 1 });

export const UserNotification =
  models.UserNotification || model("UserNotification", schema);
