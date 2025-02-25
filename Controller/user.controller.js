import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { capitalizeFirstLetter } from "../Helper/formatChange.js";
import { compressImageFile, deleteSingleFile } from "../Helper/fileHelper.js";
import { generateFixedLengthRandomNumber } from "../Helper/generateOTP.js";
import {
  createUserAccessToken,
  createUserRefreshToken,
} from "../Helper/jwtToken.js";
import {
  failureResponse,
  successResponse,
} from "../MiddleWare/responseMiddleware.js";
import {
  validateUserRegistration,
  validateUserMobileLogin,
  validateVerifyMobileOTP,
  validateRolePage,
  validateUpdateAdvocate,
  validateUpdateUser,
  validateBookingMode,
} from "../MiddleWare/userValidation.js";
import { OTP } from "../Model/otpModel.js";
import { User } from "../Model/userModel.js";
import { deleteFileToBunny, uploadFileToBunny } from "../Util/bunny.js";
import { sendOTPToNumber } from "../Util/sendOTP.js";
const {
  OTP_DIGITS_LENGTH,
  OTP_VALIDITY_IN_MILLISECONDS,
  SHOW_BUNNY_FILE_HOSTNAME,
  JWT_SECRET_REFRESH_KEY_USER,
} = process.env;
import fs from "fs";
import jwt from "jsonwebtoken";
import {
  BOOKING_MODE_MESSAGE,
  BOOKING_MODE_TITLE,
  BOOKING_MODE_TYPE,
  LOGIN_MESSAGE,
  LOGIN_TITLE,
  LOGIN_TYPE,
  REGISTRATION_MESSAGE,
  REGISTRATION_TITLE,
  REGISTRATION_TYPE,
} from "../Constant/notification.js";
import { UserNotification } from "../Model/notificationModel.js";
const bunnyFolderName = "not-doc";

// Helper
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1); // Difference in latitude
  const dLon = deg2rad(lon2 - lon1); // Difference in longitude
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return parseFloat(distance.toFixed(3));
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function transformUserDetails(user) {
  const data = {
    _id: user._id,
    mobileNumber: user.mobileNumber,
    role: user.role,
    gender: user.gender || null,
    profilePic: user.profilePic ? user.profilePic.url || null : null,
    userCode: user.userCode,
  };
  if (user.name) {
    data.name = user.name;
  }
  if (user.email) {
    data.email = user.email;
  }
  if (user.role.toLowerCase() === "advocate") {
    data.dateOfBirth = user.dateOfBirth || null;
    data.bookingMode = user.bookingMode || null;
    data.officeOrChamberAddress = user.officeOrChamberAddress || null;
    data.courtOfPractice = user.courtOfPractice || null;
    data.registrationNumber = user.registrationNumber || null;
    data.averageRating = user.averageRating;
    data.feesChargeByNotary = user.feesChargeByNotary || null;
    data.expiryDateOfRegistrationNumber =
      user.expiryDateOfRegistrationNumber || null;
    data.officeOrChamberPics =
      user.officeOrChamberPics.length > 0
        ? user.officeOrChamberPics.map((pic) => {
            return { url: pic.url, _id: pic._id };
          })
        : [];
    data.advocateAvailability = user.advocateAvailability || [];
  }
  return data;
}

async function generateUserCode(preFix) {
  const today = new Date();
  today.setMinutes(today.getMinutes() + 330);
  const day = today.toISOString().slice(8, 10);
  const year = today.toISOString().slice(2, 4);
  const month = today.toISOString().slice(5, 7);
  let userCode,
    lastDigits,
    startWith = `${preFix}${day}${month}${year}`;
  const query = new RegExp("^" + startWith);
  const isUserCode = await User.findOne({ userCode: query }).sort({
    createdAt: -1,
  });
  if (!isUserCode) {
    lastDigits = 1;
  } else {
    lastDigits = parseInt(isUserCode.userCode.substring(9)) + 1;
  }
  userCode = `${startWith}${lastDigits}`;
  while (await User.findOne({ userCode })) {
    userCode = `${startWith}${lastDigits++}`;
  }
  return userCode;
}

const advocateAvailability = [
  { day: "sun", available: true, timePeriod: "10:00AM-06:00PM" },
  { day: "mon", available: true, timePeriod: "10:00AM-06:00PM" },
  { day: "tues", available: true, timePeriod: "10:00AM-06:00PM" },
  { day: "wed", available: true, timePeriod: "10:00AM-06:00PM" },
  { day: "thur", available: true, timePeriod: "10:00AM-06:00PM" },
  { day: "fri", available: true, timePeriod: "10:00AM-06:00PM" },
  { day: "sat", available: true, timePeriod: "10:00AM-06:00PM" },
];

// Main Controller
const register = async (req, res) => {
  try {
    // Body Validation
    const { error } = validateUserRegistration(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    const { email, mobileNumber } = req.body;
    // Capital First Letter
    const name = capitalizeFirstLetter(req.body.name);
    // Is user already present
    const isUser = await User.findOne({ $or: [{ email }, { mobileNumber }] });
    if (isUser) {
      return failureResponse(
        res,
        400,
        "These credentials are already present!"
      );
    }
    // Create in database
    const user = await User.create({ name, email, mobileNumber });
    // Generate OTP for Email
    const otp = generateFixedLengthRandomNumber(OTP_DIGITS_LENGTH);
    // Sending OTP to mobile number
    await sendOTPToNumber(mobileNumber, otp);
    // Store OTP
    await OTP.create({
      validTill: new Date().getTime() + parseInt(OTP_VALIDITY_IN_MILLISECONDS),
      otp: otp,
      receiverId: user._id,
    });
    // Register Notification In App
    await UserNotification.create({
      title: `${REGISTRATION_TITLE} ${name}.`,
      message: `${REGISTRATION_MESSAGE}.`,
      type: REGISTRATION_TYPE,
      recipient: user._id,
    });
    // Send final success response
    return successResponse(
      res,
      201,
      `OTP send successfully! Valid for ${
        OTP_VALIDITY_IN_MILLISECONDS / (60 * 1000)
      } minutes!`,
      { mobileNumber }
    );
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const loginByMobile = async (req, res) => {
  try {
    // Body Validation
    const { error } = validateUserMobileLogin(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    const { mobileNumber } = req.body;
    // Find User in collection
    const isUser = await User.findOne({ mobileNumber });
    if (!isUser) {
      return failureResponse(res, 401, "NOTPRESENT", { mobileNumber });
    }
    // Generate OTP for Email
    const otp = generateFixedLengthRandomNumber(OTP_DIGITS_LENGTH);
    console.log(otp);
    // Sending OTP to mobile number
    await sendOTPToNumber(mobileNumber, otp);
    //  Store OTP
    await OTP.create({
      validTill: new Date().getTime() + parseInt(OTP_VALIDITY_IN_MILLISECONDS),
      otp: otp,
      receiverId: isUser._id,
    });
    // Send final success response
    return successResponse(
      res,
      201,
      `OTP send successfully! Valid for ${
        OTP_VALIDITY_IN_MILLISECONDS / (60 * 1000)
      } minutes!`,
      { mobileNumber }
    );
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const verifyMobileOTP = async (req, res) => {
  try {
    // Validate body
    const { error } = validateVerifyMobileOTP(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    const { mobileNumber, otp } = req.body;
    // Is Email Otp exist
    const isOtp = await OTP.findOne({ otp });
    if (!isOtp) {
      return failureResponse(res, 401, `Invalid OTP!`, null);
    }
    // Checking is user present or not
    const user = await User.findOne(
      { $and: [{ mobileNumber }, { _id: isOtp.receiverId }] },
      "_id name email mobileNumber role"
    );
    if (!user) {
      return failureResponse(res, 401, `Invalid OTP!`, null);
    }
    // is email otp expired?
    const isOtpExpired = new Date().getTime() > parseInt(isOtp.validTill);
    await OTP.deleteMany({ receiverId: isOtp.receiverId });
    if (isOtpExpired) {
      return failureResponse(res, 403, `OTP expired!`, null);
    }
    const updateData = { lastLogin: new Date() };
    // Generate token
    const data = { _id: user._id };
    if (user.role) data.role = user.role;
    const refreshToken = createUserRefreshToken(data);
    const accessToken = createUserAccessToken(data);
    // Update user
    updateData.refreshToken = refreshToken;
    await user.updateOne(updateData);
    // Login Notification In App
    await UserNotification.create({
      title: `${LOGIN_TITLE} ${user.name}.`,
      message: `${LOGIN_MESSAGE}.`,
      type: LOGIN_TYPE,
      recipient: user._id,
    });
    // Final Response
    return successResponse(res, 201, `Welcome, ${user.name}`, {
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return failureResponse(res, 401, "Refresh token required!", null);
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET_REFRESH_KEY_USER);
    // Find valid user
    const user = await User.findById(decoded._id);
    if (!user || user?.refreshToken !== refreshToken) {
      return failureResponse(res, 403, "Unauthorized!", null);
    }
    // Generate access token
    const token = createUserAccessToken({ _id: user._id });
    // Final response
    return successResponse(res, 200, "Successfully", {
      accessToken: token,
      refreshToken,
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const logout = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { refreshToken: null });
    return successResponse(res, 200, "Loged out successfully");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const myDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-lastLogin -refreshToken -isDelete -deleted_at -createdAt -updatedAt"
    );
    if (!user) {
      return failureResponse(res, 401, "User is not present!");
    }
    // TransForm data
    const data = transformUserDetails(user._doc);
    // Send final success response
    return successResponse(res, 200, "Fetched successfully!", data);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const rolePage = async (req, res) => {
  try {
    // Body Validation
    const { error } = validateRolePage(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    const { role } = req.body;
    // Update Data
    const data = { role };
    // Define code prefix and message
    let codePreFix, message;
    if (role.toLowerCase() === "advocate") {
      data.advocateAvailability = advocateAvailability;
      message = "advocate";
      codePreFix = "NOA";
    } else if (role.toLowerCase() === "user") {
      message = "user";
      codePreFix = "NOU";
    } else if (role.toLowerCase() === "admin") {
      message = "admin";
      codePreFix = "ADM";
    } else {
      return failureResponse(res, 403, "This role is not supported!");
    }
    // generate User code
    const userCode = await generateUserCode(codePreFix);
    data.userCode = userCode;
    // Update user
    await User.findOneAndUpdate({ _id: req.user._id }, { $set: data });
    const accessToken = createUserAccessToken({ _id: req.user._id, role });
    // Final response
    return successResponse(
      res,
      201,
      `You are successfully register as ${message}!`,
      {
        ...req.user._doc,
        role,
        accessToken,
        profilePic: req.user._doc.profilePic
          ? req.user._doc.profilePic.url || null
          : null,
        userCode,
      }
    );
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const updateAdvocate = async (req, res) => {
  try {
    // Validate Body
    const { error } = validateUpdateAdvocate(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    const {
      dateOfBirth = undefined,
      gender = undefined,
      officeOrChamberAddress = undefined,
      courtOfPractice = undefined,
      registrationNumber = undefined,
      feesChargeByNotary = undefined,
      expiryDateOfRegistrationNumber = undefined,
    } = req.body;
    const name = capitalizeFirstLetter(req.body.name);
    // Update
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : dateOfBirth,
          gender,
          officeOrChamberAddress,
          courtOfPractice,
          registrationNumber,
          feesChargeByNotary: parseInt(feesChargeByNotary),
          expiryDateOfRegistrationNumber: new Date(
            expiryDateOfRegistrationNumber
          ),
          name,
        },
      }
    );
    // Send final success response
    return successResponse(res, 201, `Profile updated successfully!`);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const bookingMode = async (req, res) => {
  try {
    // Validate Body
    const { error } = validateBookingMode(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    const bookingMode = req.body.bookingMode;
    // Update
    await User.updateOne({ _id: req.user._id }, { $set: { bookingMode } });
    // Mode Notification In App
    await UserNotification.create({
      title: `${BOOKING_MODE_TITLE}.`,
      message: `${BOOKING_MODE_MESSAGE} ${bookingMode}.`,
      type: BOOKING_MODE_TYPE,
      recipient: req.user._id,
    });
    // Send final success response
    return successResponse(res, 201, `Mode change successfully!`);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const addUpdateProfilePic = async (req, res) => {
  try {
    // File should be exist
    if (!req.file)
      return failureResponse(res, 400, "Please..upload a profile image!", null);
    // Compress File
    const buffer = fs.readFileSync(req.file.path);
    const compressedImagePath = await compressImageFile(buffer, req.file);
    // Upload file to bunny
    const fileStream = fs.createReadStream(compressedImagePath.imagePath);
    await uploadFileToBunny(
      bunnyFolderName,
      fileStream,
      compressedImagePath.imageName
    );
    // Delete file from server
    deleteSingleFile(compressedImagePath.imagePath);
    const profilePic = {
      fileName: compressedImagePath.imageName,
      url: `${SHOW_BUNNY_FILE_HOSTNAME}/${bunnyFolderName}/${compressedImagePath.imageName}`,
    };
    // Check is profile pic already present
    let message = "Profile pic added successfully!";
    if (req.user?.profilePic?.fileName) {
      message = "Profile pic updated successfully!";
      deleteFileToBunny(bunnyFolderName, req.user.profilePic.fileName);
    }

    // Update
    await User.updateOne({ _id: req.user._id }, { profilePic });
    // Final response
    return successResponse(res, 201, message);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const deleteProfilePic = async (req, res) => {
  try {
    if (req.user?.profilePic?.fileName) {
      deleteFileToBunny(bunnyFolderName, req.user.profilePic.fileName);
    }
    // Change
    await User.updateOne({ _id: req.user._id }, { profilePic: null });
    // Final response
    return successResponse(res, 200, "Profile pic deleted successfully!");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const updateUser = async (req, res) => {
  try {
    // Validate Body
    const { error } = validateUpdateUser(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    const { gender, dateOfBirth } = req.body;
    const name = capitalizeFirstLetter(req.body.name);
    // Check Which data changed
    const changedData = {
      name,
      gender: gender ? gender.toLowerCase() : undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    };
    // Update
    await User.updateOne({ _id: req.user._id }, { $set: changedData });
    // Send final success response
    return successResponse(res, 201, `Profile updated successfully!`);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const searchAdvocate = async (req, res) => {
  try {
    const {
      search,
      starRating,
      loc = [],
      radius = 10000, // 3km
      role = "advocate",
    } = req.query;
    // const loc = [28.65465,77.2969942]; // User's latitude,longitude

    const resultPerPage = req.query.resultPerPage
      ? parseInt(req.query.resultPerPage)
      : 20;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const skip = (page - 1) * resultPerPage;

    //Search
    const query = {
      $and: [
        { _id: { $nin: [req.user._id] } },
        { role },
        { isDelete: false },
        {
          expiryDateOfRegistrationNumber: {
            $gte: new Date(JSON.stringify(new Date()).slice(1, 11)),
          },
        },
      ],
    };
    // Location
    if (loc.length === 2) {
      query.$and.push({
        "officeOrChamberAddress.coordinates": {
          $geoWithin: {
            $centerSphere: [loc, radius / 6378100],
          },
        },
      });
    } else {
      return failureResponse(res, 400, "User location is required!", null);
    }
    // Search
    if (search) {
      const startWith = new RegExp("^" + search.toLowerCase(), "i");
      query.$and.push({ name: startWith });
    }
    // Average rating
    if (starRating) {
      query.$and.push({ averageRating: { $gte: parseInt(starRating) } });
    }
    // Get required data
    const [advocate, totalAdvocate] = await Promise.all([
      User.find(query)
        .select(
          "_id name role profilePic gender registrationNumber averageRating officeOrChamberAddress"
        )
        .sort({ averageRating: -1 })
        .skip(skip)
        .limit(resultPerPage)
        .lean(),
      User.countDocuments(query),
    ]);

    // Transform Data
    const transformData = advocate.map((user) => {
      return {
        _id: user._id,
        name: user.name,
        role: user.role,
        gender: user.gender,
        profilePic: user.profilePic ? user.profilePic.url || null : null,
        averageRating: user.averageRating,
        registrationNumber: user.registrationNumber,
        officeOrChamberAddress: {
          address: user.officeOrChamberAddress.address,
          coordinates: user.officeOrChamberAddress.coordinates,
          distanceFromUserLocationInKM: getDistanceFromLatLonInKm(
            loc[0],
            loc[1],
            user.officeOrChamberAddress.coordinates[0],
            user.officeOrChamberAddress.coordinates[1]
          ),
        },
      };
    });
    const totalPages = Math.ceil(totalAdvocate / resultPerPage) || 0;
    // Send final success response
    return successResponse(res, 200, `Successfully!`, {
      data: transformData,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (err) {
    console.log(err);
    failureResponse(res, 500, err, null);
  }
};

const advocateDetails = async (req, res) => {
  try {
    const loc = req.query.loc;
    if (loc.length !== 2) {
      return failureResponse(res, 400, "User location is required!", null);
    }
    const user = await User.findById(req.params.id).select(
      "-email -mobileNumber -lastLogin -refreshToken -isDelete -deleted_at -createdAt -updatedAt"
    );
    if (!user) {
      return failureResponse(res, 401, "Advocate is not present!");
    }
    // TransForm data
    const data = transformUserDetails(user._doc);
    // Send final success response
    return successResponse(res, 200, "Fetched successfully!", {
      ...data,
      officeOrChamberAddress: {
        ...data.officeOrChamberAddress,
        distanceFromUserLocationInKM: getDistanceFromLatLonInKm(
          loc[0],
          loc[1],
          data.officeOrChamberAddress.coordinates[0],
          data.officeOrChamberAddress.coordinates[1]
        ),
      },
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const addOfficePic = async (req, res) => {
  try {
    // File should be exist
    if (!req.files || req.files.length <= 0)
      return failureResponse(res, 400, "Please select atleast an image!", null);

    const officeOrChamberPics = [];
    for (let i = 0; i < req.files.length; i++) {
      // Compress File
      const buffer = fs.readFileSync(req.files[i].path);
      const compressedImagePath = await compressImageFile(buffer, req.files[i]);
      // Upload file to bunny
      const fileStream = fs.createReadStream(compressedImagePath.imagePath);
      await uploadFileToBunny(
        bunnyFolderName,
        fileStream,
        compressedImagePath.imageName
      );
      // Delete file from server
      deleteSingleFile(compressedImagePath.imagePath);
      officeOrChamberPics.push({
        fileName: compressedImagePath.imageName,
        url: `${SHOW_BUNNY_FILE_HOSTNAME}/${bunnyFolderName}/${compressedImagePath.imageName}`,
      });
    }
    // Update
    await User.updateOne(
      { _id: req.user._id },
      { $push: { officeOrChamberPics: { $each: officeOrChamberPics } } },
      { new: true }
    );
    // Final response
    return successResponse(res, 201, "Added successfully");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const deleteOfficePic = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(req.user._id).select(
      "officeOrChamberPics"
    );
    const officeOrChamberPics = [];
    for (let i = 0; i < user._doc.officeOrChamberPics.length; i++) {
      if (user._doc.officeOrChamberPics[i]._id.toString() == id.toString()) {
        deleteFileToBunny(
          bunnyFolderName,
          user._doc.officeOrChamberPics[i].fileName
        );
      } else {
        officeOrChamberPics.push({
          _id: user._doc.officeOrChamberPics[i]._id,
          fileName: user._doc.officeOrChamberPics[i].fileName,
          url: user._doc.officeOrChamberPics[i].url,
        });
      }
    }
    // Change
    await User.updateOne(
      { _id: req.user._id },
      { $set: { officeOrChamberPics } }
    );
    // Final response
    return successResponse(res, 200, "Pic deleted successfully!");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

export {
  register,
  loginByMobile,
  verifyMobileOTP,
  myDetails,
  rolePage,
  updateAdvocate,
  addUpdateProfilePic,
  deleteProfilePic,
  refreshAccessToken,
  logout,
  updateUser,
  searchAdvocate,
  advocateDetails,
  bookingMode,
  addOfficePic,
  deleteOfficePic,
};
