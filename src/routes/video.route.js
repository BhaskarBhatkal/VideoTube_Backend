import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  updateVideoTumbnail,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// APPLY verifyJWT MIDDLEWARE TO ALL ROUTES IN THIS FILE
router.use(verifyJWT);

router.route("/publish-video").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishAVideo
);

router.route("/").get(getAllVideos);

router.route("/:videoId").get(getVideoById).patch(updateVideo);

router
  .route("/update/:videoId")
  .delete(deleteVideo)
  .patch(upload.single("thumbnail"), updateVideoTumbnail);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
