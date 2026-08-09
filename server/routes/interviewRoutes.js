const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const interviewController = require("../controllers/interviewController");

router.post(
  "/create-interview",
  authMiddleware,
  interviewController.createInterview,
);
router.get(
  "/my-interviews",
  authMiddleware,
  interviewController.getUserInterviews,
);
router.get(
  "/interview/:id",
  authMiddleware,
  interviewController.getInterviewById,
);
router.post(
  "/interview/:interviewId/answer",
  authMiddleware,
  interviewController.submitAnswer,
);
router.post(
  "/interview/:interviewId/next-question",
  authMiddleware,
  interviewController.getNextQuestion,
);
router.post(
    "/interview/:interviewId/complete",
    authMiddleware,
    interviewController.completeInterview
);
router.get(
    "/interview/:interviewId/result",
    authMiddleware,
    interviewController.getInterviewResult
);
module.exports = router;
