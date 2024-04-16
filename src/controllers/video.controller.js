import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Publishing videos
const publishAVideo = asyncHandler(async (req, res) => {
  // 1) get the title and description from body
  // 2) get video and thumbnail filepath from req.files.path
  // 3) check for all these 4 properties are empty or not
  // 4) uplaod files to cloudinary
  // 5) check for files uploaded to cloudiary or not
  // 6) Create a video object in database

  const { title, description } = req.body;

  try {
    const videoFileLocal = req.files?.videoFile?.[0].path;
    const thumbnailLocal = req.files?.thumbnail?.[0].path;

    if (!videoFileLocal || !thumbnailLocal) {
      throw new ApiError(400, "video and  thumbnail both required");
    }

    console.log("video file local: ", videoFileLocal);

    if (!title || !description) {
      throw new ApiError(400, "title and description required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocal);
    // console.log("videoFile CLoudinary: ", videoFile);
    const thumbnail = await uploadOnCloudinary(thumbnailLocal);

    if (!videoFile) {
      throw new ApiError(400, "Video is required");
    }

    if (!thumbnail) {
      throw new ApiError(400, "thubnail is required");
    }

    const video = await Video.create({
      title,
      description,
      videoFile: videoFile.url,
      thumbnail: thumbnail.url,
      duration: videoFile.duration,
      owner: req.user?._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, video, "video has been successfully published")
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong from server side"
    );
  }
});

// Get all videos of loggedin user
const getAllVideos = asyncHandler(async (req, res) => {
  // 1) find these in req.query
  // 2) get all video which match loggedIn user and sort them in descending order
  // 3) Paginate the video(it used to display the large sts of data into small chunks)
  // 4) return results
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

  const data = await Video.aggregatePaginate(videos, options, (err, reslut) => {
    if (err) {
      throw new ApiError(400, "vidoes not fetched");
    }
    return reslut;
  });

  console.log("user all videos: ", data);

  return res
    .status(200)
    .json(new ApiResponse(200, data, "videos fetched successfully"));
});

// get video
const getVideoById = asyncHandler(async (req, res) => {
  // 1) find video id - params
  // 2) find video - using videoId
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is not valid");
  }

  const video = await Video.findById({ _id: videoId });
  if (!video) {
    throw new ApiError(400, "video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video successfully fetched"));
});

// Update video
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is not valid");
  }

  if (!title || !description) {
    throw new ApiError(400, "title and description cannot be empty");
  }
  const updatedVideoData = await Video.findByIdAndUpdate(
    { _id: videoId },
    {
      $set: {
        title,
        description,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideoData, "video  successfully updated")
    );
});

// Update thumbnail
const updateVideoTumbnail = asyncHandler(async (req, res) => {
  // 1) thumbnailid - params
  // 2) check it
  // 3) thumbnail localfile path - req.file
  // 4) check for that -
  // 5) upload it to cloudinary
  // 6) again check for thumbnail
  // 7) delete old thumbnail from cloudinary
  // 8) update it to the database
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video is not valid");
  }

  const thumbnailLocalFile = req.file?.thumbnail?.[0].path;
  if (!thumbnailLocalFile) {
    throw new ApiError(400, "thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalFile);
  if (!thumbnail) {
    throw new ApiError(400, "thumbnail is required");
  }

  if (req.user?.thumbnail) {
    thumbnailPublicId = req.user.thumbnail.split("/").pop().split(".")[0];
    await deleteFromCloudinary(oldAvatarPublicId);
  }

  const updateVideoData = await Video.findByIdAndUpdate(
    { _id: videoId },
    {
      $set: {
        thumbnail: thumbnail.url,
      },
    },
    {
      new: true,
    }
  );

  return (
    res.status(200),
    json(200, updateVideoData, "video thumbnail successfully updated")
  );
});

// Deleting a video
const deleteVideo = asyncHandler(async (req, res) => {
  // 1) find a video id from params
  // 2) check is video id is valid
  // 3) delete video using its video
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video Id is not valid");
  }

  const isVideoDelete = await Video.findByIdAndDelete({ _id: videoId });
  if (!isVideoDelete) {
    throw new ApiError(400, "Video not deleted");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video successfully deleted"));
});

// toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }
  const video = await Video.findById({ _id: videoId });

  if (!video) {
    throw new ApiError(400, "video not found");
  }

  //it will toggles the result either true nor false
  const isPublished = !video.isPublished;

  const togglePublish = await Video.findByIdAndDelete(
    { _id: videoId },
    {
      $set: {
        isPublished: isPublished,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, togglePublish, "toggle status successfully updated")
    );
});

export {
  publishAVideo,
  deleteVideo,
  getAllVideos,
  getVideoById,
  togglePublishStatus,
  updateVideo,
  updateVideoTumbnail,
};
