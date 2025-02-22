import express from "express";
const router = express.Router();

import {
  register,
  loginByMobile,
  verifyMobileOTP,
  myDetails,
  updateUser,
  rolePage,
  refreshAccessToken,
  logout,
  deleteProfilePic,
  addUpdateProfilePic,
} from "../Controller/user.controller.js";

import {
  addCategory,
  category,
  categoryById,
  deleteCategory,
} from "../Controller/category.controller.js";

// Middleware
import { verifyUserJWT } from "../MiddleWare/verifyJWTToken.js";
import { failureResponse } from "../MiddleWare/responseMiddleware.js";
import { uploadImage } from "../MiddleWare/uploadFile.js";

// Auth
// router.post("/register", register);
router.post("/loginByMobile", loginByMobile);
router.post("/verifyMobileOTP", verifyMobileOTP);
router.post("/refresh", refreshAccessToken);

// Authantication
router.use(verifyUserJWT);

router.put("/rolePage", rolePage);
router.put("/logout", logout);
// Validate Role
router.use((req, res, next) => {
  if (req.user.role !== "admin") {
    return failureResponse(res, 401, "Unauthorized!", null);
  }
  next();
});

// Profile
router.get("/", myDetails);
router.put("/", updateUser);

router.put("/pic", uploadImage.single("profilePic"), addUpdateProfilePic);
router.delete("/pic", deleteProfilePic);

// Category
router.get("/category", category);
router.get("/category/:id", categoryById);
router.post("/category", addCategory);
router.delete("/category/:id", deleteCategory);

export default router;
