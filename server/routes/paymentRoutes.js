const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createCheckoutSession,
  handleWebhook,
  createPortalSession,
  getSubscription,
} = require("../controllers/paymentController");

// Stripe webhook — must use raw body, registered in server.js BEFORE express.json()
router.post("/webhook", handleWebhook);

// Authenticated routes
router.post("/create-checkout-session", authMiddleware, createCheckoutSession);
router.post("/create-portal-session", authMiddleware, createPortalSession);
router.get("/subscription", authMiddleware, getSubscription);

module.exports = router;
