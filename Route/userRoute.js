import express from "express";
const router = express.Router();

import {
  myDetails,
  updateUser,
  deleteProfilePic,
  addUpdateProfilePic,
  searchAdvocate,
  advocateDetails,
} from "../Controller/user.controller.js";
import { category, categoryById } from "../Controller/category.controller.js";
import {
  bookNotary,
  bookingDetails,
  myBooking,
  cancelBooking,
} from "../Controller/booking.controller.js";
import {
  notificationDetails,
  myNotification,
  seenNotification,
  unSeenNotification,
} from "../Controller/notification.controller.js";
import {
  giveOrUpdateReviews,
  deleteReviewByUser,
  getReviews,
  giveUnGiveReactionOnReview,
  getReviewDetails,
} from "../Controller/advocateReview.controller.js";

// Middleware
import { failureResponse } from "../MiddleWare/responseMiddleware.js";
import { uploadImage } from "../MiddleWare/uploadFile.js";

// Validate Role
router.use((req, res, next) => {
  if (req.user.role !== "user") {
    return failureResponse(res, 401, "Unauthorized!", null);
  }
  next();
});

// Profile
router.get("/", myDetails);
router.put("/", updateUser);
router.put("/pic", uploadImage.single("profilePic"), addUpdateProfilePic);
router.delete("/pic", deleteProfilePic);
router.get("/advocate", searchAdvocate);
router.get("/advocate/:id", advocateDetails);

// Category
router.get("/category", category);
router.get("/category/:id", categoryById);

// Booking
router.get("/bookings", myBooking);
router.get("/bookings/:id", bookingDetails);
router.post("/bookings", bookNotary);
router.put("/bookings/:id", cancelBooking);

// Notification
router.get("/notification", myNotification);
router.get("/notification/:id", notificationDetails);
router.put("/seen", seenNotification);
router.get("/unseen", unSeenNotification);

// Review
router.post("/reviews", giveOrUpdateReviews);
router.delete("/reviews/:id", deleteReviewByUser);
router.get("/reviews", getReviews);
router.get("/reviews/:id", getReviewDetails);
router.put("/react/:id", giveUnGiveReactionOnReview);

export default router;
