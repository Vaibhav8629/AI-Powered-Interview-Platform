import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import {
  Zap,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Inbox,
  Target,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * InterviewFeedback.jsx
 * ---------------------------------------------------------------------------
 * Single-file Interview Result / Feedback page for the InterviewAI platform.
 *
 * Theme: reuses the same green/teal + white SaaS look used across the
 * landing page and Interview Setup wizard (emerald accents, white cards,
 * soft green gradient backdrop, rounded-2xl cards, bold dark headings).
 *
 * Data flow:
 *   - `interviewId` is read from the route (react-router `useParams`),
 *     never hardcoded.
 *   - On mount, calls the EXISTING backend endpoint:
 *       POST /api/interview/:interviewId/feedback
 *   - The response is expected to be shaped like:
 *       {
 *         overallScore: number,
 *         confidenceScore: number,
 *         correctnessScore: number,
 *         communicationScore: number,
 *         questionWiseFeedback: [
 *           { question: string, answer?: string, feedback: string, score?: number }
 *         ],
 *         overallSummary: string,
 *       }
 *
 * Every place the response is consumed is marked with a comment showing
 * exactly which backend field is being rendered.
 * ---------------------------------------------------------------------------
 */

export default function InterviewFeedback() {
  const { interviewId } = useParams(); // dynamic interview id from the route
  const navigate = useNavigate();
  const location = useLocation();

  const initialFeedback = location.state?.feedback ?? null;
  const [feedback, setFeedback] = useState(initialFeedback); // holds the raw backend response
  const [status, setStatus] = useState(initialFeedback ? "success" : "loading"); // "loading" | "success" | "error" | "empty"
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedQuestions, setExpandedQuestions] = useState({});

  const fetchFeedback = useCallback(async () => {
    if (location.state?.feedback) {
      setFeedback(location.state.feedback);
      setStatus("success");
      return;
    }

    if (!interviewId) {
      setStatus("error");
      setErrorMessage("No interview ID found in the URL.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const { data } = await api.post(`/api/interview/${interviewId}/feedback`);

      // Backend may wrap the payload as { feedback: {...} } or return it flat.
      const result = data?.feedback ?? data;

      const hasContent =
        result &&
        (typeof result.overallScore === "number" ||
          typeof result.overallSummary === "string" ||
          (Array.isArray(result.questionWiseFeedback) &&
            result.questionWiseFeedback.length > 0));

      if (!hasContent) {
        setFeedback(null);
        setStatus("empty");
        return;
      }

      setFeedback(result);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong while fetching feedback.");
      setStatus("error");
    }
  }, [interviewId, location.state]);

  useEffect(() => {
    if (location.state?.feedback) {
      setFeedback(location.state.feedback);
      setStatus("success");
      return;
    }

    fetchFeedback();
  }, [fetchFeedback, location.state]);

  const toggleQuestion = (idx) => {
    setExpandedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-white to-white">
      {/* ---------------------------------------------------------------- */}
      {/* Header — mirrors the landing page navbar styling (logo + accent) */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-10 border-b border-emerald-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <Zap size={18} fill="white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              InterviewAI
            </span>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ---------------------------- LOADING ---------------------------- */}
        {status === "loading" && <LoadingState />}

        {/* ----------------------------- ERROR ------------------------------ */}
        {status === "error" && (
          <ErrorState message={errorMessage} onRetry={fetchFeedback} />
        )}

        {/* ----------------------------- EMPTY ------------------------------ */}
        {status === "empty" && <EmptyState onRetry={fetchFeedback} />}

        {/* ---------------------------- SUCCESS ----------------------------- */}
        {status === "success" && feedback && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                <Sparkles size={14} />
                AI-generated interview feedback
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Your Interview Result
              </h1>
              <p className="mt-2 text-slate-500">
                Here's how you performed, question by question.
              </p>
            </div>

            {/* --------------------- SCORE CARDS GRID --------------------- */}
            <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* feedback.overallScore → Overall Score */}
              <ScoreCard
                label="Overall Score"
                value={feedback.overallScore}
                icon={<Target size={18} />}
                highlight
              />
              {/* feedback.confidenceScore → Confidence Score */}
              <ScoreCard
                label="Confidence Score"
                value={feedback.confidenceScore}
                icon={<Sparkles size={18} />}
              />
              {/* feedback.correctnessScore → Correctness Score */}
              <ScoreCard
                label="Correctness Score"
                value={feedback.correctnessScore}
                icon={<CheckCircle2 size={18} />}
              />
              {/* feedback.communicationScore → Communication Score */}
              <ScoreCard
                label="Communication Score"
                value={feedback.communicationScore}
                icon={<MessageSquare size={18} />}
              />
            </div>

            {/* ------------------------- SUMMARY CARD ------------------------- */}
            {/* feedback.overallSummary → Overall Summary */}
            {feedback.overallSummary && (
              <section className="mb-10 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Sparkles size={18} className="text-emerald-500" />
                  Overall Summary
                </h2>
                <p className="leading-relaxed text-slate-600">
                  {feedback.overallSummary}
                </p>
              </section>
            )}

            {/* ------------------- QUESTION-WISE FEEDBACK -------------------- */}
            {/* feedback.questionWiseFeedback → Question-wise Feedback */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <MessageSquare size={18} className="text-emerald-500" />
                Question-wise Feedback
              </h2>

              {Array.isArray(feedback.questionWiseFeedback) &&
              feedback.questionWiseFeedback.length > 0 ? (
                <div className="space-y-3">
                  {feedback.questionWiseFeedback.map((item, idx) => {
                    const isOpen = !!expandedQuestions[idx];
                    return (
                      <div
                        key={idx}
                        className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm"
                      >
                        <button
                          onClick={() => toggleQuestion(idx)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {item.question || `Question ${idx + 1}`}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {typeof item.score === "number" && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                {item.score}/10
                              </span>
                            )}
                            {isOpen ? (
                              <ChevronUp size={18} className="text-slate-400" />
                            ) : (
                              <ChevronDown size={18} className="text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-emerald-50 bg-emerald-50/30 px-5 py-4">
                            {item.answer && (
                              <div className="mb-3">
                                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Your Answer
                                </p>
                                <p className="text-sm text-slate-600">{item.answer}</p>
                              </div>
                            )}
                            <div>
                              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                                Feedback
                              </p>
                              <p className="text-sm leading-relaxed text-slate-700">
                                {item.feedback || "No feedback provided for this question."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center text-slate-400">
                  No question-wise feedback was returned for this interview.
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Small presentational helpers — kept in this same file per requirement  */
/* --------------------------------------------------------------------- */

function ScoreCard({ label, value, icon, highlight }) {
  const hasValue = typeof value === "number" && !Number.isNaN(value);

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        highlight
          ? "border-emerald-200 bg-emerald-500 text-white"
          : "border-emerald-100 bg-white text-slate-900"
      }`}
    >
      <div
        className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${
          highlight ? "bg-white/20" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {icon}
      </div>
      <p
        className={`text-2xl font-extrabold sm:text-3xl ${
          highlight ? "text-white" : "text-slate-900"
        }`}
      >
        {hasValue ? value : "—"}
        <span
          className={`ml-1 text-sm font-semibold ${
            highlight ? "text-white/70" : "text-slate-400"
          }`}
        >
          /10
        </span>
      </p>
      <p
        className={`mt-1 text-sm font-medium ${
          highlight ? "text-white/80" : "text-slate-500"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
      <p className="font-semibold text-slate-600">Generating your interview feedback…</p>
      <p className="mt-1 text-sm text-slate-400">This can take a few seconds.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-red-100 bg-red-50/60 p-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
        <AlertTriangle size={22} />
      </div>
      <h3 className="mb-1 text-lg font-bold text-slate-900">Couldn't load feedback</h3>
      <p className="mb-5 text-sm text-slate-500">
        {message || "Something went wrong while fetching your interview feedback."}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
      >
        <RefreshCw size={16} />
        Try Again
      </button>
    </div>
  );
}

function EmptyState({ onRetry }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-emerald-100 bg-white p-10 text-center shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
        <Inbox size={22} />
      </div>
      <h3 className="mb-1 text-lg font-bold text-slate-900">No feedback available yet</h3>
      <p className="mb-5 text-sm text-slate-500">
        Feedback for this interview hasn't been generated yet, or the interview may not be
        complete.
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
      >
        <RefreshCw size={16} />
        Check Again
      </button>
    </div>
  );
}