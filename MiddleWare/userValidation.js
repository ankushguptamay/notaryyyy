import dotenv from "dotenv";
dotenv.config();

import joi from "joi";

const validateUserRegistration = (data) => {
  const schema = joi.object().keys({
    name: joi.string().min(3).max(30).required(),
    email: joi.string().email().required().label("Email"),
    mobileNumber: joi
      .string()
      .length(10)
      .pattern(/^[0-9]+$/)
      .required(),
    userTimeZone: joi.string().required(),
  });
  return schema.validate(data);
};

const validateUserMobileLogin = (data) => {
  const schema = joi.object().keys({
    mobileNumber: joi
      .string()
      .length(10)
      .pattern(/^[0-9]+$/)
      .required(),
  });
  return schema.validate(data);
};

const validateVerifyMobileOTP = (data) => {
  const schema = joi.object().keys({
    mobileNumber: joi
      .string()
      .length(10)
      .pattern(/^[0-9]+$/)
      .required(),
    otp: joi
      .string()
      .length(parseInt(process.env.OTP_DIGITS_LENGTH))
      .required(),
  });
  return schema.validate(data);
};

const validateRolePage = (data) => {
  const schema = joi.object().keys({
    role: joi.string().valid("advocate", "user", "admin").required(),
  });
  return schema.validate(data);
};

const validateUpdateAdvocate = (data) => {
  const schema = joi.object().keys({
    name: joi.string().min(3).max(30).required(),
    officeOrChamberAddress: joi.object().required(),
    courtOfPractice: joi.string().optional(),
    dateOfBirth: joi.string().optional(),
    gender: joi.string().valid("male", "female", "other").optional(),
    registrationNumber: joi.string().required(),
    feesChargeByNotary: joi.number().required(),
    expiryDateOfRegistrationNumber: joi.string().required(),
  });
  return schema.validate(data);
};

const validateBookingMode = (data) => {
  const schema = joi.object().keys({
    bookingMode: joi.string().valid().required(),
  });
  return schema.validate(data);
};

const validateUpdateUser = (data) => {
  const schema = joi.object().keys({
    name: joi.string().min(3).max(30).required(),
    gender: joi.string().valid("male", "female", "other").optional(),
  });
  return schema.validate(data);
};

const validateAddCategory = (data) => {
  const schema = joi.object().keys({
    category: joi.string().required(),
  });
  return schema.validate(data);
};

const validateBookNotary = (data) => {
  const schema = joi.object().keys({
    advocate: joi.string().required(),
    scheduledDate: joi.string().required(),
    message: joi.string().min(20).max(1000).required(),
    scheduledDay: joi
      .string()
      .valid("sun", "mon", "tues", "wed", "thur", "fri", "sat")
      .required(),
    category: joi.string().required(),
  });
  return schema.validate(data);
};

const validateChangeStatus = (data) => {
  const schema = joi.object().keys({
    bookingStatus: joi.string().valid("accepted", "rejected").required(),
  });
  return schema.validate(data);
};

export {
  validateUserRegistration,
  validateUserMobileLogin,
  validateVerifyMobileOTP,
  validateRolePage,
  validateUpdateAdvocate,
  validateBookingMode,
  validateUpdateUser,
  validateAddCategory,
  validateBookNotary,
  validateChangeStatus,
};
