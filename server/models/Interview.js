const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
    {

        user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
        },

        role: {
            type: String,
            requied: true,
        },

        experience:{
            type: String,
            requied: true,
        },

        interviewType:{
            type: String,
            requied: true,
        },

        difficulty:{
            type: String,
            requied: true,
        },

        topics:{
            type:[String],
            required:true,
        },

        numberOfQuestions: {
            type:Number,
            required:true,
            minimum : 5,
            maximum : 15
        },

        duration:{
            type:Number,
            required:true,
            minimum:10,
            maximum:90
        },

        questions: [],
            currentQuestion: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            default: "created"
        }

    },

    {
        timestamps: true,
    }

);

module.exports = mongoose.model("Interview", interviewSchema);