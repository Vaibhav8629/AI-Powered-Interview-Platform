import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Zap, Mail, Lock, User, AlertCircle, Loader2 } from "lucide-react";
import { googleAuthApi, getApiErrorMessage } from "../services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE_API = import.meta.env.VITE_BASE_API;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// ─── Google GSI script loader ─────────────────────────────────────────────────
function useGoogleScript() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    if (window.google?.accounts) {
      setReady(true);
      return;
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  return ready;
}

// ─── Password strength helper ─────────────────────────────────────────────────
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

  // ── Google sign-in handler ──────────────────────────────────────────────────
  const handleGoogleCredential = useCallback(
    async (response) => {
      if (!response?.credential) {
        setError("Google sign-in was cancelled or failed.");
        return;
      }
      setGoogleLoading(true);
      setError("");
      try {
        const data = await googleAuthApi(response.credential);
        if (data?.token) {
          localStorage.setItem("token", data.token);
        }
        navigate("/", { replace: true });
      } catch (err) {
        setError(getApiErrorMessage(err, "Google sign-in failed. Please try again."));
      } finally {
        setGoogleLoading(false);
      }
    },
    [navigate],
  );

  // ── Initialize Google Identity Services ────────────────────────────────────
  useEffect(() => {
    if (!googleReady || !GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
  }, [googleReady, handleGoogleCredential]);

  const triggerGoogleSignIn = () => {
    if (!googleReady || !GOOGLE_CLIENT_ID) {
      setError("Google sign-in is not configured.");
      return;
    }
    if (googleLoading || loading) return;
    window.google.accounts.id.prompt();
  };

  // ── Email/password submit ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("All fields are required.");
      return;
    }
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.msg || "Registration failed.");
      }

      navigate("/login", {
        replace: true,
        state: { message: "Account created successfully. Please sign in." },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || googleLoading;

  return (
    <div style={pageStyle}>
      {/* Ambient blobs */}
      <div style={blobA} aria-hidden="true" />
      <div style={blobB} aria-hidden="true" />

      <motion.div
        style={cardStyle}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand */}
        <div style={brandRow}>
          <div style={logoBox}>
            <Zap size={16} color="#ffffff" aria-hidden="true" />
          </div>
          <span style={brandName}>InterviewAI</span>
        </div>

        {/* Heading */}
        <h1 style={headingStyle}>Create your account</h1>
        <p style={subheadingStyle}>Start practicing and land your next role</p>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              style={{ ...alertStyle, ...alertError }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AlertCircle size={15} color="#b42318" aria-hidden="true" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} style={formStyle} noValidate>
          {/* Name */}
          <div style={fieldStyle}>
            <label htmlFor="reg-name" style={labelStyle}>Full name</label>
            <div style={inputWrapStyle}>
              <User size={16} style={inputIconStyle} aria-hidden="true" />
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
                disabled={isBusy}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputBlurStyle)}
              />
            </div>
          </div>

          {/* Email */}
          <div style={fieldStyle}>
            <label htmlFor="reg-email" style={labelStyle}>Email address</label>
            <div style={inputWrapStyle}>
              <Mail size={16} style={inputIconStyle} aria-hidden="true" />
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isBusy}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputBlurStyle)}
              />
            </div>
          </div>

          {/* Password */}
          <div style={fieldStyle}>
            <label htmlFor="reg-password" style={labelStyle}>Password</label>
            <div style={inputWrapStyle}>
              <Lock size={16} style={inputIconStyle} aria-hidden="true" />
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                disabled={isBusy}
                style={{ ...inputStyle, paddingRight: "44px" }}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputBlurStyle)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={eyeButtonStyle}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} color="#6b7e78" /> : <Eye size={16} color="#6b7e78" />}
              </button>
            </div>

            {/* Password strength bar */}
            {password.length > 0 && (
              <div style={{ marginTop: "6px" }}>
                <div style={strengthBarWrap}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        ...strengthSegment,
                        backgroundColor: i < strength.score ? strength.color : "#e5f0ed",
                        transition: "background-color 0.25s",
                      }}
                    />
                  ))}
                </div>
                <span style={{ ...strengthLabel, color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={fieldStyle}>
            <label htmlFor="reg-confirm" style={labelStyle}>Confirm password</label>
            <div style={inputWrapStyle}>
              <Lock size={16} style={inputIconStyle} aria-hidden="true" />
              <input
                id="reg-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                disabled={isBusy}
                style={{
                  ...inputStyle,
                  paddingRight: "44px",
                  ...(confirmPassword && password !== confirmPassword
                    ? { borderColor: "#fca5a5" }
                    : confirmPassword && password === confirmPassword
                    ? { borderColor: "#6ee7b7" }
                    : {}),
                }}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputBlurStyle)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                style={eyeButtonStyle}
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={16} color="#6b7e78" /> : <Eye size={16} color="#6b7e78" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <span style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>
                Passwords do not match
              </span>
            )}
          </div>

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={isBusy}
            style={{ ...primaryBtn, ...(isBusy ? primaryBtnDisabled : {}) }}
            whileHover={isBusy ? {} : { backgroundColor: "#0a4a38" }}
            whileTap={isBusy ? {} : { scale: 0.985 }}
            transition={{ duration: 0.15 }}
          >
            {loading ? (
              <span style={btnContentStyle}>
                <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} aria-hidden="true" />
                Creating account…
              </span>
            ) : (
              "Create account"
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div style={dividerStyle} aria-hidden="true">
          <div style={dividerLine} />
          <span style={dividerLabel}>OR</span>
          <div style={dividerLine} />
        </div>

        {/* Google button */}
        <motion.button
          type="button"
          onClick={triggerGoogleSignIn}
          disabled={isBusy || !GOOGLE_CLIENT_ID}
          style={{
            ...googleBtn,
            ...((isBusy || !GOOGLE_CLIENT_ID) ? googleBtnDisabled : {}),
          }}
          whileHover={(isBusy || !GOOGLE_CLIENT_ID) ? {} : { backgroundColor: "#f0fdf4", borderColor: "#6ee7b7" }}
          whileTap={(isBusy || !GOOGLE_CLIENT_ID) ? {} : { scale: 0.985 }}
          transition={{ duration: 0.15 }}
          aria-label="Continue with Google"
        >
          {googleLoading ? (
            <span style={btnContentStyle}>
              <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} aria-hidden="true" />
              Connecting…
            </span>
          ) : (
            <span style={btnContentStyle}>
              <GoogleIcon />
              Continue with Google
            </span>
          )}
        </motion.button>

        {/* Footer */}
        <p style={footerStyle}>
          Already have an account?{" "}
          <Link to="/login" style={linkStyle}>
            Sign in
          </Link>
        </p>
      </motion.div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Google SVG icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: "linear-gradient(135deg, #f0fdf4 0%, #e8f5f0 40%, #f5f7f8 100%)",
  position: "relative",
  overflow: "hidden",
};

const blobA = {
  position: "absolute",
  top: "-80px",
  left: "-100px",
  width: "460px",
  height: "460px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(16,185,129,0.11) 0%, transparent 70%)",
  pointerEvents: "none",
};

const blobB = {
  position: "absolute",
  bottom: "-120px",
  right: "-80px",
  width: "500px",
  height: "500px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)",
  pointerEvents: "none",
};

const cardStyle = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: "440px",
  backgroundColor: "#ffffff",
  border: "1px solid #d1e9e0",
  borderRadius: "20px",
  padding: "36px 32px 32px",
  boxShadow: "0 4px 6px rgba(10,31,23,0.04), 0 20px 48px rgba(10,31,23,0.10), 0 0 0 1px rgba(16,185,129,0.06)",
};

const brandRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "24px",
};

const logoBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  flexShrink: 0,
  boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
};

const brandName = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#0a1f17",
  letterSpacing: "-0.01em",
};

const headingStyle = {
  margin: "0 0 6px",
  fontSize: "26px",
  fontWeight: 800,
  color: "#0a1f17",
  letterSpacing: "-0.02em",
  lineHeight: 1.2,
};

const subheadingStyle = {
  margin: "0 0 20px",
  fontSize: "14px",
  color: "#6b7e78",
  lineHeight: 1.5,
};

const alertStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "13.5px",
  lineHeight: 1.45,
  marginBottom: "16px",
  overflow: "hidden",
};

const alertError = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b42318",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#214236",
  letterSpacing: "0.005em",
};

const inputWrapStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const inputIconStyle = {
  position: "absolute",
  left: "13px",
  color: "#9cafa9",
  pointerEvents: "none",
  flexShrink: 0,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1.5px solid #d1e9e0",
  borderRadius: "10px",
  padding: "10px 12px 10px 40px",
  fontSize: "14.5px",
  color: "#0a1f17",
  backgroundColor: "#fafcfb",
  outline: "none",
  transition: "border-color 0.18s, box-shadow 0.18s, background-color 0.18s",
};

const inputFocusStyle = {
  borderColor: "#10b981",
  backgroundColor: "#ffffff",
  boxShadow: "0 0 0 3px rgba(16,185,129,0.12)",
};

const inputBlurStyle = {
  borderColor: "#d1e9e0",
  backgroundColor: "#fafcfb",
  boxShadow: "none",
};

const eyeButtonStyle = {
  position: "absolute",
  right: "12px",
  background: "none",
  border: "none",
  padding: "4px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  lineHeight: 1,
};

const strengthBarWrap = {
  display: "flex",
  gap: "4px",
};

const strengthSegment = {
  flex: 1,
  height: "4px",
  borderRadius: "99px",
};

const strengthLabel = {
  fontSize: "11.5px",
  fontWeight: 600,
  display: "block",
  marginTop: "4px",
};

const primaryBtn = {
  width: "100%",
  border: "none",
  borderRadius: "10px",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  fontSize: "14.5px",
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.01em",
  transition: "opacity 0.18s",
  marginTop: "4px",
};

const primaryBtnDisabled = {
  opacity: 0.65,
  cursor: "not-allowed",
};

const btnContentStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const dividerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  margin: "20px 0",
};

const dividerLine = {
  flex: 1,
  height: "1px",
  backgroundColor: "#e5f0ed",
};

const dividerLabel = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#9cafa9",
  letterSpacing: "0.06em",
};

const googleBtn = {
  width: "100%",
  border: "1.5px solid #d1e9e0",
  borderRadius: "10px",
  padding: "11px 16px",
  backgroundColor: "#ffffff",
  color: "#0a1f17",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 0.18s, border-color 0.18s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const googleBtnDisabled = {
  opacity: 0.55,
  cursor: "not-allowed",
};

const footerStyle = {
  marginTop: "20px",
  fontSize: "13.5px",
  color: "#6b7e78",
  textAlign: "center",
};

const linkStyle = {
  color: "#059669",
  fontWeight: 700,
  textDecoration: "none",
};
