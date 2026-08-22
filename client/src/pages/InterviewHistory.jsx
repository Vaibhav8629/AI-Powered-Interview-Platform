import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, ArrowRight, Search, Calendar, Clock, ListChecks, Layers,
  Gauge, RefreshCcw, Inbox, AlertTriangle, Sparkles, TrendingUp,
  Award, Target, CheckCircle2, ChevronRight, Filter, SlidersHorizontal,
} from "lucide-react";

const BASE_API = import.meta.env.VITE_BASE_API || "";

const STATUS_META = {
  completed: { label: "Completed", dot: "#10b981", chip: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" } },
  "in-progress": { label: "In progress", dot: "#f59e0b", chip: { bg: "#fffbeb", color: "#b45309", border: "#fcd34d" } },
  created: { label: "Not started", dot: "#94a3b8", chip: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" } },
};

function normalizeStatus(s) {
  const v = (s || "").toLowerCase();
  if (v.includes("complete")) return "completed";
  if (v.includes("progress") || v.includes("start")) return "in-progress";
  return "created";
}

function formatDate(ds) {
  if (!ds) return "—";
  return new Date(ds).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(ds) {
  if (!ds) return "—";
  return new Date(ds).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(m) {
  if (!m) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function computeScore(iv) {
  if (typeof iv.overallScore === "number") return iv.overallScore;
  const scored = (iv.questions || []).filter(q => typeof q.score === "number");
  if (!scored.length) return null;
  return Math.round(scored.reduce((s, q) => s + q.score, 0) / scored.length);
}

function computeAnswered(iv) {
  const total = (iv.questions || []).length || iv.numberOfQuestions || 0;
  const answered = (iv.questions || []).filter(q => q.answer?.trim()).length;
  return { answered, total };
}

function scoreColor(score) {
  if (score == null) return "#cbd5e1";
  if (score >= 80) return "#059669";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

function scoreLabel(score) {
  if (score == null) return "Not scored";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Needs work";
}

/* ─── Score Ring ──────────────────────────────────────────────────────────── */
function ScoreRing({ score, size = 80, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const offset = c - (pct / 100) * c;
  const color = scoreColor(score);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#f1f5f9" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.27, fontWeight: 800, color: score == null ? "#94a3b8" : "#0f172a", lineHeight: 1 }}>
          {score ?? "—"}
        </span>
        <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 650 }}>/100</span>
      </div>
    </div>
  );
}

/* ─── Stats cards ─────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color = "#059669", delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 850, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 550, marginTop: 3 }}>{label}</div>
      </div>
    </motion.div>
  );
}

/* ─── Interview row card ──────────────────────────────────────────────────── */
function InterviewCard({ interview, index, onAction }) {
  const statusKey = normalizeStatus(interview.status);
  const meta = STATUS_META[statusKey];
  const score = computeScore(interview);
  const { answered, total } = computeAnswered(interview);
  const actionLabel = statusKey === "completed" ? "View report" : statusKey === "in-progress" ? "Continue" : "Start";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      style={{
        background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16,
        padding: "20px 24px", display: "flex", alignItems: "center", gap: 20,
        transition: "all 0.2s ease", cursor: "default",
      }}
      whileHover={{ y: -2, boxShadow: "0 8px 28px rgba(15,23,42,0.08)", borderColor: "#e2e8f0" }}
    >
      {/* Score ring */}
      {statusKey === "completed" ? (
        <ScoreRing score={score} size={64} stroke={6} />
      ) : statusKey === "in-progress" ? (
        <div style={{ width: 64, height: 64, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 5 }}>
          <div style={{ width: 48, height: 4, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${total ? (answered / total) * 100 : 0}%`, background: "#f59e0b", borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 650 }}>{answered}/{total}</span>
        </div>
      ) : (
        <div style={{ width: 64, height: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Gauge size={28} color="#cbd5e1" />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8" }}>{formatShortDate(interview.createdAt)}</span>
          <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, color: meta.chip.color, background: meta.chip.bg, border: `1px solid ${meta.chip.border}`, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
            {meta.label}
          </span>
        </div>
        <h3 style={{ fontSize: 15.5, fontWeight: 750, color: "#0f172a", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {interview.role || "Untitled interview"}
        </h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>
          {[interview.interviewType || "General", interview.difficulty].filter(Boolean).join(" · ")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "#94a3b8" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ListChecks size={11} />{total} questions</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} />{formatDuration(interview.duration)}</span>
          {Array.isArray(interview.topics) && interview.topics.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Layers size={11} />
              {interview.topics.slice(0, 2).join(", ")}{interview.topics.length > 2 ? ` +${interview.topics.length - 2}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Score label + action */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
        {statusKey === "completed" && score != null && (
          <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(score) }}>{scoreLabel(score)}</span>
        )}
        <button type="button" onClick={() => onAction(interview, statusKey)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: statusKey === "completed" ? "7px 14px" : "7px 14px",
            borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            background: statusKey === "completed" ? "#f0fdf4" : "linear-gradient(135deg, #047857, #10b981)",
            color: statusKey === "completed" ? "#047857" : "#fff",
            border: statusKey === "completed" ? "1px solid #a7f3d0" : "none",
            boxShadow: statusKey !== "completed" ? "0 2px 8px rgba(5,150,105,0.25)" : "none",
          }}
        >
          {actionLabel} <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({ filtered, onStart }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 24px" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f0fdf4", border: "2px dashed #a7f3d0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <Sparkles size={32} color="#10b981" />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 750, color: "#0f172a", margin: "0 0 10px" }}>
        {filtered ? "No sessions match your filters" : "No sessions logged yet"}
      </h3>
      <p style={{ fontSize: 15, color: "#64748b", margin: "0 0 28px", maxWidth: 360, lineHeight: 1.7 }}>
        {filtered ? "Try adjusting your search or filter settings." : "Run your first AI interview and it'll appear here — scored, timed, and ready to revisit."}
      </p>
      {!filtered && (
        <button type="button" onClick={onStart}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 6px 20px rgba(5,150,105,0.28)" }}
        >
          Start your first session <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

/* ─── Loading skeleton ────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height: 100, borderRadius: 16, background: "linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite" }} />
      ))}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function InterviewHistory() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchInterviews = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_API}/api/my-interviews`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      if (res.status === 401 || res.status === 403) { setError("Your session has expired. Please log in again."); return; }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setInterviews(Array.isArray(data) ? data : data.interviews || []);
    } catch (err) { setError(err.message || "Unable to fetch interview history."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInterviews(); }, [fetchInterviews]);

  // Fix: use the correct route
  const handleStartNew = () => navigate("/interview/setup");

  const handleAction = (interview, statusKey) => {
    if (statusKey === "completed") navigate(`/feedback/${interview._id}`);
    else navigate(`/interview/${interview._id}`);
  };

  const metrics = useMemo(() => {
    const total = interviews.length;
    const completed = interviews.filter(i => normalizeStatus(i.status) === "completed");
    const scores = completed.map(computeScore).filter(s => typeof s === "number");
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const bestScore = scores.length ? Math.max(...scores) : null;
    const answered = interviews.reduce((acc, iv) => acc + computeAnswered(iv).answered, 0);
    return { total, completedCount: completed.length, avgScore, bestScore, questionsAnswered: answered };
  }, [interviews]);

  const filteredList = useMemo(() => {
    let list = [...interviews];
    if (statusFilter !== "all") list = list.filter(i => normalizeStatus(i.status) === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        (i.role || "").toLowerCase().includes(q) ||
        (i.interviewType || "").toLowerCase().includes(q) ||
        (Array.isArray(i.topics) && i.topics.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (sortBy === "oldest") list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === "score") list.sort((a, b) => (computeScore(b) ?? -1) - (computeScore(a) ?? -1));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [interviews, statusFilter, search, sortBy]);

  const isFiltered = search.trim() || statusFilter !== "all";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <button type="button" onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>InterviewAI</span>
          </button>
          <button type="button" onClick={handleStartNew}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(5,150,105,0.25)" }}
          >
            <Plus size={16} /> New session
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Page title + stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.1em" }}>Session log</span>
          </div>
          <h1 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em", margin: "0 0 6px" }}>Interview history</h1>
          <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
            {metrics.total > 0 ? `${metrics.total} session${metrics.total !== 1 ? "s" : ""} recorded` : "Your practice sessions will appear here"}
          </p>
        </motion.div>

        {/* Stats */}
        {metrics.total > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }} className="history-stats-grid">
            <StatCard icon={ListChecks} label="Total sessions" value={metrics.total} color="#059669" delay={0} />
            <StatCard icon={CheckCircle2} label="Completed" value={metrics.completedCount} color="#3b82f6" delay={0.06} />
            <StatCard icon={Award} label="Best score" value={metrics.bestScore ?? "—"} color="#7c3aed" delay={0.12} />
            <StatCard icon={Target} label="Avg score" value={metrics.avgScore ?? "—"} color="#f59e0b" delay={0.18} />
          </div>
        )}

        {/* Filter bar */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search role, type, topic…"
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 36px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 14, color: "#0f172a", background: "#f8fafc", outline: "none", transition: "all 0.15s" }}
              onFocus={e => { e.target.style.borderColor = "#10b981"; e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.08)"; }}
              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Status pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[{ k: "all", l: "All" }, { k: "completed", l: "Completed" }, { k: "in-progress", l: "In progress" }, { k: "created", l: "Not started" }].map(f => (
              <button key={f.k} type="button" onClick={() => setStatusFilter(f.k)}
                style={{ padding: "7px 14px", borderRadius: 9, fontSize: 13, fontWeight: 650, cursor: "pointer", transition: "all 0.15s", border: "none",
                  background: statusFilter === f.k ? "#0f172a" : "#f1f5f9",
                  color: statusFilter === f.k ? "#fff" : "#64748b" }}
              >{f.l}</button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <SlidersHorizontal size={14} color="#94a3b8" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#374151", background: "#fff", outline: "none", cursor: "pointer" }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="score">Highest score</option>
            </select>
          </div>
        </div>

        {/* Main content */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <AlertTriangle size={28} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 750, color: "#0f172a", margin: "0 0 8px" }}>Couldn't load sessions</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>{error}</p>
            <button type="button" onClick={fetchInterviews}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, fontWeight: 650, cursor: "pointer" }}
            >
              <RefreshCcw size={15} /> Try again
            </button>
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9" }}>
            <EmptyState filtered={isFiltered} onStart={handleStartNew} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 650, color: "#94a3b8", marginBottom: 4 }}>
              {filteredList.length} session{filteredList.length !== 1 ? "s" : ""}
              {isFiltered ? " matched" : ""}
            </div>
            <AnimatePresence mode="popLayout">
              {filteredList.map((iv, i) => (
                <InterviewCard key={iv._id} interview={iv} index={i} onAction={handleAction} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { to { background-position: 200% center; } }
        @media (max-width: 768px) {
          .history-stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .history-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
