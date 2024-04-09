import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // 1) Get the accessToken from cookies also look out for accessToken from header
  // ) verify accessToken and get the decodedToken(it will have details of user i.e id,username)
  // 3) Do a part ways using select function
  // 4) Set the req.user = user
  try {
    // 1)
    const token =
      req.cookies?.accessToken ||
      req.header("Autherization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Unautherized request");
    }

    // 2)
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE);
    console.log("Decoded token is: ", decodedToken);

    // 3)
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(400, "Invalid Access token");
    }

    // 4)
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong");
  }
});
