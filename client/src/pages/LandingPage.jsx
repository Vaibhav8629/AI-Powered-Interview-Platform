import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Zap, ArrowRight, Play, CheckCircle2, Mic, Brain, BarChart3, Target,
  TrendingUp, Clock, Shield, Sparkles, MessageSquare, BrainCircuit,
  ChevronDown, Star, Menu, X, Briefcase, Activity, Volume2,
  MousePointer2, LockKeyhole, ShieldCheck, FileText,
  Users, Award, Layers
} from "lucide-react";
import { fetchUserCredits } from "../services/api";
import CreditBadge from "../components/CreditBadge";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#faq", label: "FAQ" },
];

const STATS = [
  { value: "10K+", label: "Interviews completed" },
  { value: "94%", label: "User satisfaction" },
  { value: "8 roles", label: "Supported paths" },
  { value: "< 2s", label: "AI response time" },
];

const FEATURES = [
  {
    step: "01",
    icon: BrainCircuit,
    title: "Adaptive question flow",
    body: "The AI follows your actual answer — asking sharper follow-ups when your reasoning needs more depth, and pivoting when you're already strong.",
    accent: "#10b981",
    bg: "rgba(16,185,129,0.06)",
  },
  {
    step: "02",
    icon: Target,
    title: "Role-aware setup",
    body: "Configure every session around role, seniority, interview type, and the specific skills you want to pressure-test.",
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
  },
  {
    step: "03",
    icon: Mic,
    title: "Voice-first practice",
    body: "Practice out loud with live transcription. The pace feels closer to a real conversation than a typing exercise.",
    accent: "#3b82f6",
    bg: "rgba(59,130,246,0.06)",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "Actionable review",
    body: "Every session becomes structured feedback on structure, communication, technical accuracy, and confidence — not just a score.",
    accent: "#e11d48",
    bg: "rgba(225,29,72,0.06)",
  },
];

const WORKFLOW = [
  {
    step: "01",
    icon: Briefcase,
    title: "Configure your room",
    body: "Choose role, level, domain, and interview type. Resume upload gives the AI deeper context.",
    color: "var(--brand-600)",
  },
  {
    step: "02",
    icon: Volume2,
    title: "Answer naturally",
    body: "Speak through real interview prompts. The AI listens, transcribes, and adapts its follow-ups to your response.",
    color: "#2563eb",
  },
  {
    step: "03",
    icon: FileText,
    title: "Review the signal",
    body: "Get a structured performance report: dimension scores, question-by-question feedback, and your clearest next steps.",
    color: "#7c3aed",
  },
];

const CAPABILITIES = [
  { title: "Adaptive questions", body: "Follow-ups adjust to the strength and clarity of each answer.", icon: BrainCircuit, image: "/Adaptive_question.png" },
  { title: "Role-based interviews", body: "Sessions match the job function, seniority, and interview style you select.", icon: Briefcase, image: "/Role_based_interviews.png" },
  { title: "Real-time evaluation", body: "The session tracks communication, confidence, and technical reasoning as you speak.", icon: Activity, image: "/Real_time_evaluation.png" },
  { title: "Performance insights", body: "Feedback highlights the areas that matter most before your next round.", icon: TrendingUp, image: "/Performance_insights.png" },
  { title: "Voice-native practice", body: "Speak, pause, and recover the way you would in a live interview room.", icon: Mic, image: "/Voice_native.png" },
];

const FAQS = [
  { q: "How realistic are the follow-up questions?", a: "The interview flow is based on your actual answer — follow-ups probe missing details, tradeoffs, examples, or unclear reasoning. It's not a static question bank." },
  { q: "Can I practice for different roles?", a: "Yes. The setup flow lets you tailor sessions to role, experience level, interview type, and the specific skills you want to practice." },
  { q: "Does voice practice feel like a real interview?", a: "The product is built around spoken answers, live transcription, listening states, and post-session feedback — not typed drills." },
  { q: "How does the credit system work?", a: "Each question answered uses one credit. Credits reset monthly based on your plan. You can start free with 10 credits per month." },
  { q: "Where do I see my previous sessions?", a: "Use the History view to return to any completed interview, review your scores, and re-read the AI's feedback on each answer." },
];

const ANSWER_TEXT = "I'd approach this by first clarifying the traffic volume and request patterns. For a token-bucket approach, I'd store state in Redis with an atomic increment. The key tradeoff versus leaky-bucket is burst capacity — token-bucket allows short bursts while leaky-bucket smooths them out.";

/* ─── Animation helpers ───────────────────────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };

function AnimatedSection({ children, className, id, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      id={id}
      ref={ref}
      className={className}
      style={style}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
    >
      {children}
    </motion.section>
  );
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [creditInfo, setCreditInfo] = useState(null);
  const [typedLen, setTypedLen] = useState(0);
  const waveBars = useRef([36, 58, 42, 76, 54, 88, 64, 45, 72, 52, 84, 61, 44, 70, 96, 58, 82, 47, 63, 75, 50, 69]).current;

  const transcript = useMemo(() => ANSWER_TEXT.slice(0, typedLen), [typedLen]);

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    if (token) fetchUserCredits().then(setCreditInfo).catch(() => null);
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    let dir = 1;
    const id = setInterval(() => {
      setTypedLen((l) => {
        if (l >= ANSWER_TEXT.length && dir === 1) { dir = -1; return l; }
        if (l <= 0 && dir === -1) { dir = 1; return l; }
        return l + dir;
      });
    }, 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "#fff" }}>
      {/* ─── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", inset: "0 0 auto", zIndex: 50,
        background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(15,23,42,0.07)" : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 24px rgba(15,23,42,0.06)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", gap: 32 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <div style={{ width: 33, height: 33, borderRadius: 9, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(5,150,105,0.3)" }}>
              <Zap size={17} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>InterviewAI</span>
          </a>

          {/* Desktop links */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: "auto" }} className="lp-nav-links">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 550, color: "#4b5563", textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={e => { e.target.style.color = "#111827"; e.target.style.background = "rgba(0,0,0,0.04)"; }}
                onMouseLeave={e => { e.target.style.color = "#4b5563"; e.target.style.background = "none"; }}
              >{l.label}</a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="lp-nav-actions">
            {creditInfo && (
              <CreditBadge credits={creditInfo.credits} planAllowance={creditInfo.planAllowance ?? 100} plan={creditInfo.plan ?? "free"} onClick={() => navigate("/pricing")} />
            )}
            <button type="button" onClick={() => navigate("/login")}
              style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 650, color: "#374151", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#10b981"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
            >Sign in</button>
            <button type="button" onClick={() => navigate("/interview/setup")}
              style={{ background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(5,150,105,0.28)", transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >Start free</button>
          </div>

          {/* Mobile hamburger */}
          <button type="button" onClick={() => setMenuOpen(o => !o)} className="lp-hamburger"
            style={{ display: "none", width: 40, height: 40, background: "none", border: "1px solid #e2e8f0", borderRadius: 8, alignItems: "center", justifyContent: "center", cursor: "pointer", marginLeft: "auto" }}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: "hidden", background: "#fff", borderTop: "1px solid #f1f5f9" }}
            >
              <div style={{ padding: "12px 20px 20px" }}>
                {NAV_LINKS.map(l => (
                  <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                    style={{ display: "block", padding: "12px 14px", borderRadius: 8, fontSize: 15, fontWeight: 550, color: "#374151", textDecoration: "none" }}
                  >{l.label}</a>
                ))}
                <div style={{ height: 1, background: "#f1f5f9", margin: "8px 0" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => navigate("/login")} style={{ flex: 1, padding: 11, background: "none", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, fontWeight: 650, cursor: "pointer" }}>Sign in</button>
                  <button type="button" onClick={() => navigate("/register")} style={{ flex: 1, padding: 11, background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Get started</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 100, paddingBottom: 80, position: "relative", overflow: "hidden" }}>
        {/* Background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 90%)" }} aria-hidden="true" />
        <div style={{ position: "absolute", top: -200, left: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ position: "absolute", top: -100, right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", pointerEvents: "none" }} aria-hidden="true" />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", minHeight: "calc(100vh - 160px)" }} className="hero-grid">

            {/* Left copy */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.3)", color: "#047857", fontSize: 12.5, fontWeight: 750, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 24 }}
              >
                <Sparkles size={13} />
                AI-powered mock interviews
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                style={{ fontSize: "clamp(44px, 5.5vw, 72px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.03em", color: "#0f172a", margin: "0 0 20px" }}
              >
                Practice the
                <span style={{ display: "block", background: "linear-gradient(90deg, #047857, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> interview,</span>
                not just the answers.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{ fontSize: 18, lineHeight: 1.75, color: "#4b5563", margin: "0 0 36px", maxWidth: 520 }}
              >
                A voice-first interview workspace with adaptive AI prompts, real-time evaluation, and feedback that turns each session into a sharper next attempt.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}
              >
                <button type="button" onClick={() => navigate("/interview/setup")}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 26px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 8px 28px rgba(5,150,105,0.32)", transition: "transform 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <Play size={17} />
                  Start mock interview
                </button>
                <button type="button" onClick={() => navigate("/interview/history")}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 24px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 15, fontWeight: 650, color: "#374151", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <Clock size={17} />
                  View history
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                style={{ display: "flex", flexWrap: "wrap", gap: 20 }}
              >
                {["Role-based setup", "Voice-native sessions", "AI-generated feedback"].map(item => (
                  <span key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 650, color: "#4b5563" }}>
                    <CheckCircle2 size={15} color="#059669" />
                    {item}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — interview preview widget */}
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              style={{ position: "relative" }}
            >
              {/* Glow */}
              <div style={{ position: "absolute", inset: -40, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)", zIndex: -1 }} aria-hidden="true" />

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, boxShadow: "0 24px 80px rgba(15,23,42,0.14), 0 8px 24px rgba(15,23,42,0.07)", overflow: "hidden" }}>
                {/* Mock window chrome */}
                <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["#f87171", "#fbbf24", "#34d399"].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 750, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live session</div>
                      <div style={{ fontSize: 15, fontWeight: 750, color: "#0f172a", marginTop: 2 }}>Frontend systems interview</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", fontSize: 11.5, fontWeight: 800, color: "#047857" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulse 2s ease-in-out infinite" }} />
                      Listening
                    </div>
                  </div>
                </div>

                <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Question */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      <Brain size={13} /> Current prompt
                    </div>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: "#1e293b", lineHeight: 1.55 }}>
                      Walk me through how you'd design a rate limiter for a high-traffic API.
                    </p>
                  </div>

                  {/* Waveform */}
                  <div style={{ background: "#0f172a", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        <Mic size={12} /> Voice answer
                      </div>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>01:42</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 44 }} aria-hidden="true">
                      {waveBars.map((h, i) => (
                        <div key={i} style={{ flex: "0 0 3px", height: `${h}%`, borderRadius: 99, background: "linear-gradient(to top, #059669, #34d399)", animation: "wave 1.2s ease-in-out infinite alternate", animationDelay: `${i * 0.05}s` }} />
                      ))}
                    </div>
                  </div>

                  {/* Transcript */}
                  <div style={{ background: "#f0fdf4", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#047857", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>
                      <MessageSquare size={12} /> Live transcript
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#1e293b", lineHeight: 1.65, minHeight: 40 }}>
                      {transcript}<span style={{ display: "inline-block", width: 2, height: 14, background: "#10b981", verticalAlign: "text-bottom", animation: "caret 1s steps(2, start) infinite", marginLeft: 1 }} />
                    </p>
                  </div>

                  {/* Score meters */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[{ label: "Structure", v: 82 }, { label: "Depth", v: 74 }, { label: "Clarity", v: 89 }].map(m => (
                      <div key={m.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{m.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{m.v}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${m.v}%`, borderRadius: 99, background: "linear-gradient(90deg, #059669, #10b981)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ───────────────────────────────────────────────────── */}
      <section style={{ background: "#f8fafc", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "36px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, textAlign: "center" }} className="stats-grid">
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: "#047857", letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13.5, color: "#64748b", fontWeight: 550, marginTop: 6 }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────────── */}
      <AnimatedSection id="features" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div variants={fadeUp} style={{ maxWidth: 680, marginBottom: 60 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>
              <Sparkles size={12} /> Practice stack
            </div>
            <h2 style={{ fontSize: "clamp(32px, 3.5vw, 46px)", fontWeight: 850, letterSpacing: "-0.025em", color: "#0f172a", lineHeight: 1.1, margin: "0 0 16px" }}>
              Everything in the session moves you toward a better answer.
            </h2>
            <p style={{ fontSize: 17, color: "#4b5563", lineHeight: 1.75, margin: 0 }}>
              The interview environment is built around voice practice, adaptive prompts, and structured review — not just a question list.
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }} className="features-grid">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} variants={fadeUp} transition={{ delay: i * 0.08 }}
                  style={{ padding: "28px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 18, boxShadow: "0 2px 12px rgba(15,23,42,0.05)", transition: "all 0.2s ease", cursor: "default", position: "relative", overflow: "hidden" }}
                  whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(15,23,42,0.10)" }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${f.accent}, transparent)`, borderRadius: "18px 18px 0 0" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 13, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={22} color={f.accent} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.08em" }}>{f.step}</span>
                        <h3 style={{ fontSize: 17, fontWeight: 750, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>{f.title}</h3>
                      </div>
                      <p style={{ fontSize: 14.5, color: "#4b5563", lineHeight: 1.7, margin: 0 }}>{f.body}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: "#f8fafc", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: "center", marginBottom: 64 }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>
              <Layers size={12} /> How it works
            </div>
            <h2 style={{ fontSize: "clamp(30px, 3.2vw, 44px)", fontWeight: 850, letterSpacing: "-0.025em", color: "#0f172a", margin: "0 0 16px" }}>
              From setup to review in one clean loop.
            </h2>
            <p style={{ fontSize: 17, color: "#4b5563", lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
              Each step reduces ambiguity — choose the session, answer naturally, then understand exactly what to improve.
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, position: "relative" }} className="workflow-grid">
            {/* Connector line */}
            <div style={{ position: "absolute", top: 56, left: "17%", right: "17%", height: 1, background: "linear-gradient(90deg, transparent, #e2e8f0, #e2e8f0, transparent)", zIndex: 0 }} className="workflow-connector" aria-hidden="true" />

            {WORKFLOW.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div key={w.step}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  style={{ textAlign: "center", padding: "0 16px", position: "relative", zIndex: 1 }}
                >
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fff", border: "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 4px 16px rgba(15,23,42,0.06)", transition: "all 0.25s" }}>
                    <Icon size={28} color={w.color} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{w.step}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 750, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.01em" }}>{w.title}</h3>
                  <p style={{ fontSize: 14.5, color: "#4b5563", lineHeight: 1.7, margin: 0 }}>{w.body}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginTop: 56 }}>
            <button type="button" onClick={() => navigate("/interview/setup")}
              style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 28px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 8px 28px rgba(5,150,105,0.28)", transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              Try a session now <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── CAPABILITIES ────────────────────────────────────────────────── */}
      <AnimatedSection id="capabilities" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div variants={fadeUp} style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 60, gap: 40, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 560 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>
                <Brain size={12} /> AI capabilities
              </div>
              <h2 style={{ fontSize: "clamp(30px, 3.2vw, 44px)", fontWeight: 850, letterSpacing: "-0.025em", color: "#0f172a", margin: "0 0 14px" }}>
                A richer view of what the platform can do.
              </h2>
            </div>
            <p style={{ fontSize: 16, color: "#4b5563", lineHeight: 1.75, maxWidth: 380, margin: 0 }}>
              Adaptive prompts, role-specific setup, voice practice, and post-session review — all in one candidate-ready workflow.
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="capabilities-grid">
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <motion.article key={cap.title} variants={fadeUp} transition={{ delay: i * 0.07 }}
                  style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 12px rgba(15,23,42,0.05)", transition: "all 0.2s ease" }}
                  whileHover={{ y: -4, boxShadow: "0 16px 48px rgba(15,23,42,0.10)" }}
                >
                  <div style={{ height: 180, overflow: "hidden", background: "#f8fafc", position: "relative" }}>
                    <img src={cap.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.5))" }} />
                  </div>
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={15} color="#059669" />
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 750, color: "#0f172a", margin: 0 }}>{cap.title}</h3>
                    </div>
                    <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.65, margin: 0 }}>{cap.body}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── FEEDBACK PREVIEW ────────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(160deg, #022c22, #047857 60%, #10b981)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="feedback-section-grid">
          <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 24 }}>
              <BarChart3 size={12} /> Feedback surface
            </div>
            <h2 style={{ fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 850, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 18px" }}>
              Make the next answer easier to improve.
            </h2>
            <p style={{ fontSize: 16.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.75, margin: "0 0 32px" }}>
              Every session generates a structured report — dimension scores, question-by-question breakdown, and a clear picture of what to focus on next.
            </p>
            {[
              { icon: MousePointer2, text: "Clear, actionable next steps" },
              { icon: ShieldCheck, text: "Private performance data" },
              { icon: BarChart3, text: "Scannable, scannable review metrics" },
            ].map(item => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <item.icon size={15} color="rgba(255,255,255,0.85)" />
                </div>
                <span style={{ fontSize: 14.5, color: "rgba(255,255,255,0.8)", fontWeight: 550 }}>{item.text}</span>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "28px", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Session review</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, background: "rgba(16,185,129,0.2)", color: "#6ee7b7", fontSize: 12, fontWeight: 750 }}>
                  <TrendingUp size={13} /> Improving
                </span>
              </div>
              {[{ label: "Technical accuracy", v: 78 }, { label: "Communication", v: 85 }, { label: "Confidence", v: 71 }, { label: "Problem solving", v: 83 }].map(m => (
                <div key={m.label} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{m.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{m.v}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.v}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }}
                      style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #34d399, #10b981)" }}
                    />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-start", gap: 9 }}>
                <LockKeyhole size={15} color="rgba(255,255,255,0.45)" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>
                  Session recordings and transcripts are tied to your account and never shared.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────────── */}
      <AnimatedSection id="faq" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <motion.div variants={fadeUp} style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>
              Questions
            </div>
            <h2 style={{ fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 850, letterSpacing: "-0.025em", color: "#0f172a", margin: 0 }}>
              What candidates usually want to know.
            </h2>
          </motion.div>

          <div>
            {FAQS.map((item, i) => (
              <motion.div key={item.q} variants={fadeUp} transition={{ delay: i * 0.05 }}
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "20px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontSize: 16, fontWeight: 650, color: "#0f172a" }}>{item.q}</span>
                  <ChevronDown size={18} color="#94a3b8" style={{ flexShrink: 0, transition: "transform 0.25s", transform: openFaq === i ? "rotate(180deg)" : "rotate(0)" }} />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      style={{ overflow: "hidden" }}
                    >
                      <p style={{ margin: "0 0 20px", fontSize: 15, color: "#4b5563", lineHeight: 1.75, maxWidth: "90%" }}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── FINAL CTA ───────────────────────────────────────────────────── */}
      <section style={{ background: "#f8fafc", borderTop: "1px solid #f1f5f9", padding: "80px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 12px 32px rgba(5,150,105,0.25)" }}>
              <Zap size={28} color="#fff" />
            </div>
            <h2 style={{ fontSize: "clamp(30px, 3.5vw, 46px)", fontWeight: 900, letterSpacing: "-0.025em", color: "#0f172a", margin: "0 0 16px" }}>
              Run the practice interview before the real one does.
            </h2>
            <p style={{ fontSize: 17, color: "#4b5563", lineHeight: 1.75, margin: "0 0 36px" }}>
              Configure a role-calibrated session, answer out loud, and leave with a clear understanding of what to improve.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              <button type="button" onClick={() => navigate("/interview/setup")}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 28px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 15.5, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 8px 28px rgba(5,150,105,0.28)", transition: "transform 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                Start practicing — it's free <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => navigate("/pricing")}
                style={{ padding: "14px 24px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 15, fontWeight: 650, color: "#374151", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                View plans
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0f172a", padding: "64px 24px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 56 }} className="footer-grid">
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={16} color="#fff" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>InterviewAI</span>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, maxWidth: 280, margin: "0 0 20px" }}>
                AI-powered interview practice for candidates who want realistic preparation and feedback that actually helps.
              </p>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)" }}>© 2026 InterviewAI. All rights reserved.</div>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Product</div>
              {[{ href: "/interview/setup", label: "Start interview" }, { href: "/interview/history", label: "History" }, { href: "/pricing", label: "Pricing" }].map(l => (
                <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); navigate(l.href); }}
                  style={{ display: "block", fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 10, textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => e.target.style.color = "#fff"}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}
                >{l.label}</a>
              ))}
            </div>

            {/* Learn */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Learn</div>
              {[{ href: "#features", label: "Features" }, { href: "#how-it-works", label: "How it works" }, { href: "#faq", label: "FAQ" }].map(l => (
                <a key={l.label} href={l.href}
                  style={{ display: "block", fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 10, textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => e.target.style.color = "#fff"}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}
                >{l.label}</a>
              ))}
            </div>

            {/* Account */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Account</div>
              {[{ href: "/login", label: "Sign in" }, { href: "/register", label: "Create account" }].map(l => (
                <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); navigate(l.href); }}
                  style={{ display: "block", fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 10, textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => e.target.style.color = "#fff"}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}
                >{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes wave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
        @keyframes caret {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .workflow-grid { grid-template-columns: 1fr !important; }
          .capabilities-grid { grid-template-columns: 1fr 1fr !important; }
          .feedback-section-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .workflow-connector { display: none !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .lp-nav-links { display: none !important; }
          .lp-nav-actions { display: none !important; }
          .lp-hamburger { display: flex !important; }
          .capabilities-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
