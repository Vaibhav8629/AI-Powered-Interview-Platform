import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Upload,
  FileText,
  RefreshCw,
  Loader2,
  Zap,
  AlertTriangle,
  BrainCircuit,
  ShieldCheck,
} from "lucide-react";
import api, { getApiErrorMessage, fetchUserCredits } from "../services/api";
import { extractResumeText } from "../services/resumeParser";

/* ------------------------------------------------------------------ */
/*  Static config                                                     */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 1, title: "Interview Profile", desc: "Tell us about your role and experience" },
  { id: 2, title: "Interview Configuration", desc: "Choose the interview type and difficulty" },
  { id: 3, title: "Technical Focus", desc: "Select the topics you want to practice" },
  { id: 4, title: "Interview Controls", desc: "Set questions and interview duration" },
  { id: 5, title: "Resume", desc: "Upload your resume" },
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

const EXPERIENCE_LEVELS = ["Fresher", "0–1 years", "1–3 years", "3–5 years", "5+ years"];
const INTERVIEW_TYPES = [
  { label: "Technical", desc: "Core CS & role-specific problem solving" },
  { label: "HR", desc: "Culture fit, background & expectations" },
  { label: "Behavioral", desc: "Past experiences & soft skills" },
  { label: "Mixed", desc: "A blend of technical and behavioral" },
];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
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

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-3 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

function SelectCard({ label, sublabel, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
        selected
          ? "border-indigo-500 bg-indigo-50 shadow-[0_12px_30px_-18px_rgba(79,70,229,0.9)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_12px_30px_-22px_rgba(15,23,42,0.45)]"
      }`}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={`text-[14.5px] font-semibold ${
              selected ? "text-indigo-950" : "text-slate-800"
            }`}
          >
            {label}
          </div>
          {sublabel && (
            <div className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{sublabel}</div>
          )}
        </div>
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
            selected
              ? "border-indigo-600 bg-indigo-600"
              : "border-slate-300 bg-white group-hover:border-indigo-400"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
}

function Slider({ label, min, max, value, unit, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13.5px] font-bold text-slate-800">{label}</span>
        <span className="rounded-lg bg-indigo-600 px-3 py-1 text-[12px] font-bold text-white shadow-sm">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input w-full"
        style={{
          background: `linear-gradient(to right, #4f46e5 ${pct}%, #e2e8f0 ${pct}%)`,
        }}
      />
      <div className="mt-2 flex justify-between text-[11.5px] font-medium text-slate-400">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Left panel                                                        */
/* ------------------------------------------------------------------ */

function LeftPanel({ step, data }) {
  return (
    <aside className="relative flex h-full flex-col overflow-hidden bg-slate-950 px-6 py-7 text-white lg:px-8 lg:py-9">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 shadow-lg shadow-indigo-900/60"><BrainCircuit className="h-5 w-5 text-white" /></div>
          <div><span className="block text-[15px] font-bold tracking-tight">InterviewAI</span><span className="text-[10px] font-bold tracking-[0.16em] text-slate-400">PRACTICE STUDIO</span></div>
        </div>
        <div className="mt-9 hidden lg:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300">Guided setup</p>
          <h1 className="mt-3 text-[30px] font-bold leading-[1.15] tracking-tight">Shape a practice session that feels like the real thing.</h1>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-slate-400">Set your focus, calibrate the challenge, and let the interviewer adapt to your goals.</p>
        </div>
        <div className="mt-7 lg:mt-10">
          {STEPS.map((s, idx) => {
            const isCompleted = s.id < step;
            const isActive = s.id === step;
            const isLast = idx === STEPS.length - 1;
            return (
              <div key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast && <span className="absolute left-[13px] top-7 h-[calc(100%-1rem)] w-px overflow-hidden rounded-full bg-slate-700"><motion.span className="block w-full bg-indigo-400" initial={false} animate={{ height: isCompleted ? "100%" : "0%" }} transition={{ duration: 0.4, ease: "easeInOut" }} /></span>}
                <motion.div animate={{ scale: isActive ? 1.08 : 1, boxShadow: isActive ? "0 0 0 5px rgba(129,140,248,0.16)" : "0 0 0 0px rgba(129,140,248,0)" }} transition={{ duration: 0.25 }} className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${isCompleted ? "border-indigo-400 bg-indigo-400 text-white" : isActive ? "border-indigo-300 bg-indigo-400/10 text-indigo-200" : "border-slate-700 bg-slate-900 text-slate-500"}`}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : String(s.id).padStart(2, "0")}
                </motion.div>
                <div className="pt-0.5"><div className={`text-[13px] font-semibold ${isActive ? "text-white" : isCompleted ? "text-slate-300" : "text-slate-500"}`}>{s.title}</div><div className={`mt-0.5 hidden text-[11px] lg:block ${isActive ? "text-slate-400" : "text-slate-600"}`}>{s.desc}</div></div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative mt-auto hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm lg:block"><div className="flex items-center gap-2 text-[12px] font-bold text-slate-200"><ShieldCheck className="h-4 w-4 text-cyan-300" />Personalized, private practice</div><p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">{data.role ? `${data.role} interview profile in progress.` : "Your selections stay in this secure setup session."}</p></div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Step content                                                      */
/* ------------------------------------------------------------------ */

function StepOne({ data, update, errors }) {
  return (
    <div className="space-y-8">
      <div>
        <label className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
          Role
        </label>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <SelectCard
              key={r}
              label={r}
              selected={data.role === r}
              onClick={() => update({ role: r })}
            />
          ))}
        </div>
        <FieldError message={errors.role} />
      </div>

      <div>
        <label className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
          Experience
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {EXPERIENCE_LEVELS.map((ex) => (
            <SelectCard
              key={ex}
              label={ex}
              selected={data.experience === ex}
              onClick={() => update({ experience: ex })}
            />
          ))}
        </div>
        <FieldError message={errors.experience} />
      </div>
    </div>
  );
}

function StepTwo({ data, update, errors }) {
  return (
    <div className="space-y-8">
      <div>
        <label className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
          Interview Type
        </label>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {INTERVIEW_TYPES.map((t) => (
            <SelectCard
              key={t.label}
              label={t.label}
              sublabel={t.desc}
              selected={data.interviewType === t.label}
              onClick={() => update({ interviewType: t.label })}
            />
          ))}
        </div>
        <FieldError message={errors.interviewType} />
      </div>

      <div>
        <label className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
          Difficulty
        </label>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((d) => (
            <SelectCard
              key={d}
              label={d}
              selected={data.difficulty === d}
              onClick={() => update({ difficulty: d })}
            />
          ))}
        </div>
        <FieldError message={errors.difficulty} />
      </div>
    </div>
  );
}

function StepThree({ data, update, errors }) {
  const [customTopic, setCustomTopic] = useState("");

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
      return;
    }
    update({ topics: [...data.topics, t] });
    setCustomTopic("");
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
          Selected Topics
        </label>
        <div className="mt-3 min-h-[52px] rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/60 p-3">
          {data.topics.length === 0 ? (
            <p className="px-1 py-1.5 text-[13px] text-neutral-400">
              No topics selected yet — pick from below or add your own.
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
                    className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-[12.5px] font-medium text-white"
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
      </div>

      <div>
        <label className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
          Predefined Topics
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {PREDEFINED_TOPICS.map((t) => {
            const selected = data.topics.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTopic(t)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                  selected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40"
                }`}
              >
                {selected ? "✓ " : ""}
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
          Add Custom Topic
        </label>
        <div className="mt-3 flex gap-2">
          <input
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="e.g. GraphQL, Docker..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={addCustom}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Topic
          </button>
        </div>
      </div>
    </div>
  );
}

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

function CreditCostPreview({ numberOfQuestions, userCredits, planAllowance, onUpgrade }) {
  const cost = getCreditCost(numberOfQuestions);
  const remaining = (userCredits ?? 0) - cost;
  const sufficient = (userCredits ?? 0) >= cost;

  if (userCredits === null || userCredits === undefined) return null;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        sufficient
          ? "border-indigo-200 bg-indigo-50/60"
          : "border-rose-200 bg-rose-50/60"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className={`h-4 w-4 ${sufficient ? "text-indigo-600" : "text-rose-500"}`} />
        <span className="text-[13px] font-bold text-neutral-700 uppercase tracking-wide">
          Credit Summary
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-2.5">
        <div className="text-[13px] text-neutral-500">Interview cost</div>
        <div className={`text-[13px] font-bold text-right ${sufficient ? "text-indigo-700" : "text-rose-600"}`}>
          {cost} credits
        </div>
        <div className="text-[13px] text-neutral-500">Available credits</div>
        <div className="text-[13px] font-semibold text-right text-neutral-700">
          {userCredits.toLocaleString()} / {planAllowance.toLocaleString()}
        </div>
        {sufficient ? (
          <>
            <div className="text-[13px] text-neutral-500">Remaining after</div>
            <div className="text-[13px] font-semibold text-right text-indigo-700">
              {remaining.toLocaleString()} credits
            </div>
          </>
        ) : (
          <>
            <div className="text-[13px] text-rose-600 font-semibold col-span-2 mt-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Insufficient credits. You need {cost} but have {userCredits}.
            </div>
          </>
        )}
      </div>
      {/* Credit bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              sufficient ? "bg-indigo-500" : "bg-rose-400"
            }`}
            style={{ width: `${Math.min((userCredits / planAllowance) * 100, 100)}%` }}
          />
        </div>
      </div>
      {!sufficient && onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-rose-700 transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          Upgrade Plan
        </button>
      )}
    </div>
  );
}

function StepFour({ data, update, errors, userCredits, planAllowance, onUpgrade }) {
  return (
    <div className="space-y-6">
      <Slider
        label="Number of Questions"
        min={5}
        max={10}
        unit="questions"
        value={data.numberOfQuestions}
        onChange={(v) => update({ numberOfQuestions: v })}
      />
      <FieldError message={errors.numberOfQuestions} />

      <Slider
        label="Interview Duration"
        min={10}
        max={90}
        unit="min"
        value={data.duration}
        onChange={(v) => update({ duration: v })}
      />
      <FieldError message={errors.duration} />

      <CreditCostPreview
        numberOfQuestions={data.numberOfQuestions}
        userCredits={userCredits}
        planAllowance={planAllowance}
        onUpgrade={onUpgrade}
      />
    </div>
  );
}

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
    <div>
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
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/40"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <Upload className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="mt-4 text-[15px] font-semibold text-neutral-800">
              Upload Resume
            </p>
            <p className="mt-1 text-[13.5px] text-neutral-500">
              Drag & drop your resume here, or{" "}
              <span className="font-semibold text-indigo-600">Browse</span>
            </p>
            <p className="mt-3 text-[12px] font-medium tracking-wide text-neutral-400">
              PDF / DOC / DOCX
            </p>
            {requiresResume && (
              <p className="mt-3 text-[12px] font-medium text-amber-600">
                Resume is required when My Projects is selected
              </p>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={onBrowse}
              className="hidden"
            />
          </label>
          <FieldError message={errors.resume} />
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-indigo-800">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                {data.resume.name}
              </div>
              <div className="text-[12px] text-neutral-500">{sizeKb} KB</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-600 transition-colors hover:border-indigo-300">
              <RefreshCw className="h-3.5 w-3.5" />
              Replace
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={onBrowse}
                className="hidden"
              />
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
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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

  const pct = (step / STEPS.length) * 100;
  const current = STEPS[step - 1];

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -24 : 24 }),
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 p-0 lg:p-5">
      <style>{`
        .range-input {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          outline: none;
        }
        .range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid #4f46e5;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          cursor: pointer;
          margin-top: -6px;
          transition: transform 0.15s ease;
        }
        .range-input::-webkit-slider-thumb:hover {
          transform: scale(1.12);
        }
        .range-input::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid #4f46e5;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          cursor: pointer;
        }
        .range-input::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
          background: transparent;
        }
      `}</style>

      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col overflow-hidden bg-white lg:min-h-[calc(100vh-2.5rem)] lg:flex-row lg:rounded-[28px] lg:shadow-2xl lg:shadow-slate-900/10">
      {/* Progress rail */}
      <div className="w-full lg:w-[34%]">
        <LeftPanel step={step} data={data} />
      </div>

      {/* Setup canvas */}
      <div className="flex w-full flex-1 flex-col bg-[radial-gradient(circle_at_top_right,_rgba(224,231,255,0.7),_transparent_30%)] lg:w-[66%]">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
          {/* Progress header */}
          <div>
            <div className="flex items-center justify-between">
              <div><span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Interview blueprint</span><p className="mt-1 text-[13px] font-semibold text-slate-600">Step {step} of {STEPS.length}</p></div>
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[12px] font-bold text-indigo-700">{Math.round(pct)}% complete</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="mt-7 flex-1 overflow-y-auto pr-1 lg:pr-3">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <h2 className="text-[27px] font-bold tracking-tight text-slate-950">
                  {current.title}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{current.desc}</p>

                <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] sm:p-7">
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
          </div>

          {/* Bottom nav */}
          <div className="mt-7 flex items-center justify-between border-t border-slate-200 pt-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:flex"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={
                submitting ||
                (step === 5 &&
                  userCredits !== null &&
                  userCredits < getCreditCost(data.numberOfQuestions))
              }
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : step === 5 &&
                userCredits !== null &&
                userCredits < getCreditCost(data.numberOfQuestions) ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Insufficient Credits
                </>
              ) : step === 5 ? (
                "Start Interview"
              ) : (
                <>
                  Next
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
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Upgrade Plan
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
    </div>
  );
}
