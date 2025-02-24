import express from "express";
const router = express.Router();

import {
  myDetails,
  updateAdvocate,
  deleteProfilePic,
  addUpdateProfilePic,
  bookingMode,
  addOfficePic,
  deleteOfficePic,
} from "../Controller/user.controller.js";
import { category, categoryById } from "../Controller/category.controller.js";
import {
  bookingDetails,
  myBooking,
  changeStatus,
} from "../Controller/booking.controller.js";
import {
  notificationDetails,
  myNotification,
  seenNotification,
  unSeenNotification,
} from "../Controller/notification.controller.js";
import {
  getReviews,
  giveUnGiveReactionOnReview,
  replyOnMyReviews,
  deleteMyReply,
  getReviewDetails,
} from "../Controller/advocateReview.controller.js";

// Middleware
import { failureResponse } from "../MiddleWare/responseMiddleware.js";
import { uploadImage } from "../MiddleWare/uploadFile.js";

// Validate Role
router.use((req, res, next) => {
  if (req.user.role !== "advocate") {
    return failureResponse(res, 401, "Unauthorized!", null);
  }
  next();
});

// Profile
router.get("/", myDetails);
router.put("/", updateAdvocate);
router.put("/bookingMode", bookingMode);
router.post(
  "/profilePic",
  uploadImage.single("profilePic"),
  addUpdateProfilePic
);
router.delete("/profilePic", deleteProfilePic);
router.post("/officePic", uploadImage.array("officePic", 10), addOfficePic);
router.delete("/officePic/:id", deleteOfficePic);

// Category
router.get("/category", category);
router.get("/category/:id", categoryById);

// Booking
router.get("/bookings", myBooking);
router.get("/bookings/:id", bookingDetails);
router.put("/bookings/:id", changeStatus);

// Notification
router.get("/notification", myNotification);
router.get("/notification/:id", notificationDetails);
router.put("/seen", seenNotification);
router.get("/unseen", unSeenNotification);

// Review
router.post("/reply", replyOnMyReviews);
router.delete("/reply/:id", deleteMyReply);
router.get("/reviews", getReviews);
router.get("/reviews/:id", getReviewDetails);
router.put("/react/:id", giveUnGiveReactionOnReview);

export default router;
