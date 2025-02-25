import mongoose from "mongoose";
const { Schema, model, models, Types } = mongoose;

const schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobileNumber: { type: String, required: true, unique: true },
    profilePic: {
      fileName: { type: String },
      url: { type: String },
    },
    dateOfBirth: { type: Date, required: false },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "{VALUE} is not supported",
      },
      required: false,
    },
    role: {
      type: String,
      enum: {
        values: ["advocate", "user", "admin"],
        message: "{VALUE} is not supported",
      },
    },
    userCode: { type: String },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (value) => Math.round(value * 10) / 10, // Rounds to 1 decimal place
    },
    lastLogin: { type: Date, default: Date.now },
    bookingMode: {
      type: String,
      enum: {
        values: ["instant", "mannual"],
        message: "{VALUE} is not supported",
      },
      default: "mannual",
    },
    officeOrChamberAddress: {
      address: { type: String },
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: false, index: "2dsphere" }, // [latitude, longitude]
    },
    courtOfPractice: { type: String, required: false },
    registrationNumber: { type: String, required: false },
    expiryDateOfRegistrationNumber: { type: Date, unique: true },
    feesChargeByNotary: { type: String, required: false },
    advocateAvailability: [
      {
        day: {
          type: String,
          enum: ["sun", "mon", "tues", "wed", "thur", "fri", "sat"],
        },
        available: { type: Boolean, default: true },
        timePeriod: { type: String }, // In IST
      },
    ],
    officeOrChamberPics: [
      {
        fileName: { type: String },
        url: { type: String },
      },
    ],
    refreshToken: { type: String },
    isDelete: { type: Boolean, default: false },
    deleted_at: { type: Date },
  },
  { timestamps: true }
);

export const User = models.User || model("User", schema);
