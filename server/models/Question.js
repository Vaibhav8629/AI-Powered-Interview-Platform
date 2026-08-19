const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    problemId: {
      type: String,
      required: true,
      unique: true,
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
      index: true,
    },

    topics: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      required: true,
    },

    examples: {
      type: [
        {
          exampleNum: Number,
          exampleText: String,
        },
      ],
      default: [],
    },

    constraints: {
      type: [String],
      default: [],
    },

    codeSnippets: {
      type: Map,
      of: String,
      default: {},
    },

    leetcodeUrl: {
      type: String,
      required: true,
    },

    source: {
      type: String,
      default: "leetcode",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Question", questionSchema);