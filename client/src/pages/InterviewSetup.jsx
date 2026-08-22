import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  X,
  Upload,
  FileText,
  RefreshCw,
  Loader2,
  Zap,
  AlertTriangle,
  BrainCircuit,
  Sparkles,
  Clock,
  Layers,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import api, { getApiErrorMessage, fetchUserCredits } from "../services/api";
import { extractResumeText } from "../services/resumeParser";

/* ------------------------------------------------------------------ */
/*  Static config (unchanged business data)                           */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 1, title: "Interview Profile", short: "Profile", desc: "Tell us about your role and experience" },
  { id: 2, title: "Interview Format", short: "Format", desc: "Choose the interview type and difficulty" },
  { id: 3, title: "Technical Focus", short: "Focus", desc: "Select the topics you want to practice" },
  { id: 4, title: "Interview Controls", short: "Controls", desc: "Set questions and interview duration" },
  { id: 5, title: "Resume", short: "Resume", desc: "Give your AI interviewer context" },
];

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "Data Scientist",
  "DevOps Engineer",
  "Other",
];

const ROLE_DESCRIPTIONS = {
  "Frontend Developer": "Interfaces, components & web experiences",
  "Backend Developer": "APIs, databases & server-side systems",
  "Full Stack Developer": "End-to-end application development",
  "Software Engineer": "General software design & engineering",
  "Data Scientist": "Data models, analysis & machine learning",
  "DevOps Engineer": "Infrastructure, CI/CD & deployment systems",
  Other: "Tell us more through your topic focus",
};

const EXPERIENCE_LEVELS = ["Fresher", "0–1 years", "1–3 years", "3–5 years", "5+ years"];

const INTERVIEW_TYPES = [
  { label: "Technical", desc: "Core CS & role-specific problem solving" },
  { label: "HR", desc: "Culture fit, background & expectations" },
  { label: "Behavioral", desc: "Past experiences & soft skills" },
  { label: "Mixed", desc: "A blend of technical and behavioral" },
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const DIFFICULTY_META = {
  Easy: { tagline: "Build confidence", bars: 1 },
  Medium: { tagline: "Realistic preparation", bars: 2 },
  Hard: { tagline: "Push your limits", bars: 3 },
};

const PREDEFINED_TOPICS = [
  "DSA",
  "JavaScript",
  "React",
  "Node.js",
  "Express",
  "MongoDB",
  "SQL",
  "OOP",
  "DBMS",
  "Operating Systems",
  "Computer Networks",
  "System Design",
  "Git",
  "APIs",
  "My Projects",
];

const QUESTION_OPTIONS = [5, 6, 7, 8, 9, 10];
const DURATION_PRESETS = [10, 20, 30, 45, 60, 90];

const emptyForm = {
  role: "",
  experience: "",
  interviewType: "",
  difficulty: "",
  topics: [],
  numberOfQuestions: 10,
  duration: 30,
  resume: null,
};

// Credit cost map — mirrors the backend CREDIT_COST_MAP exactly
const CREDIT_COST_MAP = { 5: 5, 10: 10 };

function getCreditCost(numberOfQuestions) {
  // Round to nearest supported value (5 or 10)
  const supported = [5, 10];
  const nearest = supported.reduce((prev, curr) =>
    Math.abs(curr - numberOfQuestions) < Math.abs(prev - numberOfQuestions) ? curr : prev
  );
  return CREDIT_COST_MAP[nearest] ?? 10;
}

/* ------------------------------------------------------------------ */
/*  Small shared building blocks                                      */
/* ------------------------------------------------------------------ */

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-rose-600">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

function Eyebrow({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700/70">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stage navigation — compact horizontal progress                    */
/* ------------------------------------------------------------------ */

function StageNav({ step }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto sm:gap-2">
      {STEPS.map((s, idx) => {
        const isCompleted = s.id < step;
        const isActive = s.id === step;
        const isLast = idx === STEPS.length - 1;
        return (
          <React.Fragment key={s.id}>
            <div className="flex shrink-0 items-center gap-2">
              <motion.div
                animate={{
                  backgroundColor: isCompleted || isActive ? "#059669" : "#ffffff",
                  borderColor: isCompleted || isActive ? "#059669" : "#d1d5db",
                  color: isCompleted || isActive ? "#ffffff" : "#94a3b8",
                }}
                transition={{ duration: 0.25 }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-bold"
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.id}
              </motion.div>
              <span
                className={`hidden text-[12.5px] font-semibold sm:block ${
                  isActive ? "text-emerald-900" : isCompleted ? "text-emerald-700/70" : "text-slate-400"
                }`}
              >
                {s.short}
              </span>
            </div>
            {!isLast && (
              <div className="h-px w-4 shrink-0 overflow-hidden rounded-full bg-slate-200 sm:w-8">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={false}
                  animate={{ width: isCompleted ? "100%" : "0%" }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Interview Blueprint — dynamic preview panel                  */
/* ------------------------------------------------------------------ */

function BlueprintRow({ label, value, placeholder }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-[11.5px] font-semibold uppercase tracking-wide text-emerald-800/50">
        {label}
      </span>
      <span
        className={`text-right text-[13.5px] font-bold ${
          value ? "text-emerald-950" : "text-emerald-800/30"
        }`}
      >
        {value || placeholder}
      </span>
    </div>
  );
}

function Blueprint({ data, userCredits, planAllowance, resumeRequired }) {
  const cost = getCreditCost(data.numberOfQuestions);
  const resumeStatus = data.resume ? "Attached" : resumeRequired ? "Required" : "Optional";

  const isReady =
    !!data.role &&
    !!data.experience &&
    !!data.interviewType &&
    !!data.difficulty &&
    data.topics.length > 0 &&
    (!resumeRequired || !!data.resume);

  const perQuestion = data.numberOfQuestions
    ? (data.duration / data.numberOfQuestions).toFixed(1)
    : null;

  return (
    <div className="rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white p-6">
      <div className="flex items-center justify-between">
        <Eyebrow icon={Sparkles}>Interview Blueprint</Eyebrow>
        <motion.span
          key={isReady ? "ready" : "building"}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
            isReady ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isReady ? "Ready" : "Building"}
        </motion.span>
      </div>

      <div className="mt-4">
        <motion.div
          key={data.role + data.experience}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className={`text-[19px] font-extrabold leading-tight ${data.role ? "text-emerald-950" : "text-emerald-800/25"}`}>
            {data.role || "Choose a role"}
          </div>
          <div className={`mt-0.5 text-[13px] font-medium ${data.experience ? "text-emerald-700" : "text-emerald-800/25"}`}>
            {data.experience || "Set your experience level"}
          </div>
        </motion.div>
      </div>

      <div className="mt-4 divide-y divide-emerald-100 border-y border-emerald-100">
        <BlueprintRow label="Format" value={data.interviewType} placeholder="Not chosen" />
        <BlueprintRow label="Difficulty" value={data.difficulty} placeholder="Not chosen" />
        <BlueprintRow label="Questions" value={data.numberOfQuestions ? `${data.numberOfQuestions}` : null} placeholder="—" />
        <BlueprintRow label="Duration" value={data.duration ? `${data.duration} min` : null} placeholder="—" />
        {perQuestion && (
          <BlueprintRow label="Pace" value={`~${perQuestion} min / question`} placeholder="—" />
        )}
      </div>

      <div className="mt-4">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-emerald-800/50">
          Focus
        </span>
        <div className="mt-2 min-h-[28px]">
          {data.topics.length === 0 ? (
            <p className="text-[13px] text-emerald-800/30">No topics selected yet</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence>
                {data.topics.map((t) => (
                  <motion.span
                    key={t}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[12px] font-semibold text-emerald-800"
                  >
                    {t}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-emerald-100 pt-4">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-emerald-800/50">Resume</span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${
            resumeStatus === "Attached"
              ? "bg-emerald-600 text-white"
              : resumeStatus === "Required"
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {resumeStatus}
        </span>
      </div>

      {userCredits !== null && userCredits !== undefined && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-950 px-4 py-3">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-200">
            <Zap className="h-3.5 w-3.5" />
            Interview cost
          </div>
          <div className="text-[14px] font-extrabold text-white">{cost} credits</div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-[12px] font-semibold text-emerald-700/70">
        <BrainCircuit className="h-4 w-4" />
        {isReady ? "AI interviewer configured and ready" : "AI interviewer is learning your setup"}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Role + Experience                                        */
/* ------------------------------------------------------------------ */

function RoleTile({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border-[1.5px] p-4 text-left transition-all duration-200 ${
        selected
          ? "border-emerald-600 bg-emerald-50"
          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-[14.5px] font-bold ${selected ? "text-emerald-900" : "text-slate-800"}`}>
            {label}
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
            {ROLE_DESCRIPTIONS[label]}
          </div>
        </div>
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all ${
            selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white group-hover:border-emerald-400"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
}

function StepOne({ data, update, errors }) {
  return (
    <div className="space-y-9">
      <div>
        <Eyebrow icon={Layers}>Role</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ROLES.map((r) => (
            <RoleTile key={r} label={r} selected={data.role === r} onClick={() => update({ role: r })} />
          ))}
        </div>
        <FieldError message={errors.role} />
      </div>

      <div>
        <Eyebrow icon={Gauge}>Experience</Eyebrow>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXPERIENCE_LEVELS.map((ex) => {
            const selected = data.experience === ex;
            return (
              <button
                key={ex}
                type="button"
                onClick={() => update({ experience: ex })}
                className={`rounded-full border-[1.5px] px-4 py-2 text-[13px] font-semibold transition-all ${
                  selected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                }`}
              >
                {ex}
              </button>
            );
          })}
        </div>
        <FieldError message={errors.experience} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Format + Difficulty                                      */
/* ------------------------------------------------------------------ */

function StepTwo({ data, update, errors }) {
  return (
    <div className="space-y-9">
      <div>
        <Eyebrow icon={BrainCircuit}>Interview Mode</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {INTERVIEW_TYPES.map((t) => {
            const selected = data.interviewType === t.label;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => update({ interviewType: t.label })}
                className={`group relative overflow-hidden rounded-2xl border-[1.5px] p-4 text-left transition-all ${
                  selected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-[13px] font-extrabold uppercase tracking-wide ${selected ? "text-emerald-800" : "text-slate-700"}`}>
                      {t.label}
                    </div>
                    <div className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{t.desc}</div>
                  </div>
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                      selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <FieldError message={errors.interviewType} />
      </div>

      <div>
        <Eyebrow icon={Gauge}>Difficulty</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {DIFFICULTIES.map((d) => {
            const meta = DIFFICULTY_META[d];
            const selected = data.difficulty === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => update({ difficulty: d })}
                className={`rounded-2xl border-[1.5px] p-4 text-left transition-all ${
                  selected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"
                }`}
              >
                <div className={`text-[14px] font-bold ${selected ? "text-emerald-900" : "text-slate-800"}`}>{d}</div>
                <div className="mt-1 text-[12px] text-slate-500">{meta.tagline}</div>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i <= meta.bars ? (selected ? "bg-emerald-600" : "bg-emerald-300") : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <FieldError message={errors.difficulty} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Technical Focus                                          */
/* ------------------------------------------------------------------ */

function StepThree({ data, update, errors }) {
  const [customTopic, setCustomTopic] = useState("");
  const [adding, setAdding] = useState(false);

  const toggleTopic = (topic) => {
    const has = data.topics.includes(topic);
    update({
      topics: has ? data.topics.filter((t) => t !== topic) : [...data.topics, topic],
    });
  };

  const addCustom = () => {
    const t = customTopic.trim();
    if (!t || data.topics.includes(t)) {
      setCustomTopic("");
      setAdding(false);
      return;
    }
    update({ topics: [...data.topics, t] });
    setCustomTopic("");
    setAdding(false);
  };

  const myProjectsSelected = data.topics.includes("My Projects");

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <Eyebrow icon={Layers}>Your Focus</Eyebrow>
        <span className="text-[12px] font-bold text-emerald-700">
          {data.topics.length === 0
            ? "No topics yet"
            : `Focusing on ${data.topics.length} area${data.topics.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="min-h-[48px] rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3">
        {data.topics.length === 0 ? (
          <p className="px-1 py-1.5 text-[13px] text-slate-400">
            Pick topics below — they define what the AI interviewer will ask.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {data.topics.map((t) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[12.5px] font-medium text-white"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className="rounded-full p-0.5 transition-colors hover:bg-white/20"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <FieldError message={errors.topics} />

      {myProjectsSelected && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-[12.5px] text-amber-800">
          Your resume will help the AI interviewer ask questions about your actual projects — a resume upload will be required in the next steps.
        </div>
      )}

      <div>
        <span className="text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Popular topics</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {PREDEFINED_TOPICS.map((t) => {
            const selected = data.topics.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTopic(t)}
                className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                  selected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/40"
                }`}
              >
                {t}
              </button>
            );
          })}

          {adding ? (
            <div className="flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-400 bg-white pl-3 pr-1 py-1">
              <input
                autoFocus
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                  if (e.key === "Escape") {
                    setAdding(false);
                    setCustomTopic("");
                  }
                }}
                placeholder="Custom topic"
                className="w-28 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={addCustom}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 rounded-full border-[1.5px] border-dashed border-slate-300 px-3.5 py-1.5 text-[13px] font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add topic
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Questions + Duration + Credit cost                       */
/* ------------------------------------------------------------------ */

function CreditPanel({ numberOfQuestions, userCredits, planAllowance, onUpgrade }) {
  const cost = getCreditCost(numberOfQuestions);
  const remaining = (userCredits ?? 0) - cost;
  const sufficient = (userCredits ?? 0) >= cost;

  if (userCredits === null || userCredits === undefined) return null;

  return (
    <div className="rounded-2xl bg-emerald-950 p-5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300">
        <Zap className="h-3.5 w-3.5" />
        Interview cost
      </div>

      <div className="mt-3 flex items-end justify-between">
        <span className="text-[30px] font-extrabold leading-none text-white">{cost}</span>
        <span className="pb-1 text-[12.5px] font-medium text-emerald-300">credits</span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${sufficient ? "bg-emerald-400" : "bg-rose-400"}`}
          style={{ width: `${Math.min((userCredits / planAllowance) * 100, 100)}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[12.5px]">
        <span className="text-emerald-300/70">Your balance</span>
        <span className="font-semibold text-white">
          {userCredits.toLocaleString()} / {planAllowance.toLocaleString()}
        </span>
      </div>

      {sufficient ? (
        <div className="mt-1 flex items-center justify-between text-[12.5px]">
          <span className="text-emerald-300/70">After this interview</span>
          <span className="font-semibold text-emerald-300">{remaining.toLocaleString()} credits</span>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-[12px] font-semibold text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            You need {cost} credits but have {userCredits}.
          </div>
          {onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13.5px] font-bold text-emerald-950 transition-colors hover:bg-emerald-50"
            >
              <Zap className="h-3.5 w-3.5" />
              Upgrade plan
            </button>
          )}
        </>
      )}
    </div>
  );
}

function StepFour({ data, update, errors, userCredits, planAllowance, onUpgrade }) {
  const pct = ((data.duration - 10) / (90 - 10)) * 100;
  const perQuestion = data.numberOfQuestions ? (data.duration / data.numberOfQuestions).toFixed(1) : null;

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow icon={Layers}>Questions</Eyebrow>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUESTION_OPTIONS.map((n) => {
            const selected = data.numberOfQuestions === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => update({ numberOfQuestions: n })}
                className={`flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] text-[14px] font-bold transition-all ${
                  selected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <FieldError message={errors.numberOfQuestions} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Eyebrow icon={Clock}>Interview length</Eyebrow>
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-[12px] font-bold text-white">
            {data.duration} min
          </span>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <input
            type="range"
            min={10}
            max={90}
            value={data.duration}
            onChange={(e) => update({ duration: Number(e.target.value) })}
            className="range-input w-full"
            style={{ background: `linear-gradient(to right, #059669 ${pct}%, #e2e8f0 ${pct}%)` }}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update({ duration: p })}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-all ${
                  data.duration === p
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"
                }`}
              >
                {p} min
              </button>
            ))}
          </div>
          {perQuestion && (
            <p className="mt-3 text-[12px] font-medium text-slate-400">
              ≈ {perQuestion} min per question at this pace
            </p>
          )}
        </div>
        <FieldError message={errors.duration} />
      </div>

      <CreditPanel
        numberOfQuestions={data.numberOfQuestions}
        userCredits={userCredits}
        planAllowance={planAllowance}
        onUpgrade={onUpgrade}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 5 — Resume                                                    */
/* ------------------------------------------------------------------ */

function StepFive({ data, update, errors }) {
  const [dragging, setDragging] = useState(false);
  const requiresResume = data.topics.includes("My Projects");

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) update({ resume: file });
  };

  const onBrowse = (e) => {
    const file = e.target.files?.[0];
    if (file) update({ resume: file });
  };

  const sizeKb = data.resume ? Math.round(data.resume.size / 1024) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100 px-4 py-3">
        <p className="text-[13px] text-emerald-900">
          Give your AI interviewer context about your experience.{" "}
          {requiresResume && (
            <span className="font-semibold text-amber-700">
              Required because "My Projects" is part of your focus.
            </span>
          )}
        </p>
      </div>

      {!data.resume ? (
        <>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors duration-200 ${
              dragging
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-emerald-50/40"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Upload className="h-5 w-5 text-emerald-700" />
            </div>
            <p className="mt-4 text-[15px] font-semibold text-slate-800">Upload resume</p>
            <p className="mt-1 text-[13.5px] text-slate-500">
              Drag & drop your resume here, or <span className="font-semibold text-emerald-700">browse</span>
            </p>
            <p className="mt-3 text-[12px] font-medium tracking-wide text-slate-400">PDF / DOC / DOCX</p>
            <input type="file" accept=".pdf,.doc,.docx" onChange={onBrowse} className="hidden" />
          </label>
          <FieldError message={errors.resume} />
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-emerald-900">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                {data.resume.name}
              </div>
              <div className="text-[12px] text-slate-500">{sizeKb} KB</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-600 transition-colors hover:border-emerald-300">
              <RefreshCw className="h-3.5 w-3.5" />
              Replace
              <input type="file" accept=".pdf,.doc,.docx" onChange={onBrowse} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => update({ resume: null })}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-600 transition-colors hover:border-rose-300 hover:text-rose-600"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showBlueprintMobile, setShowBlueprintMobile] = useState(false);

  // Credit state — fetched from backend, never trusted from frontend
  const [userCredits, setUserCredits] = useState(null);
  const [planAllowance, setPlanAllowance] = useState(10);

  const getAuthToken = () =>
    localStorage.getItem("token") || localStorage.getItem("authToken");

  // Fetch credits on mount (only if logged in)
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetchUserCredits()
      .then((data) => {
        setUserCredits(data.credits);
        setPlanAllowance(data.planAllowance ?? 10);
      })
      .catch(() => {
        // Non-critical — setup still works, credit check is enforced on backend
      });
  }, []);

  const update = (patch) => {
    setData((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const validate = (finalStep = false) => {
    const e = {};
    const validateStepOne = finalStep || step === 1;
    const validateStepTwo = finalStep || step === 2;
    const validateStepThree = finalStep || step === 3;
    const validateStepFour = finalStep || step === 4;
    const validateStepFive = finalStep || step === 5;

    if (validateStepOne) {
      if (!data.role) e.role = "Please select a role";
      if (!data.experience) e.experience = "Please select your experience level";
    }
    if (validateStepTwo) {
      if (!data.interviewType) e.interviewType = "Please select an interview type";
      if (!data.difficulty) e.difficulty = "Please select a difficulty";
    }
    if (validateStepThree) {
      if (data.topics.length === 0) e.topics = "Select at least one topic";
    }
    if (validateStepFour) {
      if (data.numberOfQuestions < 5 || data.numberOfQuestions > 10)
        e.numberOfQuestions = "Number of questions must be 5 or 10";
      if (data.duration < 10 || data.duration > 90)
        e.duration = "Duration must be between 10 and 90 minutes";
    }
    if (validateStepFive) {
      // Resume is mandatory only if "My Projects" is selected
      if (data.topics.includes("My Projects") && !data.resume) {
        e.resume = "Resume is required when My Projects is selected.";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (step === 5) {
      if (!validate(true)) return;
    } else if (!validate()) {
      return;
    }

    if (step < 5) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      const startInterview = async () => {
        setSubmitting(true);
        setErrors((prev) => ({ ...prev, submit: "" }));

        try {
          const token = getAuthToken();

          if (!token) {
            throw new Error("You need to be logged in to start an interview.");
          }

          // Extract resume text if "My Projects" is selected
          let resumeContent = null;
          const myProjectsSelected = data.topics.includes("My Projects");

          if (myProjectsSelected && data.resume) {
            try {
              const extractedText = await extractResumeText(data.resume);

              if (!extractedText || !extractedText.trim()) {
                throw new Error(
                  "Resume appears to be empty or could not be read. Please use a text-based PDF or DOCX file."
                );
              }

              resumeContent = extractedText.trim();
            } catch (error) {
              throw new Error(`Failed to extract resume: ${error.message}`);
            }
          }

          // Debug: verify resumeContent is populated before sending
          console.log("My Projects selected:", myProjectsSelected);
          console.log("Resume content length:", resumeContent?.length ?? 0);

          const payload = {
            role: data.role,
            experience: data.experience,
            interviewType: data.interviewType,
            difficulty: data.difficulty,
            topics: data.topics,
            numberOfQuestions: data.numberOfQuestions,
            duration: data.duration,
          };

          // Always include resumeContent when My Projects is selected — backend requires it
          if (myProjectsSelected) {
            payload.resumeContent = resumeContent;
          }

          const response = await api.post("/api/create-interview", payload);

          // Update credit display with the server-confirmed remaining balance
          if (response?.data?.creditsRemaining !== undefined) {
            setUserCredits(response.data.creditsRemaining);
          }

          const interviewId = response?.data?.interviewId || response?.data?.interview?._id;

          if (!interviewId) {
            throw new Error("Interview was created, but no interview id was returned.");
          }

          navigate(`/interview/${interviewId}`);
        } catch (error) {
          // Handle insufficient credits specifically
          const status = error?.response?.status;
          const responseData = error?.response?.data;

          if (status === 402 && responseData?.availableCredits !== undefined) {
            setUserCredits(responseData.availableCredits);
            setErrors((prev) => ({
              ...prev,
              submit: `Insufficient credits. You need ${responseData.requiredCredits} but have ${responseData.availableCredits}. Upgrade your plan to continue.`,
            }));
          } else {
            setErrors((prev) => ({
              ...prev,
              submit: getApiErrorMessage(error, "Unable to start interview."),
            }));
          }
        } finally {
          setSubmitting(false);
        }
      };

      startInterview();
    }
  };

  const goBack = () => {
    if (step === 1) return;
    setDirection(-1);
    setErrors({});
    setStep((s) => s - 1);
  };

  const resetForm = () => {
    setData({ ...emptyForm });
    setErrors({});
    setSubmitting(false);
    setDirection(1);
    setStep(1);
  };

  const current = STEPS[step - 1];
  const resumeRequired = data.topics.includes("My Projects");
  const insufficientCredits =
    step === 5 && userCredits !== null && userCredits < getCreditCost(data.numberOfQuestions);

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 20 : -20 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -20 : 20 }),
  };

  return (
    <div className="min-h-screen w-full bg-white">
      <style>{`
        .range-input { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 9999px; outline: none; }
        .range-input::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; height: 18px; width: 18px; border-radius: 9999px;
          background: #ffffff; border: 3px solid #059669; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          cursor: pointer; margin-top: -6px; transition: transform 0.15s ease;
        }
        .range-input::-webkit-slider-thumb:hover { transform: scale(1.12); }
        .range-input::-moz-range-thumb {
          height: 18px; width: 18px; border-radius: 9999px; background: #ffffff;
          border: 3px solid #059669; box-shadow: 0 1px 3px rgba(0,0,0,0.15); cursor: pointer;
        }
        .range-input::-moz-range-track { height: 6px; border-radius: 9999px; background: transparent; }
      `}</style>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.06),_transparent_40%)]" />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
                <BrainCircuit className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <div className="text-[14px] font-extrabold leading-none text-slate-900">Interview Studio</div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-emerald-700/60">
                  Configure your AI interviewer
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBlueprintMobile((v) => !v)}
              className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700 lg:hidden"
            >
              Blueprint
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showBlueprintMobile ? "rotate-180" : ""}`} />
            </button>
          </div>
          <StageNav step={step} />
        </div>
        <AnimatePresence>
          {showBlueprintMobile && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-100 lg:hidden"
            >
              <div className="px-5 py-4 sm:px-8">
                <Blueprint data={data} userCredits={userCredits} planAllowance={planAllowance} resumeRequired={resumeRequired} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Body */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_360px] lg:py-12">
        {/* Config column */}
        <section>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <h1 className="text-[26px] font-extrabold tracking-tight text-slate-950 sm:text-[30px]">
                {current.title}
              </h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{current.desc}</p>

              <div className="mt-8">
                {step === 1 && <StepOne data={data} update={update} errors={errors} />}
                {step === 2 && <StepTwo data={data} update={update} errors={errors} />}
                {step === 3 && <StepThree data={data} update={update} errors={errors} />}
                {step === 4 && (
                  <StepFour
                    data={data}
                    update={update}
                    errors={errors}
                    userCredits={userCredits}
                    planAllowance={planAllowance}
                    onUpgrade={() => navigate("/pricing")}
                  />
                )}
                {step === 5 && <StepFive data={data} update={update} errors={errors} />}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom navigation */}
          <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
            <div className="flex items-center gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={resetForm}
                className="hidden items-center gap-1 text-[12.5px] font-semibold text-slate-400 hover:text-slate-600 sm:flex"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={submitting || insufficientCredits}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-3 text-[14px] font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-emerald-600/35 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing your interview...
                </>
              ) : insufficientCredits ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Insufficient credits
                </>
              ) : step === 5 ? (
                <>
                  Start interview
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {errors.submit ? (
            <div className="mt-3 text-right">
              <p className="text-[13px] font-medium text-rose-600">{errors.submit}</p>
              {errors.submit.toLowerCase().includes("insufficient") && (
                <button
                  type="button"
                  onClick={() => navigate("/pricing")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1.5 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Upgrade plan
                </button>
              )}
            </div>
          ) : null}
        </section>

        {/* Live blueprint column — desktop only */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <Blueprint data={data} userCredits={userCredits} planAllowance={planAllowance} resumeRequired={resumeRequired} />
            <div className="mt-4 flex items-center gap-2 px-1 text-[11.5px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Your selections stay private to this setup session.
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}