import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Inbox,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

const SCORE_CONFIG = [
  { key: "overallScore", label: "Overall", icon: Target, highlight: true },
  { key: "confidenceScore", label: "Confidence", icon: Sparkles },
  { key: "correctnessScore", label: "Correctness", icon: CheckCircle2 },
  { key: "communicationScore", label: "Communication", icon: MessageSquare },
];

export default function InterviewFeedback() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialFeedback = location.state?.feedback ?? null;
  const [feedback, setFeedback] = useState(initialFeedback);
  const [status, setStatus] = useState(initialFeedback ? "success" : "loading");
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

  const questionFeedback = Array.isArray(feedback?.questionWiseFeedback)
    ? feedback.questionWiseFeedback
    : [];
  const scoreValues = SCORE_CONFIG.map((item) => feedback?.[item.key]).filter(
    (value) => typeof value === "number" && !Number.isNaN(value)
  );
  const averageScore = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
    : null;

  return (
    <div className="feedback-page">
      <header className="feedback-nav">
        <button type="button" onClick={() => navigate("/")} className="brand" aria-label="InterviewAI home">
          <span className="brand-mark"><Zap size={17} aria-hidden="true" /></span>
          <span>InterviewAI</span>
        </button>

        <button type="button" onClick={() => navigate(-1)} className="ghost-button">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back</span>
        </button>
      </header>

      <main className="feedback-shell">
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message={errorMessage} onRetry={fetchFeedback} />}
        {status === "empty" && <EmptyState onRetry={fetchFeedback} />}

        {status === "success" && feedback && (
          <>
            <section className="feedback-hero">
              <motion.div
                className="hero-copy"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="eyebrow-pill">
                  <Sparkles size={14} aria-hidden="true" />
                  AI-generated interview feedback
                </div>
                <h1>Your interview review is ready.</h1>
                <p>
                  A focused breakdown of your performance across answer quality,
                  confidence, communication, and question-level feedback.
                </p>
                <div className="hero-assurance">
                  <span><CheckCircle2 size={15} aria-hidden="true" /> Role-based review</span>
                  <span><BarChart3 size={15} aria-hidden="true" /> Scored signals</span>
                  <span><MessageSquare size={15} aria-hidden="true" /> Question notes</span>
                </div>
              </motion.div>

              <motion.aside
                className="review-snapshot"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
              >
                <div className="snapshot-topline">
                  <span>Session signal</span>
                  <span className="live-status"><span /> Complete</span>
                </div>
                <div className="snapshot-score">
                  <span>{formatScore(averageScore)}</span>
                  <small>{scoreSuffix(averageScore)}</small>
                </div>
                <div className="snapshot-track">
                  <span style={{ width: `${scorePercent(averageScore)}%` }} />
                </div>
                <div className="snapshot-meta">
                  <span><Clock size={15} aria-hidden="true" /> {questionFeedback.length || 0} questions reviewed</span>
                  <span><TrendingUp size={15} aria-hidden="true" /> Practice-ready insights</span>
                </div>
              </motion.aside>
            </section>

            <section className="score-grid" aria-label="Interview scores">
              {SCORE_CONFIG.map((item, index) => {
                const Icon = item.icon;
                return (
                  <ScoreCard
                    key={item.key}
                    label={item.label}
                    value={feedback[item.key]}
                    icon={<Icon size={19} aria-hidden="true" />}
                    highlight={item.highlight}
                    delay={index * 0.06}
                  />
                );
              })}
            </section>

            {feedback.overallSummary && (
              <motion.section
                className="summary-panel"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              >
                <div className="section-title">
                  <span><Sparkles size={17} aria-hidden="true" /></span>
                  <div>
                    <p>Overall summary</p>
                    <h2>What stood out in this session</h2>
                  </div>
                </div>
                <p className="summary-copy">{feedback.overallSummary}</p>
              </motion.section>
            )}

            <section className="question-section">
              <div className="section-heading">
                <div className="section-title">
                  <span><MessageSquare size={17} aria-hidden="true" /></span>
                  <div>
                    <p>Question-wise feedback</p>
                    <h2>Review each answer</h2>
                  </div>
                </div>
                <span className="count-pill">{questionFeedback.length} items</span>
              </div>

              {questionFeedback.length > 0 ? (
                <div className="question-list">
                  {questionFeedback.map((item, idx) => {
                    const isOpen = !!expandedQuestions[idx];
                    return (
                      <article key={idx} className={`question-card ${isOpen ? "is-open" : ""}`}>
                        <button type="button" onClick={() => toggleQuestion(idx)} className="question-button">
                          <span className="question-index">{idx + 1}</span>
                          <span className="question-text">{item.question || `Question ${idx + 1}`}</span>
                          <span className="question-actions">
                            {typeof item.score === "number" && (
                              <span className="score-pill">{formatScore(item.score)}{scoreSuffix(item.score)}</span>
                            )}
                            {isOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="question-detail">
                            {item.answer && (
                              <div className="answer-block">
                                <span>Your answer</span>
                                <p>{item.answer}</p>
                              </div>
                            )}
                            <div className="answer-block feedback-block">
                              <span>Feedback</span>
                              <p>{item.feedback || "No feedback provided for this question."}</p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-inline">
                  No question-wise feedback was returned for this interview.
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <style>{`
        .feedback-page {
          --ink: #111827;
          --muted: #5b6472;
          --soft: #f6f8fb;
          --panel: #ffffff;
          --line: rgba(203,213,225,0.72);
          --line-strong: rgba(15,23,42,0.14);
          --emerald: #10b981;
          --emerald-dark: #047857;
          --teal-ink: #073b3a;
          --amber: #f59e0b;
          --rose: #e11d48;
          --radius: 8px;
          --shadow: 0 22px 60px rgba(15,23,42,0.12);
          min-height: 100vh;
          overflow-x: hidden;
          color: var(--ink);
          background:
            linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px),
            linear-gradient(180deg, rgba(17,24,39,0.035) 1px, transparent 1px),
            radial-gradient(circle at 15% 10%, rgba(16,185,129,0.15), transparent 30%),
            radial-gradient(circle at 90% 16%, rgba(245,158,11,0.12), transparent 28%),
            linear-gradient(180deg, #fbfdfc 0%, #f6f8fb 100%);
          background-size: 46px 46px, 46px 46px, auto, auto, auto;
        }

        .feedback-page * {
          box-sizing: border-box;
        }

        .feedback-nav {
          position: sticky;
          top: 0;
          z-index: 10;
          width: min(1180px, calc(100% - 40px));
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin: 0 auto;
          backdrop-filter: blur(18px);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--ink);
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0;
          cursor: pointer;
        }

        .brand-mark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: var(--radius);
          color: #fff;
          background: linear-gradient(135deg, var(--teal-ink), var(--emerald));
          box-shadow: 0 12px 24px rgba(16,185,129,0.24);
        }

        .feedback-shell {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 40px 0 80px;
        }

        .feedback-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.46fr);
          gap: 44px;
          align-items: end;
          margin-bottom: 24px;
        }

        .hero-copy h1 {
          max-width: 780px;
          margin: 18px 0 0;
          color: var(--ink);
          font-size: clamp(42px, 6.5vw, 76px);
          line-height: 0.98;
          letter-spacing: 0;
        }

        .hero-copy p {
          max-width: 660px;
          margin: 20px 0 0;
          color: var(--muted);
          font-size: 18px;
          line-height: 1.72;
        }

        .eyebrow-pill {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(16,185,129,0.22);
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(236,253,245,0.9);
          color: var(--emerald-dark);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hero-assurance {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 28px;
        }

        .hero-assurance span,
        .snapshot-meta span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 10px 12px;
          background: rgba(255,255,255,0.72);
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
        }

        .hero-assurance svg,
        .snapshot-meta svg {
          color: var(--emerald-dark);
        }

        .review-snapshot,
        .summary-panel,
        .question-section,
        .state-panel {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.86);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
        }

        .review-snapshot {
          overflow: hidden;
          padding: 24px;
          background:
            linear-gradient(135deg, rgba(17,24,39,0.96), rgba(7,59,58,0.96)),
            #111827;
          color: #fff;
        }

        .snapshot-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          color: rgba(255,255,255,0.64);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .live-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(236,253,245,0.12);
          color: #86efac;
          border: 1px solid rgba(134,239,172,0.22);
          letter-spacing: 0;
          text-transform: none;
        }

        .live-status span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--emerald);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .snapshot-score {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 42px;
        }

        .snapshot-score span {
          font-size: clamp(54px, 8vw, 86px);
          font-weight: 900;
          line-height: 0.9;
          letter-spacing: 0;
        }

        .snapshot-score small {
          color: rgba(255,255,255,0.58);
          font-size: 18px;
          font-weight: 850;
        }

        .snapshot-track {
          height: 8px;
          overflow: hidden;
          margin-top: 20px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
        }

        .snapshot-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #86efac, var(--emerald));
        }

        .snapshot-meta {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }

        .snapshot-meta span {
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.78);
        }

        .snapshot-meta svg {
          color: #86efac;
        }

        .score-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .score-card {
          padding: 20px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.88);
          box-shadow: 0 16px 44px rgba(15,23,42,0.07);
        }

        .score-card.highlight {
          color: #fff;
          border-color: transparent;
          background: linear-gradient(135deg, var(--teal-ink), var(--emerald-dark) 56%, var(--emerald));
          box-shadow: 0 20px 50px rgba(4,120,87,0.25);
        }

        .score-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: var(--radius);
          background: #ecfdf5;
          color: var(--emerald-dark);
        }

        .score-card.highlight .score-icon {
          background: rgba(255,255,255,0.14);
          color: #fff;
        }

        .score-value {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-top: 18px;
        }

        .score-value strong {
          color: var(--ink);
          font-size: 34px;
          line-height: 1;
          letter-spacing: 0;
        }

        .score-value span {
          color: #94a3b8;
          font-size: 14px;
          font-weight: 850;
        }

        .score-card.highlight .score-value strong,
        .score-card.highlight .score-value span {
          color: #fff;
        }

        .score-card p {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 13px;
          font-weight: 850;
        }

        .score-card.highlight p {
          color: rgba(255,255,255,0.76);
        }

        .score-meter {
          height: 7px;
          overflow: hidden;
          margin-top: 16px;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .score-card.highlight .score-meter {
          background: rgba(255,255,255,0.18);
        }

        .score-meter span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--emerald-dark), var(--emerald));
        }

        .score-card.highlight .score-meter span {
          background: #86efac;
        }

        .summary-panel,
        .question-section {
          margin-top: 18px;
          padding: 24px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .section-title {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .section-title > span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: var(--radius);
          background: #ecfdf5;
          color: var(--emerald-dark);
        }

        .section-title p {
          margin: 0;
          color: var(--emerald-dark);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .section-title h2 {
          margin: 4px 0 0;
          color: var(--ink);
          font-size: 22px;
          line-height: 1.2;
          letter-spacing: 0;
        }

        .summary-copy {
          margin: 20px 0 0;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.8;
        }

        .count-pill,
        .score-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 7px 10px;
          background: #ecfdf5;
          color: var(--emerald-dark);
          border: 1px solid rgba(16,185,129,0.22);
          font-size: 12px;
          font-weight: 850;
          white-space: nowrap;
        }

        .question-list {
          display: grid;
          gap: 10px;
        }

        .question-card {
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.82);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .question-card.is-open {
          border-color: rgba(16,185,129,0.32);
          box-shadow: 0 16px 36px rgba(15,23,42,0.08);
        }

        .question-button {
          width: 100%;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          border: 0;
          background: transparent;
          color: var(--ink);
          padding: 16px;
          text-align: left;
          cursor: pointer;
        }

        .question-index {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: var(--radius);
          background: #ecfdf5;
          color: var(--emerald-dark);
          font-size: 13px;
          font-weight: 900;
        }

        .question-text {
          min-width: 0;
          color: var(--ink);
          font-size: 15px;
          font-weight: 850;
          line-height: 1.45;
        }

        .question-actions {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
        }

        .question-detail {
          display: grid;
          gap: 12px;
          padding: 0 16px 16px 60px;
        }

        .answer-block {
          padding: 14px;
          border: 1px solid rgba(203,213,225,0.72);
          border-radius: var(--radius);
          background: rgba(248,250,252,0.86);
        }

        .feedback-block {
          background: rgba(236,253,245,0.56);
          border-color: rgba(16,185,129,0.18);
        }

        .answer-block span {
          display: block;
          margin-bottom: 6px;
          color: var(--emerald-dark);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .answer-block p {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
        }

        .empty-inline {
          border: 1px dashed rgba(16,185,129,0.32);
          border-radius: var(--radius);
          padding: 28px;
          background: rgba(255,255,255,0.74);
          color: var(--muted);
          text-align: center;
          font-weight: 750;
        }

        .state-wrap {
          min-height: calc(100vh - 194px);
          display: grid;
          place-items: center;
          padding: 44px 0;
        }

        .state-panel {
          width: min(520px, 100%);
          padding: 34px;
          text-align: center;
        }

        .state-icon {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          border-radius: var(--radius);
          background: #ecfdf5;
          color: var(--emerald-dark);
        }

        .state-icon.error {
          background: #fef2f2;
          color: var(--rose);
        }

        .state-panel h2 {
          margin: 0;
          color: var(--ink);
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: 0;
        }

        .state-panel p {
          margin: 10px 0 0;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.7;
        }

        .loader-ring {
          width: 48px;
          height: 48px;
          margin: 0 auto 18px;
          border: 4px solid rgba(16,185,129,0.14);
          border-top-color: var(--emerald-dark);
          border-radius: 999px;
          animation: spin 0.9s linear infinite;
        }

        .ghost-button,
        .solid-button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          padding: 0 17px;
          font-weight: 750;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .ghost-button {
          background: rgba(255,255,255,0.68);
          color: var(--ink);
        }

        .solid-button {
          margin-top: 22px;
          border-color: transparent;
          color: #fff;
          background: linear-gradient(135deg, var(--teal-ink), var(--emerald-dark) 52%, var(--emerald));
          box-shadow: 0 14px 32px rgba(4,120,87,0.28);
        }

        .ghost-button:hover,
        .solid-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(15,23,42,0.12);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.52; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 980px) {
          .feedback-hero {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .score-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .feedback-nav,
          .feedback-shell {
            width: min(100% - 28px, 1180px);
          }

          .feedback-nav {
            min-height: 66px;
          }

          .ghost-button span {
            display: none;
          }

          .feedback-shell {
            padding-top: 28px;
          }

          .hero-copy h1 {
            font-size: clamp(38px, 13vw, 54px);
          }

          .hero-copy p {
            font-size: 16px;
          }

          .score-grid {
            grid-template-columns: 1fr;
          }

          .summary-panel,
          .question-section,
          .review-snapshot,
          .state-panel {
            padding: 20px;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .question-button {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .question-actions {
            grid-column: 2;
            justify-self: start;
          }

          .question-detail {
            padding-left: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

function ScoreCard({ label, value, icon, highlight, delay }) {
  return (
    <motion.article
      className={`score-card ${highlight ? "highlight" : ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay }}
    >
      <div className="score-icon">{icon}</div>
      <div className="score-value">
        <strong>{formatScore(value)}</strong>
        <span>{scoreSuffix(value)}</span>
      </div>
      <p>{label}</p>
      <div className="score-meter" aria-hidden="true">
        <span style={{ width: `${scorePercent(value)}%` }} />
      </div>
    </motion.article>
  );
}

function LoadingState() {
  return (
    <div className="state-wrap">
      <div className="state-panel">
        <div className="loader-ring" />
        <h2>Generating your interview feedback</h2>
        <p>This can take a few seconds while the review is prepared.</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="state-wrap">
      <div className="state-panel">
        <div className="state-icon error">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <h2>Could not load feedback</h2>
        <p>{message || "Something went wrong while fetching your interview feedback."}</p>
        <button type="button" onClick={onRetry} className="solid-button">
          <RefreshCw size={16} aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onRetry }) {
  return (
    <div className="state-wrap">
      <div className="state-panel">
        <div className="state-icon">
          <Inbox size={24} aria-hidden="true" />
        </div>
        <h2>No feedback available yet</h2>
        <p>
          Feedback for this interview has not been generated yet, or the interview may not be
          complete.
        </p>
        <button type="button" onClick={onRetry} className="solid-button">
          <RefreshCw size={16} aria-hidden="true" />
          Check again
        </button>
      </div>
    </div>
  );
}

function formatScore(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return Math.round(value);
}

function scoreSuffix(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return value > 10 ? "/100" : "/10";
}

function scorePercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  const max = value > 10 ? 100 : 10;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
