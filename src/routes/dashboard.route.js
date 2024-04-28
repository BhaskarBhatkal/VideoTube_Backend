import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getAllVideosOfChannel,
  getChannelStats,
} from "../controllers/dashboard.controller.js";

const router = Router();

// APPLY verifyJWT MIDDLEWARE TO ALL ROUTES IN THIS FILE
router.use(verifyJWT);

router.route("/stats").get(getChannelStats);

router.route("/videos").get(getAllVideosOfChannel);

export default router;
