const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const interviewController = require("../controllers/interviewController");

router.post("/create-interview", authMiddleware, interviewController.createInterview);
router.get("/my-interviews", authMiddleware, interviewController.getUserInterviews);
router.get("/interview/:id", authMiddleware, interviewController.getInterviewById);

module.exports = router;