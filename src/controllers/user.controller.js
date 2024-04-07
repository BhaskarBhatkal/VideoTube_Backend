import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    throw new ApiError(400, "use is required");
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
  console.log("Avatar details from CLoudinary:", avatar);
  const coverImage = await uploadOnCloudinary(coverImageLocalFile);

  if (!avatar) {
    throw new ApiError(400, "avatar is required");
  }

  // 6
  // Creating user object in DB
  const user = await User.create({
    fullName,
    username: username.toLoweCase(),
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

export { registerUser };
