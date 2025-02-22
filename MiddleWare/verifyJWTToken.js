import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import { User } from "../Model/userModel.js";
import { failureResponse } from "./responseMiddleware.js";
const { JWT_SECRET_KEY_USER } = process.env;

const verifyUserJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401);
    const token = authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    const decode = jwt.verify(token, JWT_SECRET_KEY_USER);

    const user = await User.findOne(
      { _id: decode._id },
      "_id name email mobileNumber role profilePic refreshToken"
    );
    if (!user || !user._doc.refreshToken) {
      return failureResponse(res, 401, "Unauthorized!", null);
    }
    req.user = user;
    return next();
  } catch (err) {
    return failureResponse(res, 500, err.message, null);
  }
};

export { verifyUserJWT };
