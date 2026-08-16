import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  Clock,
  Calendar,
  BarChart3,
  ListChecks,
  Layers,
  Gauge,
  ChevronRight,
  RefreshCcw,
  Inbox,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

/**
 * /interview-history
 *
 * Matches the existing InterviewAI theme: emerald/teal accents on a light,
 * airy background, pill badges, rounded-2xl cards, soft shadows, and the
 * same header/nav treatment used on the landing + setup pages.
 *
 * Auth + API conventions below follow the pattern already used elsewhere
 * in the app (Bearer token from localStorage, BASE_API from env). If your
 * project already has a shared `api` axios instance or an `useAuth()` hook,
 * swap the two spots marked with "// ADAPT:" to use those instead — nothing
 * else needs to change.
 */

const BASE_API = import.meta.env.VITE_BASE_API || process.env.REACT_APP_BASE_API;

const STATUS_STYLES = {
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  "in-progress": {
    label: "In Progress",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  created: {
    label: "Not Started",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
};

function normalizeStatus(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("complete")) return "completed";
  if (s.includes("progress") || s.includes("start")) return "in-progress";
  return "created";
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(minutes) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function computeScore(interview) {
  if (typeof interview.overallScore === "number") return interview.overallScore;
  const scored = (interview.questions || []).filter(
    (q) => typeof q.score === "number"
  );
  if (!scored.length) return null;
  const avg = scored.reduce((sum, q) => sum + q.score, 0) / scored.length;
  return Math.round(avg);
}

function computeAnswered(interview) {
  const total = (interview.questions || []).length || interview.numberOfQuestions || 0;
  const answered = (interview.questions || []).filter(
    (q) => q.answer && q.answer.trim().length > 0
  ).length;
  return { answered, total };
}

function scoreTone(score) {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

/* ---------------------------- Skeleton card ---------------------------- */

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-3 w-24 rounded-full bg-slate-100" />
          <div className="h-5 w-48 rounded-full bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-slate-100" />
            <div className="h-6 w-24 rounded-full bg-slate-100" />
            <div className="h-6 w-16 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="h-12 w-12 rounded-full bg-slate-100" />
      </div>
      <div className="mt-6 h-px w-full bg-slate-100" />
      <div className="mt-4 flex justify-between">
        <div className="h-4 w-32 rounded-full bg-slate-100" />
        <div className="h-9 w-28 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

/* ------------------------------ Empty state ----------------------------- */

function EmptyState({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white px-8 py-20 text-center"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
        <Inbox className="h-7 w-7 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900">No interviews yet</h3>
      <p className="mt-2 max-w-sm text-slate-500">
        Start your first AI interview and your interview history will appear
        here.
      </p>
      <button
        onClick={onStart}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 active:scale-[0.98]"
      >
        Start interview
        <ArrowRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/* ------------------------------ Error state ----------------------------- */

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50/50 px-8 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
        <AlertTriangle className="h-6 w-6 text-rose-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">
        Couldn't load your interviews
      </h3>
      <p className="mt-2 max-w-sm text-slate-500">
        {message || "Something went wrong while fetching your interview history."}
      </p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
      >
        <RefreshCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}

/* ------------------------------ Stat pill ------------------------------- */

function StatPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-100">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </span>
  );
}

/* --------------------------- Interview card ----------------------------- */

function InterviewCard({ interview, index, onAction }) {
  const statusKey = normalizeStatus(interview.status);
  const statusMeta = STATUS_STYLES[statusKey];
  const score = computeScore(interview);
  const { answered, total } = computeAnswered(interview);

  const actionLabel =
    statusKey === "completed"
      ? "View result"
      : statusKey === "in-progress"
      ? "Continue interview"
      : "Start interview";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-100/60"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-50 opacity-0 blur-2xl transition group-hover:opacity-100" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
              <Calendar className="h-3 w-3" />
              {formatDate(interview.createdAt)}
            </span>
          </div>

          <h3 className="mt-3 truncate text-lg font-bold text-slate-900">
            {interview.role || "Untitled interview"}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {interview.experience ? `${interview.experience} · ` : ""}
            {interview.interviewType || "General"}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill icon={Gauge} label={interview.difficulty || "Standard"} />
            <StatPill
              icon={ListChecks}
              label={`${total} question${total === 1 ? "" : "s"}`}
            />
            <StatPill icon={Clock} label={formatDuration(interview.duration)} />
            {Array.isArray(interview.topics) && interview.topics.length > 0 && (
              <StatPill
                icon={Layers}
                label={
                  interview.topics.length > 2
                    ? `${interview.topics.slice(0, 2).join(", ")} +${
                        interview.topics.length - 2
                      }`
                    : interview.topics.join(", ")
                }
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-4 sm:items-end">
          {statusKey === "completed" && score !== null ? (
            <div className="text-right">
              <div className={`text-3xl font-extrabold leading-none ${scoreTone(score)}`}>
                {score}
                <span className="text-base font-semibold text-slate-300">/100</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">Overall score</div>
            </div>
          ) : statusKey === "in-progress" ? (
            <div className="w-32 text-right">
              <div className="mb-1 text-xs font-medium text-slate-500">
                {answered}/{total} answered
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{
                    width: `${total ? (answered / total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <BarChart3 className="h-4 w-4" />
              Not started
            </div>
          )}

          <button
            onClick={() => onAction(interview, statusKey)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition active:scale-[0.97] ${
              statusKey === "completed"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function InterviewHistory() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ADAPT: replace with your shared API utility if one exists,
      // e.g. `const { data } = await api.get("/interviews/my-interviews")`
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_API}/api/my-interviews`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        setError("Your session has expired. Please log in again.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.interviews || [];
      setInterviews(list);
    } catch (err) {
      setError(err.message || "Unable to fetch interview history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const handleStartNew = () => navigate("/interview-setup");

  const handleAction = (interview, statusKey) => {
    if (statusKey === "completed") {
      navigate(`/feedback/${interview._id}`);
    } else if (statusKey === "in-progress") {
      navigate(`/interview/${interview._id}`);
    } else {
      navigate(`/interview/${interview._id}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Ambient background matching landing page */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-emerald-50/60 via-white to-white" />

      {/* Top nav — same treatment as landing/setup pages */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
              <Zap className="h-4 w-4 text-white" fill="white" />
            </div>
            <span className="text-lg font-extrabold text-slate-900">
              InterviewAI
            </span>
          </div>
          <button
            onClick={handleStartNew}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Start new interview
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <Sparkles className="h-3.5 w-3.5" />
            Your progress
          </div>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Interview History
              </h1>
              <p className="mt-2 max-w-xl text-slate-500">
                Review your previous interviews, performance, scores, and
                feedback.
              </p>
            </div>
            <button
              onClick={handleStartNew}
              className="hidden items-center gap-2 self-start rounded-full bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] sm:inline-flex"
            >
              Start new interview
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchInterviews} />
        ) : interviews.length === 0 ? (
          <EmptyState onStart={handleStartNew} />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {interviews
                .slice()
                .sort(
                  (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                )
                .map((interview, i) => (
                  <InterviewCard
                    key={interview._id}
                    interview={interview}
                    index={i}
                    onAction={handleAction}
                  />
                ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}