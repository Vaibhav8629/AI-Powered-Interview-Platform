import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  X,
  Upload,
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";
import ScannerBackground from '../components/ScannerBackground';
import api, { getApiErrorMessage } from "../services/api";

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
    <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-rose-600">
      <span className="inline-block h-1 w-1 rounded-full bg-rose-500" />
      {message}
    </p>
  );
}

function SelectCard({ label, sublabel, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
        selected
          ? "border-emerald-500 bg-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
          : "border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={`text-[14.5px] font-semibold ${
              selected ? "text-emerald-800" : "text-neutral-800"
            }`}
          >
            {label}
          </div>
          {sublabel && (
            <div className="mt-0.5 text-[12.5px] text-neutral-500">{sublabel}</div>
          )}
        </div>
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
            selected
              ? "border-emerald-500 bg-emerald-500"
              : "border-neutral-300 bg-white group-hover:border-emerald-400"
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13.5px] font-semibold text-neutral-700">{label}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-bold text-emerald-700">
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
          background: `linear-gradient(to right, #10b981 ${pct}%, #e5e7eb ${pct}%)`,
        }}
      />
      <div className="mt-2 flex justify-between text-[11.5px] font-medium text-neutral-400">
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

function LeftPanel({ step }) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-emerald-50/50 px-8 py-8 lg:px-10 lg:py-10">
      {/* ambient blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />

      <div className="relative">
        {/* Branding */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-neutral-900">
            InterviewAI
          </span>
        </div>
        <p className="mt-1.5 text-[12.5px] text-neutral-500">
          Your personalized interview starts here.
        </p>

        {/* Hero */}
        <h1 className="mt-9 text-[32px] font-extrabold leading-[1.15] tracking-tight text-neutral-900">
          Build your <span className="text-emerald-600">perfect interview.</span>
        </h1>
        <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-neutral-500">
          Customize your interview based on your role, experience, technical
          focus and goals.
        </p>

        {/* Stepper */}
        <div className="mt-10">
          {STEPS.map((s, idx) => {
            const isCompleted = s.id < step;
            const isActive = s.id === step;
            const isLast = idx === STEPS.length - 1;
            return (
              <div key={s.id} className="relative flex gap-4 pb-7 last:pb-0">
                {!isLast && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-[2px] overflow-hidden rounded-full bg-neutral-200">
                    <motion.span
                      className="block w-full bg-emerald-500"
                      initial={false}
                      animate={{ height: isCompleted ? "100%" : "0%" }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    />
                  </span>
                )}
                <div className="relative z-10 shrink-0">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.08 : 1,
                      boxShadow: isActive
                        ? "0 0 0 6px rgba(16,185,129,0.15)"
                        : "0 0 0 0px rgba(16,185,129,0)",
                    }}
                    transition={{ duration: 0.25 }}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[12.5px] font-bold transition-colors duration-300 ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isActive
                        ? "border-emerald-500 bg-white text-emerald-600"
                        : "border-neutral-300 bg-white text-neutral-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      String(s.id).padStart(2, "0")
                    )}
                  </motion.div>
                </div>
                <div className="pt-1">
                  <div
                    className={`text-[14px] font-semibold transition-colors ${
                      isActive
                        ? "text-emerald-800"
                        : isCompleted
                        ? "text-neutral-700"
                        : "text-neutral-400"
                    }`}
                  >
                    {s.title}
                  </div>
                  <div
                    className={`mt-0.5 text-[12.5px] ${
                      isActive ? "text-neutral-500" : "text-neutral-400"
                    }`}
                  >
                    {s.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supporting card */}
      <div className="relative mt-8 rounded-2xl border border-emerald-100 bg-white/80 p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-neutral-800">
              AI-powered interview setup
            </div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">
              Your selections will be used to create a personalized interview
              experience tailored to your goals.
            </p>
          </div>
        </div>
      </div>
    </div>
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
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-emerald-300 hover:bg-emerald-50/40"
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
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={addCustom}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Topic
          </button>
        </div>
      </div>
    </div>
  );
}

function StepFour({ data, update, errors }) {
  return (
    <div className="space-y-6">
      <Slider
        label="Number of Questions"
        min={5}
        max={15}
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
    </div>
  );
}

function StepFive({ data, update }) {
  const [dragging, setDragging] = useState(false);

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
              : "border-neutral-250 bg-neutral-50/60 hover:border-emerald-300 hover:bg-emerald-50/40"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Upload className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-4 text-[15px] font-semibold text-neutral-800">
            Upload Resume
          </p>
          <p className="mt-1 text-[13.5px] text-neutral-500">
            Drag & drop your resume here, or{" "}
            <span className="font-semibold text-emerald-600">Browse</span>
          </p>
          <p className="mt-3 text-[12px] font-medium tracking-wide text-neutral-400">
            PDF / DOC / DOCX
          </p>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={onBrowse}
            className="hidden"
          />
        </label>
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
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-emerald-800">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                {data.resume.name}
              </div>
              <div className="text-[12px] text-neutral-500">{sizeKb} KB</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-neutral-600 transition-colors hover:border-emerald-300">
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

  const getAuthToken = () =>
    localStorage.getItem("token") || localStorage.getItem("authToken");

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
      if (data.numberOfQuestions < 5 || data.numberOfQuestions > 15)
        e.numberOfQuestions = "Number of questions must be between 5 and 15";
      if (data.duration < 10 || data.duration > 90)
        e.duration = "Duration must be between 10 and 90 minutes";
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

          const response = await api.post("/api/create-interview", {
            role: data.role,
            experience: data.experience,
            interviewType: data.interviewType,
            difficulty: data.difficulty,
            topics: data.topics,
            numberOfQuestions: data.numberOfQuestions,
            duration: data.duration,
          });

          const interviewId = response?.data?.interviewId || response?.data?.interview?._id;

          if (!interviewId) {
            throw new Error("Interview was created, but no interview id was returned.");
          }

          navigate(`/interview/${interviewId}`);
        } catch (error) {
          setErrors((prev) => ({
            ...prev,
            submit: getApiErrorMessage(error, "Unable to start interview."),
          }));
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
    <div className="flex h-screen w-full flex-col bg-neutral-50 lg:flex-row">
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
          border: 3px solid #10b981;
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
          border: 3px solid #10b981;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          cursor: pointer;
        }
        .range-input::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
          background: transparent;
        }
      `}</style>

      {/* LEFT — 40% */}
      <div className="w-full lg:h-full lg:w-[40%]">
        <LeftPanel step={step} />
      </div>

      {/* RIGHT — 60% */}
      <div className="flex w-full flex-1 flex-col lg:h-full lg:w-[60%]">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-6 py-8 lg:px-12 lg:py-12">
          {/* Progress header */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-neutral-500">
                Step {step} of {STEPS.length}
              </span>
              <span className="text-[13px] font-bold text-emerald-600">
                {Math.round(pct)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="mt-8 flex-1 overflow-y-auto pr-1">
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
                <h2 className="text-[24px] font-bold tracking-tight text-neutral-900">
                  {current.title}
                </h2>
                <p className="mt-1.5 text-[14px] text-neutral-500">{current.desc}</p>

                <div className="mt-7">
                  {step === 1 && <StepOne data={data} update={update} errors={errors} />}
                  {step === 2 && <StepTwo data={data} update={update} errors={errors} />}
                  {step === 3 && <StepThree data={data} update={update} errors={errors} />}
                  {step === 4 && <StepFour data={data} update={update} errors={errors} />}
                  {step === 5 && <StepFive data={data} update={update} />}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom nav */}
          <div className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[14px] font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
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
            <p className="mt-3 text-right text-[13px] font-medium text-rose-600">
              {errors.submit}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}