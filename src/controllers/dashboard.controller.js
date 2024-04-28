import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET USER STATS LIKE-- TOTAL LIKES, TOTAL VIEWS, TOTAL SUBSCRIBERS, TOTAL VIDEOS
const getChannelStats = asyncHandler(async (req, res) => {
  // 1) find all the videos based on owner
  // 2) then 1st look for likes, 2nd for subscribers
  // 3)
  const channelStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "Likes",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "owner",
        foreignField: "channel",
        as: "Subscribers",
      },
    },
    {
      $group: {
        // null : coz grouping all doc into single group
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
        totalSubscribers: { $first: { $size: "$Subscribers" } },
        totalLikes: { $first: { $size: "$Likes" } },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelStats[0],
        "channel stats successfully fetched"
      )
    );
});

// GET ALL THE VIDEOS OF USER(their own uploaded videos)
const getAllVideosOfChannel = asyncHandler(async (req, res) => {
  // 1) Match all videos based on owner & sort them in desc order
  // 2) Paginate all the videos
  // 3) Return result
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const videos = Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
  ]).sort({
    [`${sortType}`]: `${sortBy}`,
  });

  const options = {
    page,
    limit,
  };

  const allVideos = await Video.aggregatePaginate(
    videos,
    options,
    (err, result) => {
      if (err) {
        throw new ApiError(400, " video pagination failed");
      }
      return result;
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, allVideos, "videos successfully fetched "));
});

export { getChannelStats, getAllVideosOfChannel };
