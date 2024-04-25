import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  getUserPlaylists,
} from "../controllers/playlist.controller.js";

const router = Router();

// APPLY verifyJWT MIDDLEWARE TO ALL ROUTES IN THIS FILE
router.use(verifyJWT);

router.route("/").post(createPlaylist);

router
  .route("/add/:videoId/661d2335f491801775d5d023:playlistId")
  .patch(addVideoToPlaylist);

router.route("/:userId").get(getUserPlaylists);

export default router;
