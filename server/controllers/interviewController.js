const Interview = require("../models/Interview");
const User = require("../models/User");
const { GoogleGenAI } = require("@google/genai");
const {
  calculateInterviewCost,
  resetMonthlyCreditsIfNeeded,
  hasEnoughCredits,
  deductCredits,
} = require("../services/creditService");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Question generation (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const fallbackQuestionSets = {
  "Frontend Developer": [
    "Explain how you would optimize a React component that re-renders frequently.",
    "How do you manage state in a medium-sized frontend application?",
    "Describe your approach to responsive design and accessibility.",
  ],
  "Backend Developer": [
    "How do you design a REST API for scalability and maintainability?",
    "Explain how you would secure a Node.js and Express application.",
    "How do you handle validation and error handling in backend services?",
  ],
  "Full Stack Developer": [
    "Walk through how data flows from a React UI to a MongoDB database.",
    "How do you keep frontend and backend contracts in sync?",
    "Describe a full stack debugging process for a production issue.",
  ],
};

const buildFallbackQuestions = ({ role, topics, numberOfQuestions }) => {
  const roleQuestions = fallbackQuestionSets[role] || [
    "Tell me about a project that best represents your experience for this role.",
    "How do you approach solving unfamiliar technical problems?",
    "Describe a time you had to learn or adapt quickly in a project.",
  ];

  const topicQuestions =
    Array.isArray(topics) && topics.length > 0
      ? topics.map(
          (topic) =>
            `Explain your understanding of ${topic} and where you have used it.`
        )
      : [];

  const combined = [...roleQuestions, ...topicQuestions];
  const questions = [];

  for (let index = 0; index < numberOfQuestions; index += 1) {
    questions.push({
      question: combined[index % combined.length] || `Question ${index + 1}`,
      answer: "",
      feedback: "",
      score: null,
    });
  }
  return questions;
};

const generateQuestions = async ({
  role,
  experience,
  interviewType,
  difficulty,
  topics,
  numberOfQuestions,
}) => {
  const prompt = `
Generate ${numberOfQuestions} interview questions for a ${role} candidate.
Experience level: ${experience}
Interview type: ${interviewType}
Difficulty: ${difficulty}
Topics: ${(topics || []).join(", ")}

Return concise questions only.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: { question: { type: "string" } },
                required: ["question"],
              },
            },
          },
          required: ["questions"],
        },
      },
    });

    const parsed = JSON.parse(response.text);
    if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
      return parsed.questions
        .slice(0, numberOfQuestions)
        .map((item) => ({ question: item.question, answer: "", feedback: "", score: null }));
    }
  } catch (error) {
    console.warn("Question generation fell back to templates:", error.message);
  }

  return buildFallbackQuestions({ role, topics, numberOfQuestions });
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE INTERVIEW — now includes credit check + deduction
// ─────────────────────────────────────────────────────────────────────────────

const createInterview = async (req, res) => {
  try {
    const {
      role,
      experience,
      interviewType,
      difficulty,
      topics,
      numberOfQuestions,
      duration,
      status,
    } = req.body;

    // 1. Validate required fields
    if (
      !role ||
      !experience ||
      !interviewType ||
      !difficulty ||
      !Array.isArray(topics) ||
      topics.length === 0 ||
      !numberOfQuestions ||
      !duration
    ) {
      return res.status(400).json({
        success: false,
        message: "All interview configuration fields are required.",
      });
    }

    // 2. Calculate credit cost on the backend — never trust the frontend
    let creditCost;
    try {
      creditCost = calculateInterviewCost(numberOfQuestions);
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }

    // 3. Fetch the user document (we need the live credit balance)
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 4. Apply monthly credit reset if it's due
    const { reset } = resetMonthlyCreditsIfNeeded(user);
    // We'll save after the interview is created to keep it in one write

    // 5. Check credit balance
    if (!hasEnoughCredits(user, creditCost)) {
      // Save any reset that happened even though we're rejecting
      if (reset) await user.save();

      return res.status(402).json({
        success: false,
        message: "Insufficient credits",
        requiredCredits: creditCost,
        availableCredits: user.credits,
      });
    }

    // 6. Generate questions (can fail — do this BEFORE deducting credits)
    const questions = await generateQuestions({
      role,
      experience,
      interviewType,
      difficulty,
      topics,
      numberOfQuestions,
    });

    // 7. Deduct credits (in memory only — not saved yet)
    deductCredits(user, creditCost);

    // 8. Create interview document
    const interview = await Interview.create({
      user: req.user.userId,
      role,
      experience,
      interviewType,
      difficulty,
      topics,
      numberOfQuestions,
      duration,
      questions,
      status,
    });

    // 9. Save the updated credit balance (after interview is created successfully)
    await user.save();

    return res.status(201).json({
      success: true,
      interviewId: interview._id,
      interview,
      creditsUsed: creditCost,
      creditsRemaining: user.credits,
    });
  } catch (error) {
    console.error("createInterview error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating interview",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Remaining controllers — all unchanged
// ─────────────────────────────────────────────────────────────────────────────

const getUserInterviews = async (req, res) => {
  try {
    const data = await Interview.find({ user: req.user.userId });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ msg: "Error fetching interviews" });
  }
};

const getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (String(interview.user) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "You do not have access to this interview" });
    }

    return res.status(200).json({ success: true, interview });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const question = interview.questions.id(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    question.answer = answer;

    const prompt = `
You are an AI technical interviewer.

Evaluate the candidate's answer to the interview question.

Question:
${question.question}

Candidate's Answer:
${answer}

Evaluate the answer based on:
1. Correctness
2. Technical understanding
3. Completeness
4. Clarity

Give a score from 0 to 10.

Give concise and constructive feedback.
Do not be overly harsh.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            feedback: { type: "string" },
            score: { type: "integer", minimum: 0, maximum: 10 },
          },
          required: ["feedback", "score"],
        },
      },
    });

    const result = JSON.parse(response.text);
    question.feedback = result.feedback;
    question.score = result.score;

    await interview.save();

    return res.status(200).json({
      message: "Answer evaluated successfully",
      feedback: result.feedback,
      score: result.score,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return res.status(500).json({ message: "Error evaluating answer" });
  }
};

const getNextQuestion = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (interview.currentQuestion >= interview.questions.length - 1) {
      return res.status(400).json({ message: "No more questions available" });
    }

    interview.currentQuestion += 1;
    await interview.save();

    const question = interview.questions[interview.currentQuestion];

    return res.status(200).json({ message: "Next question fetched", question });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching next question" });
  }
};

const completeInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (interview.status === "completed") {
      return res.status(400).json({ message: "Interview already completed" });
    }

    const unansweredQuestion = interview.questions.find(
      (q) => !q.answer || q.answer.trim() === ""
    );

    if (unansweredQuestion) {
      return res.status(400).json({ message: "All questions must be answered first" });
    }

    interview.status = "completed";
    interview.completedAt = new Date();

    await interview.save();

    return res.status(200).json({
      message: "Interview completed successfully",
      interviewId: interview._id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error completing interview" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TERMINATE INTERVIEW DUE TO CHEATING
// ─────────────────────────────────────────────────────────────────────────────

const terminateCheating = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    // Already terminated or completed — idempotent, just acknowledge
    if (interview.status === "terminated" || interview.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Interview already finalised",
        status: interview.status,
      });
    }

    const {
      tabSwitchCount = 0,
      fullscreenExitCount = 0,
      copyAttemptCount = 0,
      pasteAttemptCount = 0,
      cutAttemptCount = 0,
      violations = [],
      terminationReason = "UNKNOWN",
    } = req.body;

    const toSafeInt = (val) => Math.max(0, Math.floor(Number(val) || 0));

    const ALLOWED_TYPES = new Set([
      "TAB_SWITCH",
      "FULLSCREEN_EXIT",
      "COPY_ATTEMPT",
      "PASTE_ATTEMPT",
      "CUT_ATTEMPT",
    ]);

    const sanitizedViolations = Array.isArray(violations)
      ? violations
          .filter((v) => v && ALLOWED_TYPES.has(v.type) && v.timestamp)
          .map((v) => ({ type: v.type, timestamp: new Date(v.timestamp) }))
          .slice(0, 500)
      : [];

    const now = new Date();

    interview.status = "terminated";
    interview.antiCheating = {
      tabSwitchCount:      toSafeInt(tabSwitchCount),
      fullscreenExitCount: toSafeInt(fullscreenExitCount),
      copyAttemptCount:    toSafeInt(copyAttemptCount),
      pasteAttemptCount:   toSafeInt(pasteAttemptCount),
      cutAttemptCount:     toSafeInt(cutAttemptCount),
      violations:          sanitizedViolations,
      terminationReason:   String(terminationReason),
      terminatedAt:        now,
      submittedAt:         now,
    };

    await interview.save();

    console.log(`Interview ${interview._id} terminated for cheating — reason: ${terminationReason}`);

    return res.status(200).json({
      success: true,
      message: "Interview terminated due to cheating",
      terminationReason,
    });
  } catch (error) {
    console.error("terminateCheating error:", error);
    return res.status(500).json({ success: false, message: "Error terminating interview" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SAVE ANTI-CHEATING SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

const saveAntiCheating = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    const {
      tabSwitchCount = 0,
      fullscreenExitCount = 0,
      copyAttemptCount = 0,
      pasteAttemptCount = 0,
      cutAttemptCount = 0,
      violations = [],
    } = req.body;

    // Validate and sanitize counts — reject negative numbers or non-integers
    const toSafeInt = (val) => Math.max(0, Math.floor(Number(val) || 0));

    // Normalize violation entries — keep only known types and valid timestamps
    const ALLOWED_TYPES = new Set([
      "TAB_SWITCH",
      "FULLSCREEN_EXIT",
      "COPY_ATTEMPT",
      "PASTE_ATTEMPT",
      "CUT_ATTEMPT",
    ]);

    const sanitizedViolations = Array.isArray(violations)
      ? violations
          .filter((v) => v && ALLOWED_TYPES.has(v.type) && v.timestamp)
          .map((v) => ({
            type: v.type,
            timestamp: new Date(v.timestamp),
          }))
          .slice(0, 500) // hard cap — prevents abuse
      : [];

    interview.antiCheating = {
      tabSwitchCount:    toSafeInt(tabSwitchCount),
      fullscreenExitCount: toSafeInt(fullscreenExitCount),
      copyAttemptCount:  toSafeInt(copyAttemptCount),
      pasteAttemptCount: toSafeInt(pasteAttemptCount),
      cutAttemptCount:   toSafeInt(cutAttemptCount),
      violations:        sanitizedViolations,
      submittedAt:       new Date(),
    };

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Anti-cheating summary saved",
      antiCheating: interview.antiCheating,
    });
  } catch (error) {
    console.error("saveAntiCheating error:", error);
    return res.status(500).json({ success: false, message: "Error saving anti-cheating data" });
  }
};

const getInterviewResult = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (interview.status !== "completed") {
      return res.status(400).json({ message: "Interview is not completed yet" });
    }

    const questions = interview.questions;
    const totalQuestions = questions.length;
    const totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);
    const maxScore = totalQuestions * 10;
    const averageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return res.status(200).json({
      interviewId: interview._id,
      role: interview.role,
      difficulty: interview.difficulty,
      totalQuestions,
      totalScore,
      maxScore,
      averageScore: Number(averageScore.toFixed(2)),
      percentage: Number(percentage.toFixed(2)),
      completedAt: interview.completedAt,
      questions: questions.map((q) => ({
        questionId: q._id,
        question: q.question,
        answer: q.answer,
        feedback: q.feedback,
        score: q.score,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching interview result" });
  }
};

module.exports = {
  createInterview,
  getUserInterviews,
  getInterviewById,
  submitAnswer,
  getNextQuestion,
  completeInterview,
  getInterviewResult,
  saveAntiCheating,
  terminateCheating,
};
