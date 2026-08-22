import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle2, CreditCard, Loader2,
  ShieldCheck, Sparkles, Zap, TrendingUp,
} from "lucide-react";
import { fetchSubscription } from "../services/api";

const MAX_POLLS = 12;
const POLL_INTERVAL = 2500;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("polling"); // "polling" | "confirmed" | "pending"
  const [pollCount, setPollCount] = useState(0);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!sessionId) { navigate("/pricing"); return; }
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const data = await fetchSubscription();
        if (cancelled) return;
        setSubscription(data);
        if (data?.hasActiveSubscription) { setStatus("confirmed"); return; }
      } catch { /* keep polling */ }

      setPollCount(c => {
        const next = c + 1;
        if (next >= MAX_POLLS) { if (!cancelled) setStatus("pending"); return next; }
        setTimeout(poll, POLL_INTERVAL);
        return next;
      });
    };

    setTimeout(poll, POLL_INTERVAL);
    return () => { cancelled = true; };
  }, [sessionId, navigate]);

  const credits = subscription?.credits?.toLocaleString() ?? "–";
  const planName = subscription?.plan === "premium" ? "Premium" : subscription?.plan === "standard" ? "Standard" : "Pro";
  const progress = Math.min(((pollCount + 1) / MAX_POLLS) * 100, 100);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={16} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>InterviewAI</span>
        </button>
        <button type="button" onClick={() => navigate("/pricing")}
          style={{ padding: "8px 16px", background: "none", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, fontWeight: 650, color: "#374151", cursor: "pointer" }}
        >View pricing</button>
      </nav>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", maxWidth: 1100, margin: "0 auto", padding: "48px 24px", gap: 64, width: "100%" }} className="success-layout">
        {/* Left copy */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>
            <Sparkles size={12} /> Stripe checkout
          </div>
          <h1 style={{ fontSize: "clamp(34px, 4vw, 52px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05, color: "#0f172a", margin: "0 0 16px" }}>
            {status === "confirmed" ? "Your workspace is ready." : "Finishing your setup."}
          </h1>
          <p style={{ fontSize: 17, color: "#4b5563", lineHeight: 1.75, margin: "0 0 32px", maxWidth: 460 }}>
            We confirm the payment through Stripe first, then unlock your interview credits as soon as the subscription webhook reaches your account.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { icon: CheckCircle2, text: "Secure checkout" },
              { icon: ShieldCheck, text: "Account-linked credits" },
              { icon: CreditCard, text: "Stripe-managed billing" },
            ].map(item => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, background: "#fff", border: "1px solid #f1f5f9", fontSize: 13, fontWeight: 650, color: "#374151" }}>
                <item.icon size={14} color="#059669" /> {item.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right status panel */}
        <AnimatePresence mode="wait">
          <motion.div key={status}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 24, padding: "36px 32px", boxShadow: "0 20px 60px rgba(15,23,42,0.10)", display: "flex", flexDirection: "column", gap: 0 }}
          >
            {/* Status badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              {status === "polling" && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 12.5, fontWeight: 750 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulseDot 1.5s ease-in-out infinite" }} />
                  Processing
                </div>
              )}
              {status === "confirmed" && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 12.5, fontWeight: 750 }}>
                  <CheckCircle2 size={13} /> Subscription activated
                </div>
              )}
              {status === "pending" && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 99, background: "#fffbeb", border: "1px solid rgba(245,158,11,0.3)", color: "#b45309", fontSize: 12.5, fontWeight: 750 }}>
                  <CheckCircle2 size={13} /> Payment successful
                </div>
              )}
              <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {status === "confirmed" ? planName : status === "pending" ? "Pending" : `${pollCount + 1}/${MAX_POLLS}`}
              </span>
            </div>

            {/* Icon */}
            <div style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center",
              background: status === "confirmed" ? "linear-gradient(135deg, #047857, #10b981)" : status === "pending" ? "#fffbeb" : "#ecfdf5",
              border: status === "confirmed" ? "none" : status === "pending" ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(16,185,129,0.25)",
              boxShadow: status === "confirmed" ? "0 12px 32px rgba(5,150,105,0.25)" : "none",
            }}>
              {status === "polling" && <Loader2 size={36} color="#059669" style={{ animation: "spin 0.9s linear infinite" }} />}
              {status === "confirmed" && <CheckCircle2 size={38} color="#fff" />}
              {status === "pending" && <TrendingUp size={36} color="#d97706" />}
            </div>

            {/* Text */}
            <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 850, color: "#0f172a", letterSpacing: "-0.02em", margin: "0 0 10px", lineHeight: 1.15 }}>
              {status === "polling" && "Payment received"}
              {status === "confirmed" && `Welcome to ${planName}`}
              {status === "pending" && "Subscription processing"}
            </h2>
            <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.7, margin: "0 0 24px" }}>
              {status === "polling" && "We're confirming your subscription with Stripe. This usually takes a few seconds."}
              {status === "confirmed" && `Your ${planName} plan is now active. You have ${credits} credits ready to use.`}
              {status === "pending" && "Your payment went through. Your subscription may take a moment to appear on your account."}
            </p>

            {/* Progress bar (polling) */}
            {status === "polling" && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ height: 6, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #059669, #10b981)", width: `${progress}%`, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", animation: `pulseDot 1.2s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Credits strip (confirmed) */}
            {status === "confirmed" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={16} color="#059669" />
                  <span style={{ fontSize: 13.5, fontWeight: 650, color: "#047857" }}>Available credits</span>
                </div>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#047857", letterSpacing: "-0.02em" }}>{credits}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {status === "confirmed" && (
                <>
                  <button type="button" onClick={() => navigate("/interview/setup")}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 14.5, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(5,150,105,0.25)", transition: "transform 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    Start practicing <ArrowRight size={15} />
                  </button>
                  <button type="button" onClick={() => navigate("/pricing")}
                    style={{ padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontWeight: 650, color: "#374151", cursor: "pointer" }}
                  >
                    View subscription
                  </button>
                </>
              )}
              {status === "pending" && (
                <button type="button" onClick={() => navigate("/pricing")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 10, fontSize: 14.5, fontWeight: 750, color: "#fff", cursor: "pointer" }}
                >
                  Go to pricing <ArrowRight size={15} />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.45; transform:scale(0.8); } }
        @media (max-width: 768px) {
          .success-layout { grid-template-columns: 1fr !important; padding: 32px 20px !important; }
        }
      `}</style>
    </div>
  );
}
