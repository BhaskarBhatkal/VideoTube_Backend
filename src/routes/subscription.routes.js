import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getUserChannelSubscribers,
  getUserSubscribedChannels,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

// APPLY verifyJWT MIDDLEWARE TO ALL ROUTES IN THIS FILE
router.use(verifyJWT);

router.route("/c/:channelId").post(toggleSubscription);

router.route("/channel-subscribers").get(getUserChannelSubscribers);

router.route("/subscribed-channels").get(getUserSubscribedChannels);

export default router;
