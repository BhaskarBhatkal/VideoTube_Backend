import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";

const router = Router();

// APPLY verifyJWT MIDDLEWARE TO ALL ROUTES IN THIS FILE
router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(toggleVideoLike);

router.route("/toggle/v/:commentId").post(toggleCommentLike);

router.route("/videos").get(getLikedVideos);

export default router;
