import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Zap, Mail, Lock, User, AlertCircle, Loader2,
  ArrowLeft, CheckCircle2, Sparkles, Brain, BarChart3, Mic, Shield,
} from "lucide-react";
import { googleAuthApi, getApiErrorMessage } from "../services/api";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE_API = import.meta.env.VITE_BASE_API;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const BENEFITS = [
  { icon: Brain, text: "10 free interview credits to start" },
  { icon: Mic, text: "Voice practice with live transcription" },
  { icon: BarChart3, text: "AI-powered performance feedback" },
  { icon: Shield, text: "Private sessions — your data stays yours" },
];

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Too short", color: "#ef4444" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#eab308" },
    { label: "Good", color: "#22c55e" },
    { label: "Strong", color: "#10b981" },
  ];
  return { score, ...map[score] };
}

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

export default function Register() {
  const navigate = useNavigate();
  const googleReady = useGoogleScript();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const strength = getPasswordStrength(password);

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
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) { setError("All fields are required."); return; }
    if (!emailPattern.test(email.trim())) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    try {
      setLoading(true);
      const response = await fetch(`${BASE_API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.msg || "Registration failed.");
      navigate("/login", { replace: true, state: { message: "Account created successfully. Please sign in." } });
    } catch (err) { setError(err instanceof Error ? err.message : "Registration failed."); }
    finally { setLoading(false); }
  };

  const isBusy = loading || googleLoading;
  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  const fieldStyle = (focused) => ({
    width: "100%", boxSizing: "border-box", border: focused ? "1.5px solid #10b981" : "1.5px solid #e2e8f0",
    borderRadius: 10, padding: "11px 14px 11px 42px", fontSize: 14.5, color: "#0f172a",
    background: focused ? "#fff" : "#f8fafc", outline: "none", transition: "all 0.18s",
    boxShadow: focused ? "0 0 0 3px rgba(16,185,129,0.1)" : "none",
  });

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }} className="auth-layout">
      {/* Left panel */}
      <div style={{ background: "linear-gradient(150deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)", padding: "48px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }} className="auth-left-panel">
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "36px 36px" }} aria-hidden="true" />
        <div style={{ position: "absolute", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)" }} aria-hidden="true" />

        <div style={{ position: "relative", zIndex: 1, marginBottom: "auto" }}>
          <button type="button" onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 14px", color: "rgba(255,255,255,0.7)", fontSize: 13.5, fontWeight: 650, cursor: "pointer" }}
          >
            <ArrowLeft size={15} /> Back home
          </button>
        </div>

        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={20} color="#fff" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>InterviewAI</span>
          </div>

          <h2 style={{ fontSize: "clamp(26px, 2.6vw, 36px)", fontWeight: 850, color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.15, margin: "0 0 14px" }}>
            Start your free account today.
          </h2>
          <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 360 }}>
            10 free credits per month, no card required. Upgrade when you need more reps.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {BENEFITS.map((b, i) => (
              <motion.div key={b.text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <b.icon size={17} color="#34d399" />
                </div>
                <span style={{ fontSize: 14.5, color: "rgba(255,255,255,0.7)", fontWeight: 550 }}>{b.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px", background: "#fff", overflowY: "auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 850, color: "#0f172a", letterSpacing: "-0.025em", margin: "0 0 7px" }}>Create your account</h1>
            <p style={{ fontSize: 14.5, color: "#64748b", margin: 0 }}>Get started with 10 free credits — no card needed</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "11px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13.5, marginBottom: 16, overflow: "hidden" }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <div>
              <label htmlFor="reg-name" style={{ display: "block", fontSize: 13.5, fontWeight: 650, color: "#334155", marginBottom: 6 }}>Full name</label>
              <div style={{ position: "relative" }}>
                <User size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input id="reg-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" autoComplete="name" disabled={isBusy}
                  style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 14px 11px 42px", fontSize: 14.5, color: "#0f172a", background: "#f8fafc", outline: "none", transition: "all 0.18s" }}
                  onFocus={e => { e.target.style.borderColor = "#10b981"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" style={{ display: "block", fontSize: 13.5, fontWeight: 650, color: "#334155", marginBottom: 6 }}>Email address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" disabled={isBusy}
                  style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 14px 11px 42px", fontSize: 14.5, color: "#0f172a", background: "#f8fafc", outline: "none", transition: "all 0.18s" }}
                  onFocus={e => { e.target.style.borderColor = "#10b981"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" style={{ display: "block", fontSize: 13.5, fontWeight: 650, color: "#334155", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input id="reg-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" disabled={isBusy}
                  style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 44px 11px 42px", fontSize: 14.5, color: "#0f172a", background: "#f8fafc", outline: "none", transition: "all 0.18s" }}
                  onFocus={e => { e.target.style.borderColor = "#10b981"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1} aria-label={showPassword ? "Hide" : "Show"}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", color: "#94a3b8", display: "flex" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: 7 }}>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < strength.score ? strength.color : "#e2e8f0", transition: "background 0.25s" }} />
                    ))}
                  </div>
                  {strength.label && <span style={{ fontSize: 11.5, fontWeight: 650, color: strength.color, display: "block", marginTop: 4 }}>{strength.label}</span>}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-confirm" style={{ display: "block", fontSize: 13.5, fontWeight: 650, color: "#334155", marginBottom: 6 }}>Confirm password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
                <input id="reg-confirm" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" disabled={isBusy}
                  style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "11px 44px 11px 42px", fontSize: 14.5, color: "#0f172a", background: "#f8fafc", outline: "none", transition: "all 0.18s",
                    border: `1.5px solid ${passwordsMismatch ? "#fca5a5" : passwordsMatch ? "#6ee7b7" : "#e2e8f0"}` }}
                  onFocus={e => { e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)"; e.target.style.background = "#fff"; }}
                  onBlur={e => { e.target.style.boxShadow = "none"; e.target.style.background = "#f8fafc"; }}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)} tabIndex={-1} aria-label={showConfirm ? "Hide" : "Show"}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", color: "#94a3b8", display: "flex" }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordsMismatch && <span style={{ fontSize: 12, color: "#dc2626", display: "block", marginTop: 4 }}>Passwords do not match</span>}
              {passwordsMatch && <span style={{ fontSize: 12, color: "#059669", display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontWeight: 650 }}><CheckCircle2 size={12} /> Passwords match</span>}
            </div>

            <button type="submit" disabled={isBusy}
              style={{ width: "100%", padding: "12px 16px", background: isBusy ? "#a7f3d0" : "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 750, color: "#fff", cursor: isBusy ? "not-allowed" : "pointer", boxShadow: isBusy ? "none" : "0 4px 16px rgba(5,150,105,0.28)", transition: "all 0.15s", marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Creating account…
                </span>
              ) : "Create account"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
            <span style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", letterSpacing: "0.04em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
          </div>

          <button type="button" onClick={triggerGoogleSignIn} disabled={isBusy || !GOOGLE_CLIENT_ID}
            style={{ width: "100%", padding: "12px 16px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14.5, fontWeight: 650, color: "#0f172a", cursor: isBusy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.15s", opacity: (!GOOGLE_CLIENT_ID || isBusy) ? 0.55 : 1 }}
            onMouseEnter={e => { if (!isBusy && GOOGLE_CLIENT_ID) { e.currentTarget.style.borderColor = "#6ee7b7"; e.currentTarget.style.background = "#f0fdf4"; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fff"; }}
          >
            {googleLoading ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Connecting…</> : <><GoogleIcon /> Continue with Google</>}
          </button>

          <p style={{ marginTop: 22, textAlign: "center", fontSize: 14, color: "#64748b" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#059669", fontWeight: 750, textDecoration: "none" }}>Sign in</Link>
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
