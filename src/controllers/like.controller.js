import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// TOGGLE VIDEO-LIKE
const toggleVideoLike = asyncHandler(async (req, res) => {
  // 1) find the video id from req.params
  // 2) Find the Like document
  // 3) if doc found - delete that doc
  // 4) if doc not found - create a doc
  // 5) then save the it
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid video Id");
  }

  try {
    const likedVideoData = await Like.findOne({
      likedBy: req.user?._id,
      video: videoId,
    }).lean();

    let toggleLike;

    if (likedVideoData) {
      toggleLike = await Like.findByIdAndDelete(likedVideoData._id);
    } else {
      toggleLike = await Like.create({
        likedBy: req.user?._id,
        video: videoId,
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, toggleLike, "successfully toggle the like"));
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong cant like or remove the like"
    );
  }
});

// TOGGLE COMMENT-LIKE
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "comment Id not valid");
  }

  try {
    const likedCommentData = await Like.findOne({
      comment: commentId,
      likedBy: req.user?._id,
    }).lean();

    let toggleLike;

    if (likedCommentData) {
      toggleLike = await Like.findByIdAndDelete(likedCommentData._id);
    } else {
      toggleLike = await Like.create({
        likedBy: req.user?._id,
        comment: commentId,
      });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          toggleLike,
          " successfully toggle the comment like "
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || " Something went wrong ");
  }
});

// GET LIKED VIDEOS
const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideo = await Like.find({ likedBy: req.user?._id }).populate({
    path: "video",
    select: "title thumbnail videoFile duration",
  });

  if (!likedVideo) {
    throw new ApiError(400, "No liked videos found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideo, "Liked videos successfully fetched")
    );
});

export { toggleVideoLike, toggleCommentLike, getLikedVideos };
