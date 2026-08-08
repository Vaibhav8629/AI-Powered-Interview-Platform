const Interview = require("../models/Interview")

const createInterview = async (req, res) => {
    const userData = req.user;
    try {
        const { role, experience, interviewType, difficulty, topics, numberOfQuestions, duration, questions, status } = req.body;

        const interview = await Interview.create({
            user: userData.userId,
            role, 
            experience, 
            interviewType, 
            difficulty, 
            topics, 
            numberOfQuestions, 
            duration, 
            questions, 
            status
        });

        res.status(200).json("Interview successfully created");

    } catch (error) {
        console.log(error);
    }

}

const getUserInterviews = async (req, res) => {
    const userData = req.user;
    try {
        const data = await Interview.find({
            user: userData.userId
        });

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ msg: "Error fetching interviews" });
    }
}

const getInterviewById = async (req, res) => {
  try {
    const interviewId = req.params.id;
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }
    res.status(200).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  }
};


module.exports = { createInterview, getUserInterviews, getInterviewById };