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
      $project: {
        name: 1,
        description: 1,
        owner: 1,
        videos: 1,
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

export { createPlaylist, addVideoToPlaylist, getUserPlaylists };
