const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      required: true,
    },

    experience: {
      type: String,
      required: true,
    },

    interviewType: {
      type: String,
      required: true,
    },

    difficulty: {
      type: String,
      required: true,
    },

    topics: {
      type: [String],
      required: true,
    },

    resumeContent: {
      type: String,
      default: null,
    },

    numberOfQuestions: {
      type: Number,
      required: true,
      minimum: 5,
      maximum: 10,
    },

    duration: {
      type: Number,
      required: true,
      minimum: 10,
      maximum: 90,
    },

    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        answer: {
          type: String,
          default: "",
        },
        feedback: {
          type: String,
          default: "",
        },
        score: {
          type: Number,
          default: null,
        },
      },
    ],

    feedback: {
      type: {
        overallScore: {
          type: Number,
          default: 0,
        },
        confidenceScore: {
          type: Number,
          default: 0,
        },
        correctnessScore: {
          type: Number,
          default: 0,
        },
        communicationScore: {
          type: Number,
          default: 0,
        },
        questionWiseFeedback: [
          {
            questionNumber: Number,
            question: String,
            feedback: String,
            score: Number,
          },
        ],
        overallSummary: {
          type: String,
          default: "",
        },
        generatedAt: {
          type: Date,
          default: null,
        },
      },
      default: null,
    },

    currentQuestion: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      default: "created",
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // ── Anti-cheating ──────────────────────────────────────────────────────
    antiCheating: {
      tabSwitchCount:      { type: Number, default: 0 },
      fullscreenExitCount: { type: Number, default: 0 },
      copyAttemptCount:    { type: Number, default: 0 },
      pasteAttemptCount:   { type: Number, default: 0 },
      cutAttemptCount:     { type: Number, default: 0 },
      violations: [
        {
          type:      { type: String, required: true },
          timestamp: { type: Date,   required: true },
          _id:       false,
        },
      ],
      terminationReason: { type: String, default: null }, // e.g. "COPY_ATTEMPT"
      terminatedAt:      { type: Date,   default: null },
      submittedAt:       { type: Date,   default: null },
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Interview", interviewSchema);
