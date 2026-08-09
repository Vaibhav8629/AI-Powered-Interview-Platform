const Interview = require("../models/Interview");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const createInterview = async (req, res) => {
  const userData = req.user;
  try {
    const {
      role,
      experience,
      interviewType,
      difficulty,
      topics,
      numberOfQuestions,
      duration,
      questions,
      status,
    } = req.body;

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
      status,
    });

    res.status(200).json("Interview successfully created");
  } catch (error) {
    console.log(error);
  }
};

const getUserInterviews = async (req, res) => {
  const userData = req.user;
  try {
    const data = await Interview.find({
      user: userData.userId,
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ msg: "Error fetching interviews" });
  }
};

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

const submitAnswer = async (req, res) => {
    try {
        const { questionId, answer } = req.body;

        // 1. Find interview belonging to logged-in user
        const interview = await Interview.findOne({
            _id: req.params.interviewId,
            user: req.user.userId
        });

        if (!interview) {
            return res.status(404).json({
                message: "Interview not found"
            });
        }


        // 2. Find specific question
        const question = interview.questions.id(questionId);

        if (!question) {
            return res.status(404).json({
                message: "Question not found"
            });
        }


        // 3. Save user's answer
        question.answer = answer;


        // 4. Send question + answer to Gemini
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
                        feedback: {
                            type: "string"
                        },
                        score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 10
                        }
                    },
                    required: ["feedback", "score"]
                }
            }
        });


        // 5. Parse AI response
        const result = JSON.parse(response.text);


        // 6. Save AI feedback + score
        question.feedback = result.feedback;
        question.score = result.score;


        // 7. Save everything
        await interview.save();


        // 8. Send feedback to frontend
        return res.status(200).json({
            message: "Answer evaluated successfully",

            feedback: result.feedback,

            score: result.score
        });

    } catch (error) {

        console.error("Submit answer error:", error);

        return res.status(500).json({
            message: "Error evaluating answer"
        });
    }
};

const getNextQuestion = async (req, res) => {
    try {
        const interview = await Interview.findOne({
            _id: req.params.interviewId,
            user: req.user.userId
        });

        if (!interview) {
            return res.status(404).json({
                message: "Interview not found"
            });
        }

        // Check if all questions are completed
        if (interview.currentQuestion >= interview.questions.length - 1) {
            return res.status(400).json({
                message: "No more questions available"
            });
        }

        // Move to next question
        interview.currentQuestion += 1;

        await interview.save();

        const question =
            interview.questions[interview.currentQuestion];

        return res.status(200).json({
            message: "Next question fetched",
            question
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error fetching next question"
        });
    }
};

const completeInterview = async (req, res) => {
    try {
        const interview = await Interview.findOne({
            _id: req.params.interviewId,
            user: req.user.userId
        });

        if (!interview) {
            return res.status(404).json({
                message: "Interview not found"
            });
        }

        if (interview.status === "completed") {
            return res.status(400).json({
                message: "Interview already completed"
            });
        }

        // Make sure all questions have been answered
        const unansweredQuestion = interview.questions.find(
            q => !q.answer || q.answer.trim() === ""
        );

        if (unansweredQuestion) {
            return res.status(400).json({
                message: "All questions must be answered first"
            });
        }

        interview.status = "completed";
        interview.completedAt = new Date();

        await interview.save();

        return res.status(200).json({
            message: "Interview completed successfully",
            interviewId: interview._id
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error completing interview"
        });
    }
};

const getInterviewResult = async (req, res) => {
    try {
        const interview = await Interview.findOne({
            _id: req.params.interviewId,
            user: req.user.userId
        });

        if (!interview) {
            return res.status(404).json({
                message: "Interview not found"
            });
        }

        if (interview.status !== "completed") {
            return res.status(400).json({
                message: "Interview is not completed yet"
            });
        }

        const questions = interview.questions;

        const totalQuestions = questions.length;

        const totalScore = questions.reduce(
            (sum, question) => sum + (question.score || 0),
            0
        );

        const maxScore = totalQuestions * 10;

        const averageScore =
            totalQuestions > 0
                ? totalScore / totalQuestions
                : 0;

        const percentage =
            maxScore > 0
                ? (totalScore / maxScore) * 100
                : 0;

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

            questions: questions.map(q => ({
                questionId: q._id,
                question: q.question,
                answer: q.answer,
                feedback: q.feedback,
                score: q.score
            }))
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error fetching interview result"
        });
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
};
