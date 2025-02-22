import express from "express";
const router = express.Router();

import {
  register,
  loginByMobile,
  verifyMobileOTP,
  rolePage,
  refreshAccessToken,
  logout,
} from "../Controller/user.controller.js";
import admin from "./adminRoute.js";
import user from "./userRoute.js";
import notary from "./notaryRoute.js";
// Middleware
import { verifyUserJWT } from "../MiddleWare/verifyJWTToken.js";
// Auth
router.post("/register", register);
router.post("/loginByMobile", loginByMobile);
router.post("/verifyMobileOTP", verifyMobileOTP);
router.post("/refresh", refreshAccessToken);

// Authantication
router.use(verifyUserJWT);

router.put("/rolePage", rolePage);
router.put("/logout", logout);

// All Route
router.use("/admin", admin);
router.use("/user", user);
router.use("/notary", notary);

export default router;
