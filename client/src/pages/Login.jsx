import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Zap, Mail, Lock, AlertCircle, CheckCircle2, Loader2,
  ArrowLeft, Sparkles, Brain, BarChart3, Mic,
} from "lucide-react";
import { googleAuthApi, getApiErrorMessage } from "../services/api";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE_API = import.meta.env.VITE_BASE_API;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const FEATURES = [
  { icon: Brain, text: "Adaptive AI interview questions" },
  { icon: Mic, text: "Voice-native practice sessions" },
  { icon: BarChart3, text: "Structured performance feedback" },
  { icon: Sparkles, text: "Role & difficulty configuration" },
];

function useGoogleScript() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (window.google?.accounts) { setReady(true); return; }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener("load", () => setReady(true)); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const googleReady = useGoogleScript();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const successMessage = location.state?.message;

  const handleGoogleCredential = useCallback(async (response) => {
    if (!response?.credential) { setError("Google sign-in was cancelled or failed."); return; }
    setGoogleLoading(true); setError("");
    try {
      const data = await googleAuthApi(response.credential);
      if (data?.token) localStorage.setItem("token", data.token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Google sign-in failed. Please try again."));
    } finally { setGoogleLoading(false); }
  }, [navigate]);

  useEffect(() => {
    if (!googleReady || !GOOGLE_CLIENT_ID) return;
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential, auto_select: false, cancel_on_tap_outside: true });
  }, [googleReady, handleGoogleCredential]);

  const triggerGoogleSignIn = () => {
    if (!googleReady || !GOOGLE_CLIENT_ID) { setError("Google sign-in is not configured."); return; }
    if (googleLoading || loading) return;
    window.google.accounts.id.prompt();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Email and password are required."); return; }
    if (!emailPattern.test(email.trim())) { setError("Enter a valid email address."); return; }
    try {
      setLoading(true);
      const response = await fetch(`${BASE_API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.msg || "Login failed.");
      if (data?.token) localStorage.setItem("token", data.token);
      navigate("/", { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : "Login failed."); }
    finally { setLoading(false); }
  };

  const isBusy = loading || googleLoading;

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }} className="auth-layout">
      {/* Left panel */}
      <div style={{ background: "linear-gradient(150deg, #022c22 0%, #047857 50%, #065f46 100%)", padding: "48px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }} className="auth-left-panel">
        {/* Grid pattern */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "36px 36px" }} aria-hidden="true" />
        {/* Glow */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.15), transparent 70%)" }} aria-hidden="true" />

        {/* Back to home */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: "auto" }}>
          <button type="button" onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, padding: "8px 14px", color: "rgba(255,255,255,0.8)", fontSize: 13.5, fontWeight: 650, cursor: "pointer", transition: "all 0.15s" }}
          >
            <ArrowLeft size={15} /> Back home
          </button>
        </div>

        {/* Brand */}
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={20} color="#fff" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>InterviewAI</span>
          </div>

          <h2 style={{ fontSize: "clamp(28px, 2.8vw, 38px)", fontWeight: 850, color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.15, margin: "0 0 16px" }}>
            The interview room is ready for you.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 360 }}>
            Practice with an AI that adapts to your answers — not a static list of questions.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={f.text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <f.icon size={17} color="rgba(255,255,255,0.8)" />
                </div>
                <span style={{ fontSize: 14.5, color: "rgba(255,255,255,0.75)", fontWeight: 550 }}>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px", background: "#fff", overflowY: "auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 850, color: "#0f172a", letterSpacing: "-0.025em", margin: "0 0 8px" }}>Welcome back</h1>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>Sign in to continue to your account</p>
          </div>

          {/* Success banner */}
          <AnimatePresence>
            {successMessage && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "11px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#047857", fontSize: 13.5, marginBottom: 18, overflow: "hidden" }}
              >
                <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "11px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13.5, marginBottom: 18, overflow: "hidden" }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label htmlFor="login-email" style={{ display: "block", fontSize: 13.5, fontWeight: 650, color: "#334155", marginBottom: 6 }}>Email address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" disabled={isBusy}
                  style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 14px 11px 42px", fontSize: 14.5, color: "#0f172a", background: "#f8fafc", outline: "none", transition: "all 0.18s" }}
                  onFocus={e => { e.target.style.borderColor = "#10b981"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" style={{ display: "block", fontSize: 13.5, fontWeight: 650, color: "#334155", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" disabled={isBusy}
                  style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 44px 11px 42px", fontSize: 14.5, color: "#0f172a", background: "#f8fafc", outline: "none", transition: "all 0.18s" }}
                  onFocus={e => { e.target.style.borderColor = "#10b981"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isBusy}
              style={{ width: "100%", padding: "12px 16px", background: isBusy ? "#a7f3d0" : "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 750, color: "#fff", cursor: isBusy ? "not-allowed" : "pointer", boxShadow: isBusy ? "none" : "0 4px 16px rgba(5,150,105,0.28)", transition: "all 0.15s", marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Signing in…
                </span>
              ) : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
            <span style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", letterSpacing: "0.04em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
          </div>

          {/* Google */}
          <button type="button" onClick={triggerGoogleSignIn} disabled={isBusy || !GOOGLE_CLIENT_ID}
            style={{ width: "100%", padding: "12px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14.5, fontWeight: 650, color: "#0f172a", cursor: isBusy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.15s", opacity: (!GOOGLE_CLIENT_ID || isBusy) ? 0.55 : 1 }}
            onMouseEnter={e => { if (!isBusy && GOOGLE_CLIENT_ID) { e.currentTarget.style.borderColor = "#6ee7b7"; e.currentTarget.style.background = "#f0fdf4"; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fff"; }}
          >
            {googleLoading ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Connecting…</> : <><GoogleIcon /> Continue with Google</>}
          </button>

          <p style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#64748b" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#059669", fontWeight: 750, textDecoration: "none" }}>Create one free</Link>
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .auth-layout { grid-template-columns: 1fr !important; }
          .auth-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
