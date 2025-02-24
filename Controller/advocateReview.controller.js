import mongoose from "mongoose";
import {
  failureResponse,
  successResponse,
} from "../MiddleWare/responseMiddleware.js";
import { AdvocateReview } from "../Model/advocateReview.js";
import { Booking } from "../Model/bookingModel.js";
import { User } from "../Model/userModel.js";
import {
  validateAdvocateReview,
  validateReplyOnMyReviews,
} from "../MiddleWare/userValidation.js";

// Helper Function
function calculateAverageRating(advocate) {
  return new Promise((resolve, reject) => {
    AdvocateReview.aggregate([
      {
        $match: {
          isDelete: false,
          advocate: new mongoose.Types.ObjectId(advocate),
        },
      },
      { $group: { _id: "$advocate", averageRating: { $avg: "$rating" } } },
      { $project: { _id: 0, averageRating: 1 } },
    ])
      .then((data) => {
        const averageRating =
          Array.isArray(data) && data.length > 0
            ? Math.round(data[0].averageRating * 10) / 10
            : 0;
        resolve(averageRating);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function tranformReview(data) {
  const transformData = data.map(
    ({ _id, message, rating, client, advocateReply, reactions, createdAt }) => {
      return {
        _id,
        rating,
        message,
        client: {
          _id: client._id,
          name: client.name,
          profilePic: client.profilePic ? client.profilePic.url || null : null,
        },
        createdAt,
        advocateReply,
        noOfReactions: reactions.length,
      };
    }
  );
  return transformData;
}

// Main Controller
const giveOrUpdateReviews = async (req, res) => {
  try {
    // Body Validation
    const { error } = validateAdvocateReview(req.body);
    if (error) return failureResponse(res, 400, error.details[0].message, null);
    const { rating, message = null, advocate } = req.body;
    const client = req.user._id;
    // Match id
    if (client.toString() == advocate.toString()) {
      return failureResponse(
        res,
        400,
        "You can not give review to your self!",
        null
      );
    }
    // Check Is user take any service from advocate or not
    const service = await Booking.findOne({
      client,
      advocate,
      isDelete: false,
      bookingStatus: "accepted",
    });
    if (!service) {
      return failureResponse(res, 400, "You are not able to give review!");
    }
    // Check is any review present
    const review = await AdvocateReview.findOne({
      client,
      advocate,
      isDelete: false,
    });
    // Update or create new one
    if (review) {
      review.message = message;
      review.rating = parseInt(rating);
      await review.save();
    } else {
      await AdvocateReview.create({
        client,
        advocate,
        message,
        rating: parseInt(rating),
      });
    }
    // Update Average rating of Instructor
    const averageRating = await calculateAverageRating(advocate);
    await User.updateOne({ _id: advocate }, { $set: { averageRating } });
    // Send final success response
    return successResponse(res, 201, `Thanks to give review!`);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const deleteReviewByUser = async (req, res) => {
  try {
    const client = req.user._id;
    const review = await AdvocateReview.findOne({
      _id: req.params.id,
      client,
      isDelete: false,
    });
    if (!review)
      return failureResponse(res, 400, "This review is not present!", null);
    // Soft Delete
    review.isDelete = true;
    review.deleted_at = new Date();
    await review.save();
    // Update Average rating of Instructor
    const averageRating = await calculateAverageRating(review.advocate);
    await User.updateOne({ _id: review.advocate }, { $set: { averageRating } });
    // Send final success response
    return successResponse(res, 200, "Review deleted!");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const getReviews = async (req, res) => {
  try {
    let advocateId = req.query.id;
    if (req.user.role.toLowerCase() !== "advocate") {
      if (!advocateId) {
        return failureResponse(res, 400, "Please select a advocate!", null);
      }
    } else {
      advocateId = req.user._id;
    }
    // Pagination
    const resultPerPage = req.query.resultPerPage
      ? parseInt(req.query.resultPerPage)
      : 20;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const skip = (page - 1) * resultPerPage;
    // Find Average rating and no of reviews
    const advocate = await AdvocateReview.aggregate([
      {
        $match: {
          isDelete: false,
          advocate: new mongoose.Types.ObjectId(advocateId),
        },
      },
      {
        $group: {
          _id: "$advocate", // Group by advocate ID
          averageRating: { $avg: "$rating" }, // Calculate the average rating
          totalReviews: { $sum: 1 }, // Optional: Count total reviews
        },
      },
      { $project: { _id: 1, averageRating: 1, totalReviews: 1 } },
    ]);
    // Get data
    const query = { $and: [{ isDelete: false }, { advocate: advocateId }] };
    const [reviews, totalReview] = await Promise.all([
      AdvocateReview.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(resultPerPage)
        .populate("client", "_id name profilePic")
        .lean(),
      AdvocateReview.countDocuments(query),
    ]);
    // Transform review
    const transformData = tranformReview(reviews);
    // Send final success response
    return successResponse(res, 200, "Fetched!", {
      totalPages: Math.ceil(totalReview / resultPerPage) || 0,
      currentPage: page,
      advocate: advocate[0],
      reviews: transformData,
    });
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const giveUnGiveReactionOnReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const id = req.user._id;
    // Find Review
    const review = await AdvocateReview.findOne({
      _id: reviewId,
      isDelete: false,
    });
    if (!review) {
      failureResponse(res, 400, "This review is not present", null);
    }

    let message = "Reaction gave!";
    let reactions = review.reactions.map((rea) => rea.toString());
    if (reactions.includes(id.toString())) {
      message = "Reaction taken back!";
      reactions = reactions.filter((e) => e !== id.toString());
    } else {
      reactions.push(id.toString());
    }
    review.reactions = reactions;

    await review.save();
    // Send final success response
    return successResponse(res, 200, message);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const replyOnMyReviews = async (req, res) => {
  try {
    // Body Validation
    const { error } = validateReplyOnMyReviews(req.body);
    if (error) return failureResponse(res, 400, error.details[0].message, null);
    const { reviewId, reply } = req.body;
    const id = req.user._id;
    // Find Review
    const review = await AdvocateReview.findOne({
      _id: reviewId,
      isDelete: false,
      advocate: id,
    });
    if (!review) {
      failureResponse(
        res,
        400,
        "Either this review is not present or you are not allow to reply on this review message!",
        null
      );
    }
    // save
    review.advocateReply = reply;
    await review.save();
    // Send final success response
    return successResponse(res, 200, "Replied successfully!");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const deleteMyReply = async (req, res) => {
  try {
    // Find Review
    const review = await AdvocateReview.findOne({
      _id: req.params.id,
      isDelete: false,
      advocate: req.user._id,
    });
    if (!review) {
      failureResponse(res, 400, "This review is not present!", null);
    }
    review.advocateReply = null;
    await review.save();
    // Send final success response
    return successResponse(res, 200, "Reply deleted successfully!");
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

const getReviewDetails = async (req, res) => {
  try {
    const reviewId = req.params.id;
    // Find Review
    const review = await AdvocateReview.findOne({
      _id: reviewId,
      isDelete: false,
    })
      .select("_id rating message advocateReply reactions createdAt")
      .populate("client", "_id name profilePic");
    if (!review) {
      failureResponse(res, 400, "This review is not present!", null);
    }
    // Find Average rating and no of reviews
    const advocate = await AdvocateReview.aggregate([
      {
        $match: {
          isDelete: false,
          advocate: new mongoose.Types.ObjectId(review.advocate),
        },
      },
      {
        $group: {
          _id: "$advocate", // Group by advocate ID
          averageRating: { $avg: "$rating" }, // Calculate the average rating
          totalReviews: { $sum: 1 }, // Optional: Count total reviews
        },
      },
      { $project: { _id: 1, averageRating: 1, totalReviews: 1 } },
    ]);
    const transformData = {
      advocate: advocate[0],
      review: {
        ...review._doc,
        client: {
          ...review.client._doc,
          profilePic: review.client.profilePic
            ? review.client.profilePic.url || null
            : null,
        },
        reactions: review.reactions.length,
      },
    };
    // Send final success response
    return successResponse(res, 200, "Fetched successfully!", transformData);
  } catch (err) {
    failureResponse(res, 500, err.message, null);
  }
};

export {
  giveOrUpdateReviews,
  deleteReviewByUser,
  getReviews,
  giveUnGiveReactionOnReview,
  replyOnMyReviews,
  deleteMyReply,
  getReviewDetails,
};
