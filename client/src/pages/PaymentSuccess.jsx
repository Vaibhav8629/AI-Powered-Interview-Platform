import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, CheckCircle2, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { fetchSubscription } from "../services/api";

/**
 * PaymentSuccess
 *
 * Shown after the user returns from Stripe Checkout.
 *
 * IMPORTANT:  We do NOT activate the subscription here.
 * The Stripe webhook (server-side) is responsible for updating the user's plan
 * and credits.  This page polls /api/payment/subscription to detect when
 * the webhook has been processed, and only then shows a confirmed message.
 * If the webhook hasn't fired yet it shows a "processing" state.
 */

const MAX_POLLS = 12;      // up to 12 × 2.5s = 30 seconds
const POLL_INTERVAL = 2500; // ms

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("polling"); // "polling" | "confirmed" | "pending"
  const [pollCount, setPollCount] = useState(0);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/pricing");
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      try {
        const data = await fetchSubscription();
        if (cancelled) return;

        setSubscription(data);

        if (data?.hasActiveSubscription) {
          setStatus("confirmed");
          return; // stop polling
        }
      } catch {
        // ignore fetch errors — keep polling
      }

      setPollCount((c) => {
        const next = c + 1;
        if (next >= MAX_POLLS) {
          if (!cancelled) setStatus("pending");
          return next;
        }
        setTimeout(poll, POLL_INTERVAL);
        return next;
      });
    };

    setTimeout(poll, POLL_INTERVAL);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <button type="button" onClick={() => navigate("/")} style={s.logoBtn} aria-label="Home">
          <span style={s.logoBadge}><Zap size={16} color="#fff" /></span>
          <span style={s.logoText}>InterviewAI</span>
        </button>
      </nav>

      <div style={s.center}>
        {status === "polling" && (
          <motion.div
            key="polling"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={s.card}
          >
            <div style={s.iconWrap}>
              <Loader2 size={40} color="#059669" style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <h1 style={s.title}>Payment received</h1>
            <p style={s.subtitle}>
              We're confirming your subscription with Stripe. This usually takes a few seconds.
            </p>
            <div style={s.dots}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ ...s.dot, animationDelay: `${i * 0.3}s` }} />
              ))}
            </div>
          </motion.div>
        )}

        {status === "confirmed" && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={s.card}
          >
            <div style={{ ...s.iconWrap, background: "#f0fdf4" }}>
              <CheckCircle2 size={44} color="#059669" />
            </div>
            <div style={s.successBadge}>
              <Sparkles size={12} style={{ marginRight: 5 }} />
              Subscription activated
            </div>
            <h1 style={s.title}>Welcome to Pro</h1>
            <p style={s.subtitle}>
              Your Pro plan is now active. You have{" "}
              <strong>{subscription?.credits?.toLocaleString() ?? 1000}</strong> credits ready to use.
            </p>
            <button
              type="button"
              onClick={() => navigate("/interview/setup")}
              style={s.ctaBtn}
            >
              Start practising <ArrowRight size={15} style={{ marginLeft: 6 }} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              style={s.secondaryBtn}
            >
              View subscription
            </button>
          </motion.div>
        )}

        {status === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={s.card}
          >
            <div style={{ ...s.iconWrap, background: "#fffbeb" }}>
              <CheckCircle2 size={44} color="#d97706" />
            </div>
            <h1 style={s.title}>Payment Successful</h1>
            <p style={s.subtitle}>
              Your payment went through. Your subscription is being processed — it may take a
              moment to appear. Refresh your account page in a minute.
            </p>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              style={s.ctaBtn}
            >
              Go to pricing
            </button>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", backgroundColor: "#f5f7f8", color: "#0a1f17" },
  nav: {
    display: "flex",
    alignItems: "center",
    padding: "14px 40px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5ede9",
  },
  logoBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 },
  logoBadge: { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #059669, #0f5f49)" },
  logoText: { fontSize: 17, fontWeight: 800, color: "#0a1f17" },
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "40px 24px" },
  card: {
    width: "100%",
    maxWidth: 460,
    background: "#ffffff",
    border: "1px solid #d9e2e0",
    borderRadius: 20,
    padding: "40px 36px",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(10,31,23,0.08)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: { width: 80, height: 80, borderRadius: 24, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  successBadge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 9999,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#059669",
  },
  title: { fontSize: 26, fontWeight: 800, color: "#0a1f17", margin: 0 },
  subtitle: { fontSize: 15, color: "#4a6b5f", lineHeight: 1.6, margin: 0, maxWidth: 360 },
  ctaBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "12px 0",
    background: "#0f5f49",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
  },
  secondaryBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "11px 0",
    background: "none",
    color: "#214236",
    border: "1px solid #d9e2e0",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  dots: { display: "flex", gap: 8, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#10b981", animation: "pulse 1.2s ease-in-out infinite" },
};
