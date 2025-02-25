import {
  failureResponse,
  successResponse,
} from "../MiddleWare/responseMiddleware.js";
import { UserNotification } from "../Model/notificationModel.js";

const myNotification = async (req, res) => {
  try {
    const { search } = req.query;
    const resultPerPage = req.query.resultPerPage
      ? parseInt(req.query.resultPerPage)
      : 20;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const skip = (page - 1) * resultPerPage;
    // Condition
    const query = { $and: [{ recipient: req.user._id }] };
    // Search
    if (search) {
      const startWith = new RegExp("^" + search.toLowerCase(), "i");
      query.$and.push({ title: startWith });
      query.$and.push({ category: search });
    }
    // Get required data
    const [notifications, totalNotifications] = await Promise.all([
      UserNotification.find(query)
        .select("_id createdAt type title message link metadata isRead isSeen")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(resultPerPage)
        .lean(),
      UserNotification.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalNotifications / resultPerPage) || 0;
    // Final response
    return successResponse(res, 200, "Fetched successfully!", {
      data: notifications,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const notificationDetails = async (req, res) => {
  try {
    const notification = await UserNotification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    }).select("_id createdAt type title message link metadata isRead isSeen");
    if (!notification) {
      return failureResponse(
        res,
        400,
        "This notification is not present!",
        null
      );
    }
    notification.isRead = true;
    notification.isSeen = true;
    await notification.save();
    // Final response
    return successResponse(res, 200, "Fetched successfully!", {
      data: notification,
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const seenNotification = async (req, res) => {
  try {
    await UserNotification.updateMany(
      {
        recipient: req.user._id,
        isSeen: false,
      },
      { $set: { isSeen: true } }
    );
    // Final response
    return successResponse(res, 200, "All notification seen successfully!");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const unSeenNotification = async (req, res) => {
  try {
    const notification = await UserNotification.countDocuments({
      recipient: req.user._id,
      isSeen: false,
    });
    // Final response
    return successResponse(res, 200, "Successfully!", { data: notification });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

export {
  myNotification,
  notificationDetails,
  seenNotification,
  unSeenNotification,
};
