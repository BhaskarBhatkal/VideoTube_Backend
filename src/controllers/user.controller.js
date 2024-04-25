import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// ACCESS TOKEN AND REFRESH TOKEN
const generateAccessAndRefreshToken = async (userId) => {
  // Find the user
  try {
    const user = await User.findById(userId);
    // Generates accessToken
    const accessToken = user.generateAccessToken();
    // Generates refreshToken
    const refreshToken = user.generateRefreshToken();

    // Save refreshToken into Database and save it
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Something went wrong while generating Tokens"
    );
  }
};

// REGISTERING USER
const registerUser = asyncHandler(async (req, res) => {
  // 1) Get the user details from frontend
  // 2) Validation - shouldn't be empty
  // 3) Check if user already exist or not - check for username and email
  // 4) Check for images - Avatar
  // 5) Upload them to Cloudinary, and check for avatar
  // 6) Create user object - create entry in DB
  // 7) Remove password and refresh token field from response
  // 8) Check for user creation and return response to user

  // 1
  const { fullName, username, password, email } = req.body;
  // console.log("username is: ", username);

  // 2
  if (!fullName) {
    throw new ApiError(400, "fullname is required");
  }
  if (!username) {
    throw new ApiError(400, "user is required");
  }
  if (!password) {
    throw new ApiError(400, "password is required");
  }
  if (!email) {
    throw new ApiError(400, "email is required");
  }

  // 3
  const isUserExist = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserExist) {
    throw new ApiError(409, "username or email is already exist try different");
  }

  // 4
  //Accessing avatar and cover Image file path from the multer
  const avatarLocalFile = req.files?.avatar?.[0]?.path;
  const coverImageLocalFile = req.files?.coverImage?.[0]?.path;
  //   console.log("avatarLocalFile: ", avatarLocalFile);

  if (!avatarLocalFile) {
    throw new ApiError(400, "avatar is required");
  }
  // 5
  const avatar = await uploadOnCloudinary(avatarLocalFile);
  console.log("Avatar details from CLoudinary: ", avatar);
  const coverImage = await uploadOnCloudinary(coverImageLocalFile);

  if (!avatar) {
    throw new ApiError(400, "avatar is required");
  }

  // 6
  // Creating user object in DB
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 7
  // Removing few fields when, we want  send response to user
  // select() by default select all the fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, createdUser, "User successfully registered"));
});

// LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
  // 1) Get the user deatils from the Req.body - email or username and password
  // 2) Check is user exist or not
  // 3) Check for password- correct or not
  // 4) Access and refresh token
  // 5) Send cookie

  const { email, username, password } = req.body;
  console.log("username: ", username);

  if (!email && !username) {
    throw new ApiError(400, "username or email cannot be empty");
  }

  // Find the user which is in database use this query
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  // 3)
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "password incorrect");
  }

  // 4)
  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // By doing this frontend cannot be edit the cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  // 5)
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, refreshToken, accessToken },
        "user successfully logged in"
      )
    );
});

// LOGOUT THE USER
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: {
      refreshToken: 1, //this removes the field from the document
    },
  });

  // cookie securities
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user successfully logged out"));
});

// RE-ACCESSING TOKENS (when access token expires)
const refreshedAccessToken = asyncHandler(async (req, res) => {
  // 1) Get the current refreshToken from cookies if not, body
  // 2) Verify the current refreshToken and will get decodedToken
  // 3) Find the db doc using decodedToken
  // 4) Generate new accessToken and refreshToken
  // 5) Set cookie
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRETE
  );

  const user = await User.findById(decodedToken?._id);
  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "accessToken is refreshed"
      )
    );
});

// UPDATE USER PASSWORD
const changeCurrentPassword = asyncHandler(async (req, res) => {
  // 1) Get the password data from the body
  // 2) Check for both the passwrd - not empty
  // 3) Check is both password same -  shouldnt be same
  //  4) Find user document in db using req.user._id
  // 5) Check for old Password - correct password
  // 6) Add newPassword in password field and save it

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "fields cannot be empty");
  }
  if (oldPassword === newPassword) {
    throw new ApiError(400, "Password cannot be same");
  }

  const user = await User.findById(req.user?._id);
  console.log(user);
  const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isOldPasswordCorrect) {
    throw new ApiError(400, "old password not matching");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password successfully changed"));
});

// GET CURRENT USER
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user successfully fetched"));
});

// UPDATE ACCOUNT DETAILS
const updateAccountDetails = asyncHandler(async (req, res) => {
  // details from req.body
  // check - not empty
  // find the user and update the fullname and email field
  // retrun a response and remove the password from response using select()
  const { fullName, email } = req.body;

  if (!fullName) {
    throw new ApiError(400, "full name is required");
  }
  if (!email) {
    throw new ApiError(400, "email is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account details successfully updated"));
});

// UPDATE AVATAR
const updateAvatar = asyncHandler(async (req, res) => {
  // Get the avatarLocal file path from req.file.path
  // check for local path - not empty
  // upload to cloudinary and check for it
  // remove old file from the cloudinary
  // find the user and update avatar ans send res and remove password while send res to frontend using select()
  const avatarLocalFilePath = req.file?.path;
  if (!avatarLocalFilePath) {
    throw new ApiError(400, " avatar file is missing ");
  }

  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  if (!avatar) {
    throw new ApiError(
      400,
      " avatar is missing while uploading on cloudinary "
    );
  }

  if (req.user?.avatar) {
    // Get the old avatar publicId from the avatar url:(last one but excluding extention(.jpeg))
    const oldAvatarPublicId = req.user.avatar.split("/").pop().split(".")[0];
    await deleteFromCloudinary(oldAvatarPublicId);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar successfully updated"));
});

// UPDATE COVER IMAGE
const updateCoverImage = asyncHandler(async (req, res) => {
  // Get the cover image local  file path from req.file.path
  // check for local path - not empty
  // upload to cloudinary and check for it
  // remove old file from the cloudinary
  // find the user and update cover image and send res and remove password while send res to frontend using select()
  const coverImageLocalFilePath = req.file?.path;
  if (!coverImageLocalFilePath) {
    throw new ApiError(400, " cover image file is missing ");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);
  if (!coverImage) {
    throw new ApiError(
      400,
      " coverImage is missing while uploading on cloudinary "
    );
  }

  // Remove old cover image from cloudinary
  if (req.user?.coverImage) {
    // Get the old cover image publicId from the coverImage url:(last one but excluding extention(.jpeg))
    const oldCoverImagePublicId = await req.user?.coverImage
      .split("/")
      .pop()
      .split(".")[0];

    await deleteFromCloudinary(oldCoverImagePublicId);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image successfully updated"));
});

// GET USER CHANNEL PROFILE
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // 1) Find the username from the url(req.params)
  // 2) Check user - exit or not
  // 3) Use the aggregation pipeline to achieve the result-----
  // a) match the username
  // b) find the subscribers using lookup
  // c) FInd the the subscribedTo using lookup
  // d) count these two
  // e) give a isSubscribed statement to frontend(true or false)
  // f) project the fields
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      // 1st stage
      $match: {
        username: username?.toLowerCase(),
      },
    },

    {
      // 2nd stage
      $lookup: {
        from: "subscriptions",
        localField: "_id", //it refers to user actually
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // 3rd stage
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      //  4th stage
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },

        isSubscribed: {
          // Here it checks that, this loggedIn user exist within the object of $subscribers.subscriber
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // 5th stage
      // what all fields we want to send it to user
      $project: {
        username: 1,
        fullName: 1,
        coverImage: 1,
        avatar: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  console.log("aggregated Channels in getUserChannelProfile: ", channel);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "user channel successfully fetched")
    );
});

// GET USER WATCH HISTORY
const getWatchHistory = asyncHandler(async (req, res) => {
  // 1) Find the user using aggregate
  // 2) LookUp in videos and nested lookUp for video owner
  // 3) and project the user fileds (return only needed fields)
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    avatar: 1,
                    username: 1,
                    fullName: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch history successfully fetched"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshedAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
