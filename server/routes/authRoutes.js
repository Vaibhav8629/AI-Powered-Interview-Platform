const express = require("express");
const { registerUser, loginUser, getMe, googleAuth } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getMe);
router.post("/google", googleAuth);

module.exports = router;
