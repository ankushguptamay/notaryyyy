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

export default router;
