const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const { resetMonthlyCreditsIfNeeded } = require("../services/creditService");

// GET /api/user/credits — returns current credit balance + plan info
router.get("/credits", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "credits creditsResetAt plan subscriptionStatus currentPeriodEnd"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { reset } = resetMonthlyCreditsIfNeeded(user);
    if (reset) await user.save();

    return res.status(200).json({
      success: true,
      credits: user.credits,
      creditsResetAt: user.creditsResetAt,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      planAllowance: User.planCredits(user.plan),
    });
  } catch (error) {
    console.error("GET /api/user/credits error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
