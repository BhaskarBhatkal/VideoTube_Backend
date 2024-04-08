import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Access token and refresh token
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

// Registering user
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

// Login user
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

// Logout the user
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

const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1) Get the current refreshToken from cookies if not body
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
