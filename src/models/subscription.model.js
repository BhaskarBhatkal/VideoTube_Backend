import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      // The user who is subscribed
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      // The user, whom to subscribed
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
