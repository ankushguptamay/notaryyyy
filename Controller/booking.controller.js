import {
  BOOKING_ADVOCATE_MESSAGE,
  BOOKING_ADVOCATE_TITLE,
  BOOKING_ADVOCATE_TYPE,
  BOOKING_STATUS_USER_ACCEPTED_MESSAGE,
  BOOKING_STATUS_USER_REJECTED_MESSAGE,
  BOOKING_STATUS_USER_TITLE,
  BOOKING_STATUS_USER_TYPE,
} from "../Constant/notification.js";
import { capitalizeFirstLetter } from "../Helper/formatChange.js";
import {
  failureResponse,
  successResponse,
} from "../MiddleWare/responseMiddleware.js";
import {
  validateBookNotary,
  validateChangeStatus,
} from "../MiddleWare/userValidation.js";
import { Booking } from "../Model/bookingModel.js";
import { Category } from "../Model/categoryModel.js";
import { UserNotification } from "../Model/notificationModel.js";
import { User } from "../Model/userModel.js";

// Main Controller
const bookNotary = async (req, res) => {
  try {
    // Body Validation
    const { error } = validateBookNotary(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    // Body
    const { advocate, scheduledDate, message, scheduledDay } = req.body;
    const client = req.user._id;
    const category = capitalizeFirstLetter(req.body.category);
    // Find Advocate
    const notary = await User.findOne({
      _id: advocate,
      isDelete: false,
      role: "advocate",
    }).select("advocateAvailability bookingMode");
    if (!notary) {
      return failureResponse(
        res,
        400,
        "Sorry! This advocate is not present!",
        null
      );
    }
    // Check is advocate available on scheduled day
    const advocateAvailability = notary.advocateAvailability;
    const isAvailable = advocateAvailability.some(
      (day) => day.day === scheduledDay && day.available
    );
    if (!isAvailable) {
      return failureResponse(
        res,
        400,
        "Sorry! Advocate is not present at this date!",
        null
      );
    }
    // Create this category if not exist
    await Category.findOneAndUpdate(
      { category },
      { updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    // Accept according to booking mode
    let bookingStatus = "pending";
    if (notary.bookingMode === "instant") {
      bookingStatus = "accepted";
    }
    // Change
    const booking = await Booking.create({
      client,
      advocate,
      scheduledDate: new Date(scheduledDate),
      message,
      category,
      scheduledDay,
      bookingStatus,
    });
    // Notification for Advocate
    await UserNotification.create({
      title: BOOKING_ADVOCATE_TITLE + ".",
      message: BOOKING_ADVOCATE_MESSAGE + ".",
      type: BOOKING_ADVOCATE_TYPE,
      recipient: advocate,
      metadata: { bookingId: booking._id },
    });
    // Notification for User
    // Final response
    return successResponse(res, 200, "Booked successfully!");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const myBooking = async (req, res) => {
  try {
    const {
      search,
      bookingStatus,
      scheduledDate = JSON.stringify(new Date()).slice(1, 11),
    } = req.query;
    const resultPerPage = req.query.resultPerPage
      ? parseInt(req.query.resultPerPage)
      : 20;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const skip = (page - 1) * resultPerPage;
    // Condition
    const query = {
      $and: [{ isDelete: false }],
    };
    let populate = "advocate";
    if (req.user.role === "advocate") {
      populate = "client";
      query.$and.push({ advocate: req.user._id });
      query.$and.push({ scheduledDate: { $gte: new Date(scheduledDate) } });
    } else if (req.user.role === "user") {
      query.$and.push({ client: req.user._id });
    } else {
      return failureResponse(res, 401, "This role is not supported!", null);
    }
    // Search
    if (search) {
      const startWith = new RegExp("^" + search.toLowerCase(), "i");
      query.$and.push({ category: startWith });
    }
    // bookingStatus
    if (bookingStatus) {
      query.$and.push({ bookingStatus });
    }
    // Get required data
    const [bookings, totalBooking] = await Promise.all([
      Booking.find(query)
        .select("_id scheduledDate scheduledDay message category bookingStatus")
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(resultPerPage)
        // .populate(populate, "_id name profilePic")
        .lean(),
      Booking.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalBooking / resultPerPage) || 0;
    // Final response
    return successResponse(res, 200, "Fetched successfully!", {
      data: bookings,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const bookingDetails = async (req, res) => {
  try {
    let populate = "advocate";
    if (req.user.role === "advocate") {
      populate = "client";
    } else if (req.user.role === "user") {
    } else {
      return failureResponse(res, 401, "This role is not supported!", null);
    }
    const booking = await Booking.findOne({
      _id: req.params.id,
      isDelete: false,
    })
      .select("_id scheduledDate scheduledDay message category bookingStatus")
      .populate(
        populate,
        "_id name email mobileNumber profilePic advocateAvailability"
      );

    const data = {
      ...booking._doc,
    };
    if (booking._doc.client) {
      data.client = {
        _id: booking._doc.client._id,
        name: booking._doc.client.name,
        profilePic: booking._doc.client.profilePic
          ? booking._doc.client.profilePic.url || null
          : null,
      };
    } else {
      data.advocate = {
        _id: booking._doc.advocate._id,
        name: booking._doc.advocate.name,
        profilePic: booking._doc.advocate.profilePic
          ? booking._doc.advocate.profilePic.url || null
          : null,
        advocateAvailability: booking._doc.advocate.advocateAvailability,
      };
    }
    if (booking._doc.bookingStatus === "accepted") {
      data.advocate.email = booking._doc.advocate.email;
      data.advocate.mobileNumber = booking._doc.advocate.mobileNumber;
    }

    // Final response
    return successResponse(res, 200, "Fetched successfully!", { data });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const changeStatus = async (req, res) => {
  try {
    // Body Validation
    const { error } = validateChangeStatus(req.body);
    if (error) {
      return failureResponse(res, 400, error.details[0].message, null);
    }
    const bookingStatus = req.body.bookingStatus;
    const booking = await Booking.findOne({
      _id: req.params.id,
      advocate: req.user._id,
      isDelete: false,
    }).select("_id scheduledDate client bookingStatus");
    if (!booking) {
      return failureResponse(res, 400, "This booking is not present!", null);
    }
    // Update status
    await booking.updateOne({ bookingStatus });
    // Notification
    await UserNotification.create({
      title: `${BOOKING_STATUS_USER_TITLE} ${bookingStatus}.`,
      message:
        bookingStatus === "accepted"
          ? `${BOOKING_STATUS_USER_ACCEPTED_MESSAGE}.`
          : `${BOOKING_STATUS_USER_REJECTED_MESSAGE}.`,
      type: BOOKING_STATUS_USER_TYPE,
      recipient: booking.client,
      metadata: { bookingId: booking._id },
    });
    // Final response
    return successResponse(res, 200, `${bookingStatus} successfully!`);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      client: req.user._id,
      isDelete: false,
    }).select("_id scheduledDate client bookingStatus");
    if (!booking || booking.bookingStatus === "rejected") {
      return failureResponse(res, 400, "This booking is not present!", null);
    }
    // Update status
    await booking.updateOne({
      $set: {
        bookingStatus: "canceled",
        isDelete: true,
        deleted_at: new Date(),
      },
    });
    // Final response
    return successResponse(res, 200, `Canceled successfully!`);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

export { bookNotary, myBooking, bookingDetails, changeStatus, cancelBooking };
