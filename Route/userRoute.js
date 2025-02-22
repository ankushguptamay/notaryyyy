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

export default router;
