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

module.exports = {
  createInterview,
  getUserInterviews,
  getInterviewById,
  submitAnswer,
};
