import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Toggleling the subscription
const toggleSubscription = asyncHandler(async (req, res) => {
  // 1) Find the channel id in params
  // 2) Check if channel id is vallid
  // 3) Find the document of Subscription(if exist delete that if not create the document )
  const { channelId } = req.params;

  try {
    if (!isValidObjectId(channelId)) {
      throw new ApiError(401, "Invalid channel ID");
    }

    const channelData = await Subscription.findOne({
      subscriber: req.user?._id,
      channel: channelId,
    }).lean();

    console.log(channelData);

    let data;

    if (channelData) {
      data = await Subscription.findOneAndDelete({
        channel: channelData,
        subscriber: req.user?._id,
      });
    } else {
      data = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId,
      });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          data,
          `${channelData ? "unsubcribed" : "subscribed"} successfully`
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong cant toggle the subcription"
    );
  }
});

// Get logged in user subscribers
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  // 1) Match the logged In user(channel)
  // 2) lookup in user
  // 3) project the details
  const channelSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
      },
    },

    {
      $unwind: "$subscribers",
    },
    {
      $project: {
        "subscribers.username": 1,
        "subscribers.fullName": 1,
        "subscribers.avatar": 1,
      },
    },
  ]);
  console.log("channelSubscribers: ", channelSubscribers);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelSubscribers,
        "subscribers of this channel fetched successfully"
      )
    );
});

// Get the  subscribed channels of user
const getUserSubscribedChannels = asyncHandler(async (req, res) => {
  // 1) Match the logged In user
  // 2) lookup in user
  // 3) project the details
  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channels",
      },
    },
    {
      $unwind: "$channels",
    },
    {
      $project: {
        "channels.username": 1,
        "channels.avatar": 1,
        "channels.fullName": 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels[0],
        "subscribed channels successfully fetched"
      )
    );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getUserSubscribedChannels,
};
