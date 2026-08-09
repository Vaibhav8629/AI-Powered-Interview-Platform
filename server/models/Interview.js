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

    numberOfQuestions: {
      type: Number,
      required: true,
      minimum: 5,
      maximum: 15,
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

    currentQuestion: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      default: "created",
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Interview", interviewSchema);
