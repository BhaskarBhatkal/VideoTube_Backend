import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";

// Playlist creation
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    throw new ApiError(400, "name and description cannot be empty");
  }

  const playlistData = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
    videos: [],
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlistData, "playlist successfully created"));
});

// Adding video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "playlistId and videoId is not valid");
  }

  const playlist = await Playlist.findById({ _id: playlistId });

  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }

  const video = await Video.findById({ _id: videoId });

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  await playlist.videos.push(videoId);
  const updatedPlaylist = await playlist.save();

  if (!updatedPlaylist) {
    throw new ApiError(400, "Playlist are not updated");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Successfully added the video to the playlist"
      )
    );
});

// accessing users playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User");
  }

  const userPlaylist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideo",
        pipeline: [
          {
            $project: {
              thumbnail: 1,
              title: 1,
              videoFile: 1,
              description: 1,
              duration: 1,
              views: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        description: 1,
        playlistVideo: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  if (!userPlaylist) {
    throw new ApiError(400, "PLaylist not founded");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, userPlaylist, "Successfully fetched the playlists")
    );
});

// accessing user playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideo",
        pipeline: [
          {
            $project: {
              thumbnail: 1,
              videoFile: 1,
              title: 1,
              description: 1,
              duration: 1,
              views: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        playlistVideo: 1,
      },
    },
  ]);

  if (!playlist.length === 0) {
    throw new ApiError(400, "playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully"));
});

// Removing video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!playlistId || !videoId) {
    throw new ApiError(400, "playlistId and videoid not found or invalid");
  }

  const playlist = await Playlist.findById({ _id: playlistId });
  if (!playlist) {
    throw new ApiError(400, "playlist not found");
  }

  const video = await Video.findById({ _id: videoId });
  if (!video) {
    throw new ApiError(200, "video not found");
  }

  await playlist.videos.remove(videoId);

  deletedVideoData = await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "video successfully removed from playlist"));
});

// Deleting playlist
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
  }

  const deletedData = await Playlist.findByIdAndDelete({ _id: playlistId });
  if (!deletedData) {
    throw new ApiError(400, "playlist does not deleted");
  }
});

// Update playlist details
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  if (!name || !description) {
    throw new ApiError(400, "name and decsription are required");
  }

  const playlist = await Playlist.findByIdAndUpdate(
    { _id: playlistId },
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist successfully updated"));
});

export {
  createPlaylist,
  addVideoToPlaylist,
  getUserPlaylists,
  getPlaylistById,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
