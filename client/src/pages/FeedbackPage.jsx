import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Award, BarChart3, CheckCircle2,
  ChevronLeft, ChevronRight, Clock, Compass, MessageSquare, RefreshCw,
  Sparkles, Target, TrendingDown, TrendingUp, Zap, Loader2,
} from "lucide-react";

/* ─── Score helpers ───────────────────────────────────────────────────────── */
function scorePercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  const max = value > 10 ? 100 : 10;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function performanceLabel(percent) {
  if (typeof percent !== "number" || Number.isNaN(percent)) return "Not enough data";
  if (percent >= 90) return "Exceptional";
  if (percent >= 75) return "Strong";
  if (percent >= 60) return "Solid";
  if (percent >= 40) return "Developing";
  return "Needs practice";
}

function scoreColor(percent) {
  if (percent >= 75) return "#059669";
  if (percent >= 50) return "#d97706";
  return "#dc2626";
}

function formatDate(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return null; }
}

const SCORE_CONFIG = [
  { key: "overallScore", label: "Overall", icon: Target },
  { key: "confidenceScore", label: "Confidence", icon: Sparkles },
  { key: "correctnessScore", label: "Correctness", icon: CheckCircle2 },
  { key: "communicationScore", label: "Communication", icon: MessageSquare },
];

const LOADING_PHRASES = [
  "Analyzing your responses…",
  "Evaluating communication signal…",
  "Scoring technical accuracy…",
  "Assembling your performance report…",
];

/* ─── Score gauge SVG ─────────────────────────────────────────────────────── */
function ScoreGauge({ value }) {
  const pct = scorePercent(value);
  const radius = 88;
  const stroke = 12;
  const cx = 100;
  const cy = 100;
  const arc = (2 * Math.PI * radius * 270) / 360;
  const offset = arc - (pct / 100) * arc;
  const color = scoreColor(pct);

  return (
    <div style={{ position: "relative", width: 200, height: 200 }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx={cx} cy={cy} r={radius} stroke="#f1f5f9" strokeWidth={stroke} fill="none"
          strokeDasharray={`${arc} ${2 * Math.PI * radius}`}
          strokeDashoffset={`-${(2 * Math.PI * radius * 45) / 360}`}
          strokeLinecap="round" style={{ transform: "rotate(135deg)", transformOrigin: "100px 100px" }}
        />
        <motion.circle cx={cx} cy={cy} r={radius} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${arc} ${2 * Math.PI * radius}`}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          strokeLinecap="round" style={{ transform: "rotate(135deg)", transformOrigin: "100px 100px" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }}
          style={{ fontSize: 48, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 }}
        >
          {value != null ? Math.round(value) : "—"}
        </motion.span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>out of 100</span>
      </div>
    </div>
  );
}

/* ─── Dimension bar row ───────────────────────────────────────────────────── */
function DimensionRow({ item, delay }) {
  const Icon = item.icon;
  const pct = item.percent;
  const color = scoreColor(pct);
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.4 }}
      style={{ display: "grid", gridTemplateColumns: "180px 1fr 64px", alignItems: "center", gap: 20, padding: "16px 0", borderTop: "1px solid #f1f5f9" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a" }}>{item.label}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: "easeOut", delay: delay + 0.2 }}
          style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
      <div style={{ textAlign: "right", fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
        {typeof item.value === "number" ? Math.round(item.value) : "—"}
        <span style={{ fontSize: 10, fontWeight: 650, color: "#94a3b8", marginLeft: 2 }}>/100</span>
      </div>
    </motion.div>
  );
}

/* ─── Mini score badge ────────────────────────────────────────────────────── */
function MiniScore({ value }) {
  const pct = scorePercent(value);
  const color = scoreColor(pct);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 99, background: `${color}12`, border: `1px solid ${color}30`, color, fontSize: 13, fontWeight: 800 }}>
      {typeof value === "number" ? Math.round(value) : "—"}/100
    </div>
  );
}

/* ─── Loading state ───────────────────────────────────────────────────────── */
function LoadingState() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhraseIndex(i => (i + 1) % LOADING_PHRASES.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "2px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
        <Loader2 size={32} color="#059669" style={{ animation: "spin 1s linear infinite" }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={phraseIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          style={{ fontSize: 17, fontWeight: 650, color: "#374151", margin: "0 0 8px" }}
        >
          {LOADING_PHRASES[phraseIndex]}
        </motion.p>
      </AnimatePresence>
      <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>This usually takes a few seconds</p>
    </div>
  );
}

/* ─── Error / Empty states ────────────────────────────────────────────────── */
function ErrorState({ message, onRetry }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 24px" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <AlertTriangle size={28} color="#dc2626" />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 750, color: "#0f172a", margin: "0 0 8px" }}>Couldn't load feedback</h3>
      <p style={{ fontSize: 14.5, color: "#64748b", margin: "0 0 24px", maxWidth: 360 }}>{message}</p>
      <button type="button" onClick={onRetry}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, fontWeight: 650, cursor: "pointer" }}
      >
        <RefreshCw size={15} /> Try again
      </button>
    </div>
  );
}

function EmptyState({ onRetry }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 24px" }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Sparkles size={28} color="#10b981" />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 750, color: "#0f172a", margin: "0 0 8px" }}>No feedback available</h3>
      <p style={{ fontSize: 14.5, color: "#64748b", margin: "0 0 24px", maxWidth: 360 }}>Feedback hasn't been generated for this session yet.</p>
      <button type="button" onClick={onRetry}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}
      >
        <RefreshCw size={15} /> Generate feedback
      </button>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function InterviewFeedback() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialFeedback = location.state?.feedback ?? null;
  const [feedback, setFeedback] = useState(initialFeedback);
  const [status, setStatus] = useState(initialFeedback ? "success" : "loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeQuestion, setActiveQuestion] = useState(0);

  const fetchFeedback = useCallback(async () => {
    if (location.state?.feedback) { setFeedback(location.state.feedback); setStatus("success"); setActiveQuestion(0); return; }
    if (!interviewId) { setStatus("error"); setErrorMessage("No interview ID found in the URL."); return; }
    setStatus("loading"); setErrorMessage("");
    try {
      const { data } = await api.post(`/api/interview/${interviewId}/feedback`);
      const result = data?.feedback ?? data;
      const hasContent = result && (typeof result.overallScore === "number" || typeof result.overallSummary === "string" || (Array.isArray(result.questionWiseFeedback) && result.questionWiseFeedback.length > 0));
      if (!hasContent) { setFeedback(null); setStatus("empty"); return; }
      setFeedback(result); setStatus("success"); setActiveQuestion(0);
    } catch (err) { setErrorMessage(err.message || "Something went wrong while fetching feedback."); setStatus("error"); }
  }, [interviewId, location.state]);

  useEffect(() => {
    if (location.state?.feedback) { setFeedback(location.state.feedback); setStatus("success"); setActiveQuestion(0); return; }
    fetchFeedback();
  }, [fetchFeedback, location.state]);

  const questionFeedback = Array.isArray(feedback?.questionWiseFeedback) ? feedback.questionWiseFeedback : [];
  const scoreValues = SCORE_CONFIG.map(item => feedback?.[item.key]).filter(v => typeof v === "number" && !Number.isNaN(v));
  const averageScore = scoreValues.length ? Math.round(scoreValues.reduce((s, v) => s + v, 0) / scoreValues.length) : null;

  const dimensionData = SCORE_CONFIG
    .filter(item => item.key !== "overallScore")
    .map(item => ({ ...item, value: feedback?.[item.key] }))
    .filter(item => typeof item.value === "number" && !Number.isNaN(item.value))
    .map(item => ({ ...item, percent: scorePercent(item.value) }))
    .sort((a, b) => b.percent - a.percent);

  const strongestDimension = dimensionData[0] || null;
  const weakestDimension = dimensionData.length > 1 ? dimensionData[dimensionData.length - 1] : null;

  const scoredQuestions = questionFeedback.map((item, idx) => ({ ...item, idx })).filter(item => typeof item.score === "number");
  const strongestQuestion = scoredQuestions.length ? scoredQuestions.reduce((best, item) => item.score > best.score ? item : best) : null;
  const weakestQuestion = scoredQuestions.length > 1 ? scoredQuestions.reduce((worst, item) => item.score < worst.score ? item : worst) : null;

  const selectedQuestion = questionFeedback.length > 0 ? questionFeedback[Math.min(activeQuestion, questionFeedback.length - 1)] : null;

  const metaRole = typeof feedback?.role === "string" ? feedback.role : null;
  const metaType = typeof feedback?.interviewType === "string" ? feedback.interviewType : null;
  const metaDate = feedback?.completedAt ? formatDate(feedback.completedAt) : null;

  const averagePct = scorePercent(averageScore);
  const perfLabel = performanceLabel(averagePct);
  const perfColor = scoreColor(averagePct);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={14} color="#fff" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>InterviewAI</span>
          </button>
          <span style={{ color: "#94a3b8", fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>Interview Report</span>
          <button type="button" onClick={() => navigate(-1)}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 99, fontSize: 13, fontWeight: 700, color: "#374151", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#10b981"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message={errorMessage} onRetry={fetchFeedback} />}
        {status === "empty" && <EmptyState onRetry={fetchFeedback} />}

        {status === "success" && feedback && (
          <div>
            {/* ── 1. REPORT HEADER ── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 40 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>
                <Sparkles size={12} /> AI-generated performance report
              </div>
              <h1 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em", margin: "0 0 16px", lineHeight: 1.1 }}>
                Interview review
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { icon: CheckCircle2, text: "Interview complete" },
                  { icon: MessageSquare, text: `${questionFeedback.length} question${questionFeedback.length !== 1 ? "s" : ""} reviewed` },
                  metaRole && { icon: Target, text: metaRole },
                  metaType && { icon: BarChart3, text: metaType },
                  metaDate && { icon: Clock, text: metaDate },
                ].filter(Boolean).map((m, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 650, color: "#4b5563", padding: "5px 12px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 99 }}>
                    <m.icon size={13} color="#059669" /> {m.text}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* ── 2. SCORE STAGE ── */}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 48, alignItems: "center", background: "#fff", borderRadius: 20, padding: "36px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(15,23,42,0.06)", marginBottom: 24 }} className="score-stage-grid">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
                <ScoreGauge value={averageScore} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Performance read</div>
                <h2 style={{ fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: 850, color: "#0f172a", letterSpacing: "-0.02em", margin: "0 0 10px" }}>{perfLabel}</h2>
                <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.7, margin: "0 0 24px", maxWidth: 480 }}>
                  Composite score across every dimension evaluated in this session.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {strongestDimension && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
                      <TrendingUp size={17} color="#059669" />
                      <div>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Strongest area</div>
                        <div style={{ fontSize: 14, fontWeight: 750, color: "#0f172a" }}>{strongestDimension.label}</div>
                      </div>
                    </div>
                  )}
                  {weakestDimension && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
                      <Compass size={17} color="#d97706" />
                      <div>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Focus area</div>
                        <div style={{ fontSize: 14, fontWeight: 750, color: "#0f172a" }}>{weakestDimension.label}</div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* ── 3. DIMENSION SPECTRUM ── */}
            {dimensionData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
                style={{ background: "#fff", borderRadius: 20, padding: "32px 36px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(15,23,42,0.06)", marginBottom: 24 }}
              >
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Performance breakdown</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.015em" }}>How each dimension scored</h2>
                </div>
                {dimensionData.map((item, i) => <DimensionRow key={item.key} item={item} delay={0.08 * i} />)}
              </motion.div>
            )}

            {/* ── 4. AI INSIGHT ── */}
            {feedback.overallSummary && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
                style={{ background: "linear-gradient(135deg, #022c22, #047857 70%)", borderRadius: 20, padding: "36px", marginBottom: 24, position: "relative", overflow: "hidden" }}
              >
                <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }} aria-hidden="true" />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>AI performance insight</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 16px" }}>What stood out this session</h2>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.82)", lineHeight: 1.8, margin: 0, maxWidth: 740 }}>
                    {feedback.overallSummary}
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── 5. QUESTION REPORT ── */}
            {questionFeedback.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
                style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(15,23,42,0.06)", overflow: "hidden", marginBottom: 24 }}
              >
                <div style={{ padding: "28px 32px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Question-by-question review</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Walk through each answer</h2>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {strongestQuestion && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", fontSize: 12.5, fontWeight: 700 }}>
                        <Award size={12} /> Strongest — Q{strongestQuestion.idx + 1}
                      </span>
                    )}
                    {weakestQuestion && weakestQuestion.idx !== strongestQuestion?.idx && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: "#fffbeb", border: "1px solid #fcd34d", color: "#b45309", fontSize: 12.5, fontWeight: 700 }}>
                        <TrendingDown size={12} /> Focus — Q{weakestQuestion.idx + 1}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "260px 1fr" }} className="qr-layout">
                  {/* Rail */}
                  <div style={{ borderRight: "1px solid #f8fafc", overflowY: "auto", maxHeight: 500 }}>
                    {questionFeedback.map((item, idx) => {
                      const isActive = idx === Math.min(activeQuestion, questionFeedback.length - 1);
                      const hasScore = typeof item.score === "number";
                      return (
                        <button key={idx} type="button" onClick={() => setActiveQuestion(idx)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: isActive ? "#f0fdf4" : "none", border: "none", borderLeft: isActive ? "3px solid #10b981" : "3px solid transparent", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                        >
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: isActive ? "#047857" : "#94a3b8", minWidth: 24, flexShrink: 0 }}>{String(idx + 1).padStart(2, "0")}</span>
                          <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 550, color: isActive ? "#0f172a" : "#4b5563", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", flex: 1, lineHeight: 1.4 }}>
                            {item.question || `Question ${idx + 1}`}
                          </span>
                          {hasScore && (
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: scoreColor(scorePercent(item.score)), flexShrink: 0 }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Detail panel */}
                  <AnimatePresence mode="wait">
                    {selectedQuestion && (
                      <motion.div key={activeQuestion} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.28 }}
                        style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#94a3b8" }}>
                            Question {Math.min(activeQuestion, questionFeedback.length - 1) + 1} of {questionFeedback.length}
                          </span>
                          {typeof selectedQuestion.score === "number" && <MiniScore value={selectedQuestion.score} />}
                        </div>

                        <h3 style={{ fontSize: 17, fontWeight: 750, color: "#0f172a", margin: 0, lineHeight: 1.5 }}>
                          {selectedQuestion.question || `Question ${activeQuestion + 1}`}
                        </h3>

                        {selectedQuestion.answer && (
                          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 18px" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Your answer</div>
                            <p style={{ margin: 0, fontSize: 14.5, color: "#374151", lineHeight: 1.7 }}>{selectedQuestion.answer}</p>
                          </div>
                        )}

                        <div style={{ background: "linear-gradient(135deg, #022c22, #064e3b)", borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                            <Sparkles size={12} /> AI feedback
                          </div>
                          <p style={{ margin: 0, fontSize: 14.5, color: "rgba(255,255,255,0.84)", lineHeight: 1.75 }}>
                            {selectedQuestion.feedback || "No feedback provided for this question."}
                          </p>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <button type="button" onClick={() => setActiveQuestion(i => Math.max(0, i - 1))} disabled={activeQuestion <= 0}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13.5, fontWeight: 650, color: activeQuestion <= 0 ? "#cbd5e1" : "#374151", cursor: activeQuestion <= 0 ? "not-allowed" : "pointer", transition: "all 0.15s" }}
                          >
                            <ChevronLeft size={15} /> Previous
                          </button>
                          <button type="button" onClick={() => setActiveQuestion(i => Math.min(questionFeedback.length - 1, i + 1))} disabled={activeQuestion >= questionFeedback.length - 1}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13.5, fontWeight: 650, color: activeQuestion >= questionFeedback.length - 1 ? "#cbd5e1" : "#374151", cursor: activeQuestion >= questionFeedback.length - 1 ? "not-allowed" : "pointer", transition: "all 0.15s" }}
                          >
                            Next <ChevronRight size={15} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ── 6. NEXT STEPS ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
              style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(15,23,42,0.06)", padding: "36px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}
            >
              <div style={{ maxWidth: 500 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>What's next</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>Keep building on this session</h2>
                <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.7, margin: 0 }}>
                  Use this report to prioritize {weakestDimension ? weakestDimension.label.toLowerCase() : "your weaker areas"} in your next practice run.
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button type="button" onClick={() => navigate("/interview/setup")}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 14.5, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(5,150,105,0.25)", transition: "transform 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  Start new interview <ArrowRight size={15} />
                </button>
                <button type="button" onClick={() => navigate("/interview/history")}
                  style={{ padding: "12px 22px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14.5, fontWeight: 650, color: "#374151", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#10b981"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                >
                  View all sessions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .score-stage-grid { grid-template-columns: 1fr !important; justify-items: center; }
          .qr-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
