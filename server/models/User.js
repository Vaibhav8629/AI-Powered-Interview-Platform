const mongoose = require("mongoose");

const PLAN_CREDITS = {
  free: 10,
  standard: 50,
  premium: 100,
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // ── Credit system ──────────────────────────────────────────────
    credits: {
      type: Number,
      default: 10,
      min: 0,
    },

    creditsResetAt: {
      type: Date,
      default: () => new Date(),
    },

    // ── Subscription / plan ────────────────────────────────────────
    plan: {
      type: String,
      enum: ["free", "standard", "premium"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "past_due", "canceled", "trialing"],
      default: "inactive",
    },

    stripeCustomerId: {
      type: String,
      default: null,
      index: { sparse: true },
    },

    stripeSubscriptionId: {
      type: String,
      default: null,
      index: { sparse: true },
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    // ── Idempotency: track processed Stripe webhook event IDs so duplicate
    //    deliveries are ignored even if the same payment is retried.
    processedWebhookEvents: {
      type: [String],
      default: [],
      select: false,
    },

    // Backward-compatible legacy field kept for older records.
    processedCheckoutSessions: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.statics.planCredits = function (plan) {
  return PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
};

module.exports = mongoose.model("User", userSchema);
module.exports.PLAN_CREDITS = PLAN_CREDITS;
