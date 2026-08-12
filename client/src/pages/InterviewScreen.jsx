import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../services/api";

/**
 * AI Smart Interview — Full-screen Interview Screen
 * Single-file React component. Plain CSS-in-JS via a <style> tag (no Tailwind).
 * Replace the placeholder <img src="/interviewer-image.jpg" /> with your real asset.
 *
 * Layout: exact 50/50 split, no outer wrapping card.
 * LEFT  = full-bleed interviewer image (50vw x 100vh)
 * RIGHT = independent workspace (status card, question, answer, feedback)
 */

// questionTime (seconds) can later come from interview config/API per question.
// Falls back to 120s (2:00) if a question doesn't specify one.
const DEFAULT_QUESTION_TIME = 120;
function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function normalizeQuestion(question, index) {
  return {
    id: question?._id || index + 1,
    text: question?.question || question?.text || `Question ${index + 1}`,
    answer: question?.answer || "",
    questionTime: question?.questionTime || DEFAULT_QUESTION_TIME,
    feedback: question?.feedback || "",
    score: question?.score ?? null,
  };
}

export default function InterviewScreen() {
  const { id } = useParams();
  const [interview, setInterview] = useState(null);
  const [loadingInterview, setLoadingInterview] = useState(Boolean(id));
  const [interviewError, setInterviewError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const interviewQuestions = Array.isArray(interview?.questions)
    ? interview.questions.map((question, index) => normalizeQuestion(question, index))
    : [];

  const currentQuestion = interviewQuestions[currentIndex] || null;
  const allottedTime = currentQuestion?.questionTime || DEFAULT_QUESTION_TIME;
  const isLast = currentIndex === Math.max(interviewQuestions.length - 1, 0);

  const [secondsLeft, setSecondsLeft] = useState(allottedTime);
  const intervalRef = useRef(null);

  // Reset + restart countdown whenever the active question changes.
  useEffect(() => {
    setSecondsLeft(allottedTime);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, allottedTime]);

  // Handle timeout (0:00 reached) — placeholder hook for auto-advance / lock input, etc.
  useEffect(() => {
    if (secondsLeft === 0) {
      // Time's up for this question. Extend here (e.g. auto-submit) as needed.
    }
  }, [secondsLeft]);

  const handleAnswerChange = (value) => {
    setCurrentAnswer(value);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = value;
      return next;
    });
  };

  const handleNextQuestion = useCallback(async () => {
    if (!currentQuestion || submittingAnswer) {
      return;
    }

    setSubmittingAnswer(true);
    setInterviewError("");

    try {
      if (currentAnswer.trim()) {
        await api.post(`/api/interview/${id}/answer`, {
          questionId: currentQuestion.id,
          answer: currentAnswer,
        });
      }

      if (isLast) {
        await api.post(`/api/interview/${id}/complete`);
        setInterview((prev) => (prev ? { ...prev, status: "completed" } : prev));
        return;
      }

      await api.post(`/api/interview/${id}/next-question`);
      setCurrentIndex((prev) => Math.min(prev + 1, interviewQuestions.length - 1));
    } catch (error) {
      setInterviewError(getApiErrorMessage(error, "Unable to submit answer."));
    } finally {
      setSubmittingAnswer(false);
    }
  }, [currentAnswer, currentQuestion, id, interviewQuestions.length, isLast, submittingAnswer]);

  // Urgency styling thresholds
  const urgency =
    secondsLeft <= 10 ? "critical" : secondsLeft <= 30 ? "low" : "normal";

  const progressRatio = allottedTime > 0 ? secondsLeft / allottedTime : 0;
  const ringDegrees = Math.max(0, Math.min(360, progressRatio * 360));

  useEffect(() => {
    if (!id) {
      setInterview(null);
      setInterviewError("Unable to load interview details.");
      setLoadingInterview(false);
      return;
    }

    let active = true;

    const loadInterview = async () => {
      setLoadingInterview(true);
      setInterviewError("");

      try {
        const response = await api.get(`/api/interview/${id}`);
        const data = response?.data?.interview || response?.data?.data || response?.data || null;

        if (!active) {
          return;
        }

        setInterview(data);
        const questions = Array.isArray(data?.questions)
          ? data.questions.map((question, index) => normalizeQuestion(question, index))
          : [];
        const nextIndex = Math.min(Number(data?.currentQuestion || 0), Math.max(questions.length - 1, 0));
        setCurrentIndex(nextIndex);
        setAnswers(questions.map((question) => question.answer || ""));
        setCurrentAnswer(questions[nextIndex]?.answer || "");
      } catch (error) {
        if (!active) {
          return;
        }

        setInterview(null);
        setInterviewError(getApiErrorMessage(error, "Unable to load interview details."));
      } finally {
        if (active) {
          setLoadingInterview(false);
        }
      }
    };

    loadInterview();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    setCurrentAnswer(answers[currentIndex] || "");
  }, [answers, currentIndex]);

  const interviewTopics = Array.isArray(interview?.topics) ? interview.topics : [];

  return (
    <div className="ai-interview-screen">
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          margin: 0;
          padding: 0;
        }

        .ai-interview-screen {
          width: 100vw;
          height: 100vh;
          display: flex;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, sans-serif;
          overflow: hidden;
        }

        /* ---------- LEFT: FULL-BLEED INTERVIEWER IMAGE ---------- */
        .interview-left {
          width: 50vw;
          height: 100vh;
          flex-shrink: 0;
          background: #e5e7eb;
        }

        .interview-left img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ---------- RIGHT: INDEPENDENT WORKSPACE ---------- */
        .interview-right {
          width: 50vw;
          height: 100vh;
          background: #f7f8f9;
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
          position: relative;
        }

        .right-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .interview-info {
          flex: 1;
          min-width: 0;
          background: linear-gradient(180deg, #ffffff 0%, #f8fffc 100%);
          border: 1px solid #d1fae5;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 1px 8px rgba(15, 23, 42, 0.04);
        }

        .interview-info.loading,
        .interview-info.error {
          display: flex;
          align-items: center;
          min-height: 88px;
          font-size: 13px;
          color: #6b7280;
        }

        .interview-info.error {
          color: #b45309;
          background: #fffbeb;
          border-color: #fcd34d;
        }

        .interview-role {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.15;
          color: #059669;
          margin: 0;
        }

        .interview-meta {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 10px;
          font-size: 12.5px;
          color: #374151;
        }

        .interview-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .interview-difficulty {
          margin-top: 6px;
          font-size: 12.5px;
          color: #374151;
        }

        .interview-difficulty strong,
        .interview-topics-label {
          color: #065f46;
          font-weight: 600;
        }

        .interview-topics {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }

        .interview-topics-label {
          font-size: 12.5px;
          margin-right: 2px;
        }

        .interview-topic-chip {
          display: inline-flex;
          align-items: center;
          border-radius: 9999px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
        }

        /* ---------- STATUS CARD: SMALL, TOP-RIGHT ---------- */
        .status-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #eef0f2;
          box-shadow: 0 1px 8px rgba(15, 23, 42, 0.05);
          padding: 12px 16px;
          width: 168px;
          flex-shrink: 0;
        }

        .status-heading {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 8px 0;
          text-align: right;
        }

        .status-timer-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .timer-ring {
          --ring-color: #10b981;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: conic-gradient(
            var(--ring-color) calc(var(--progress) * 1deg),
            #e5e7eb 0deg
          );
          transition: background 0.3s linear;
        }

        .timer-ring.low {
          --ring-color: #d97706;
        }

        .timer-ring.critical {
          --ring-color: #dc2626;
        }

        .timer-ring-inner {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ffffff;
        }

        .timer-text {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          font-variant-numeric: tabular-nums;
        }

        .timer-text.low {
          color: #d97706;
        }

        .timer-text.critical {
          color: #dc2626;
        }

        .status-question-count {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .status-question-count span {
          color: #10b981;
        }

        /* ---------- QUESTION CARD ---------- */
        .question-card {
          background: #ffffff;
          border: 1px solid #eef0f2;
          border-radius: 14px;
          box-shadow: 0 1px 8px rgba(15, 23, 42, 0.04);
          padding: 18px 20px;
          flex-shrink: 0;
        }

        .question-of {
          font-size: 12px;
          color: #9ca3af;
          margin: 0 0 6px 0;
        }

        .question-text {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          line-height: 1.5;
          margin: 0;
        }

        /* ---------- ANSWER AREA ---------- */
        .answer-area {
          flex: 1;
          min-height: 140px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px 20px;
          font-size: 14px;
          color: #374151;
          line-height: 1.6;
          resize: none;
          width: 100%;
          font-family: inherit;
        }

        .answer-area:focus {
          outline: none;
          border-color: #10b981;
        }

        /* ---------- AI FEEDBACK ---------- */
        .feedback-card {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }

        .feedback-text {
          font-size: 13px;
          color: #047857;
          margin: 0;
        }

        .next-question-btn {
          width: 100%;
          background: linear-gradient(90deg, #10b981, #0d9488);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 14px 0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .next-question-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .next-question-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width: 900px) {
          .ai-interview-screen {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            overflow: visible;
          }

          .interview-left {
            width: 100vw;
            height: 40vh;
          }

          .interview-right {
            width: 100vw;
            height: auto;
          }

          .right-top-row {
            flex-direction: column;
          }

          .status-card {
            width: 100%;
          }
        }
      `}</style>

      {/* LEFT: full-bleed interviewer image, no card, no padding */}
      <div className="interview-left">
        <img src="/interviewer-image.jpg" alt="Interviewer" />
      </div>

      {/* RIGHT: independent workspace */}
      <div className="interview-right">
        <div className="right-top-row">
          <div
            className={`interview-info ${loadingInterview ? "loading" : ""} ${interviewError ? "error" : ""}`}
          >
            {loadingInterview ? (
              <div>Loading interview...</div>
            ) : interviewError ? (
              <div>{interviewError}</div>
            ) : (
              <div>
                <h1 className="interview-role">{interview?.role || "Interview"}</h1>

                <div className="interview-meta">
                  {interview?.experience && <span>{interview.experience} Experience</span>}
                  {interview?.interviewType && <span>• {interview.interviewType}</span>}
                  {typeof interview?.numberOfQuestions === "number" && (
                    <span>• {interview.numberOfQuestions} questions</span>
                  )}
                </div>

                {interview?.difficulty && (
                  <div className="interview-difficulty">
                    <strong>Difficulty:</strong> {interview.difficulty}
                  </div>
                )}

                {interviewTopics.length > 0 && (
                  <div className="interview-topics">
                    <span className="interview-topics-label">Topics:</span>
                    {interviewTopics.map((topic) => (
                      <span key={topic} className="interview-topic-chip">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="status-card">
            <p className="status-heading">Interview Status</p>

            <div className="status-timer-row">
              <div
                className={`timer-ring ${urgency !== "normal" ? urgency : ""}`}
                style={{ "--progress": ringDegrees }}
              >
                <div className="timer-ring-inner" />
              </div>
              <span className={`timer-text ${urgency !== "normal" ? urgency : ""}`}>
                {formatTime(secondsLeft)}
              </span>
            </div>

            <p className="status-question-count">
              Question <span>{currentIndex + 1}</span> / {interviewQuestions.length}
            </p>
          </div>
        </div>

        <div className="question-card">
          <p className="question-of">
            Question {currentIndex + 1} of {interviewQuestions.length || 0}
          </p>
          <p className="question-text">{currentQuestion?.text || "No question available."}</p>
        </div>

        <textarea
          className="answer-area"
          value={currentAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          placeholder="Type your answer here..."
          disabled={loadingInterview || submittingAnswer || !currentQuestion}
        />

        <div className="feedback-card">
          <p className="feedback-text">
            {currentQuestion?.feedback || "Your answer will be evaluated after submission."}
          </p>
          <button
            className="next-question-btn"
            onClick={handleNextQuestion}
            disabled={loadingInterview || submittingAnswer || !currentQuestion}
          >
            {submittingAnswer ? "Saving..." : isLast ? "Submit" : "Next Question →"}
          </button>
        </div>
      </div>
    </div>
  );
}