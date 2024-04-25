import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// ADDING COMMENT TO VIDEO
const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video id is not valid");
  }

  if (!content) {
    throw new ApiError(400, "content cannot be empty");
  }

  const video = await Video.findById({ _id: videoId });

  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  const commentVideo = await Comment.create({
    content,
    video: video?._id,
    owner: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, commentVideo, "user successfully comment on video")
    );
});

// EDIT A COMMENT
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "video id is invalid");
  }

  try {
    const comment = await Comment.findById({ _id: commentId });

    if (comment?.owner !== req.user?._id) {
      throw new ApiError(400, "this user cannot edit the comment");
    }

    console.log(comment.owner);

    if (!content) {
      throw new ApiError(400, "content is required");
    }

    const updateCommentData = await Comment.findByIdAndUpdate(
      {
        _id: commentId,
      },
      {
        $set: {
          content,
        },
      },
      {
        new: true,
      }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, updateCommentData, "comment updated successfully")
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong cannot delete comment"
    );
  }
});

// DELETE A COMMENT
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment id is not valid");
  }

  try {
    const comment = await Comment.findById({ _id: commentId });

    if (comment?.owner !== req.user?._id) {
      throw new ApiError(400, "this user cannot delete the comment");
    }

    const commentDelete = await Comment.findByIdAndDelete({ _id: commentId });

    if (!commentDelete) {
      throw new ApiError(400, "comment not deleted");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "comment successfully deleted"));
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong cannot delete comment"
    );
  }
});

// GET ALL COMMENTS OF ONE SPECIFIC VIDEO
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video id is not valid");
  }

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
        as: "commentedBy",
      },
    },
    {
      $addFields: {
        commentedBy: {
          $first: "$commentedBy",
        },
      },
    },
  ]);

  const options = {
    page,
    limit,
  };

  const allComments = await Comment.aggregatePaginate(
    commentAggregate,
    options,
    (error, result) => {
      if (error) {
        throw new ApiError(
          400,
          error?.message || "cant paginate all the videos"
        );
      }
      return result;
    }
  );

  if (!allComments) {
    throw new ApiError(400, "Cannot get all the comments");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, allComments, "successfully fetched the all comments")
    );
});

export { addComment, updateComment, deleteComment, getVideoComments };
