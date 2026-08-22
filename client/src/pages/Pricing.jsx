import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, Check, Sparkles, ArrowRight, CreditCard, BarChart3, Mic,
  Brain, ShieldCheck, Loader2, ExternalLink, MessageSquareText,
  RefreshCcw, Target, TrendingUp, Star,
} from "lucide-react";
import {
  fetchSubscription, createCheckoutSession, createPortalSession, getApiErrorMessage,
} from "../services/api";

/* ─── Plan data ───────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "/month",
    tagline: "Try the platform",
    description: "10 credits to explore the full AI interview experience.",
    credits: 10,
    features: ["10 credits / month", "AI-powered interviews", "Adaptive questions", "Interview feedback", "Interview history"],
    cta: "Current Plan",
    highlighted: false,
    priceId: null,
  },
  {
    id: "standard",
    name: "Standard",
    price: "₹199",
    period: "/month",
    tagline: "Regular practice",
    description: "50 credits for candidates actively preparing week-to-week.",
    credits: 50,
    features: ["50 credits / month", "Everything in Free", "AI-powered interviews", "Adaptive questions", "Performance insights"],
    cta: "Upgrade to Standard",
    highlighted: false,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_STANDARD,
  },
  {
    id: "premium",
    name: "Premium",
    price: "₹299",
    period: "/month",
    tagline: "Serious job search",
    description: "100 credits for intensive daily practice with priority support.",
    credits: 100,
    features: ["100 credits / month", "Everything in Standard", "AI-powered interviews", "Adaptive questions", "Priority support"],
    cta: "Upgrade to Premium",
    highlighted: true,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM,
  },
];

const HOW_IT_WORKS = [
  { step: "01", icon: Target, title: "Choose your interview", desc: "Pick a role, experience level, and difficulty to personalise the session." },
  { step: "02", icon: Zap, title: "Credits are spent on questions", desc: "Each question you answer costs 1 credit — nothing more." },
  { step: "03", icon: MessageSquareText, title: "Instant AI feedback", desc: "Structured performance feedback is ready the moment the session ends." },
  { step: "04", icon: RefreshCcw, title: "Credits reset monthly", desc: "Your full allowance refreshes automatically on your plan renewal date." },
];

const MAX_CREDITS = Math.max(...PLANS.map(p => p.credits));

/* ─── Credit ring ─────────────────────────────────────────────────────────── */
function CreditRing({ current, total, size = 110, stroke = 9 }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const low = pct < 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = low ? "#dc2626" : "#059669";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#f1f5f9" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 850, color: "#0f172a", lineHeight: 1 }}>{current}</span>
        <span style={{ fontSize: 10, fontWeight: 650, color: "#94a3b8", marginTop: 2 }}>of {total}</span>
      </div>
    </div>
  );
}

/* ─── Credit bar in plan card ─────────────────────────────────────────────── */
function CreditBar({ credits, dark }) {
  const pct = Math.max(8, Math.round((credits / MAX_CREDITS) * 100));
  return (
    <div style={{ margin: "18px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: dark ? "#fff" : "#0f172a", letterSpacing: "-0.03em", lineHeight: 1 }}>{credits}</span>
        <span style={{ fontSize: 13, fontWeight: 650, color: dark ? "rgba(255,255,255,0.6)" : "#64748b" }}>credits / month</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: dark ? "rgba(255,255,255,0.12)" : "#f1f5f9", overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          style={{ height: "100%", borderRadius: 99, background: dark ? "linear-gradient(90deg, #6ee7b7, #34d399)" : "linear-gradient(90deg, #059669, #10b981)" }}
        />
      </div>
      <div style={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.45)" : "#94a3b8", marginTop: 5 }}>≈ {credits} interview questions</div>
    </div>
  );
}

/* ─── Plan card ───────────────────────────────────────────────────────────── */
function PlanCard({ plan, isCurrent, isUpgradable, isNotLoggedIn, checkoutLoading, portalLoading, onUpgrade, onManage, onRegister }) {
  const dark = plan.highlighted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -4 }}
      style={{
        position: "relative",
        background: dark ? "linear-gradient(150deg, #022c22, #065f46 60%, #047857)" : "#fff",
        border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #f1f5f9",
        borderRadius: 20,
        padding: "28px 26px",
        display: "flex",
        flexDirection: "column",
        boxShadow: dark ? "0 24px 60px rgba(4,120,87,0.28), 0 8px 24px rgba(4,120,87,0.12)" : "0 4px 16px rgba(15,23,42,0.05)",
        transition: "box-shadow 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Best value ribbon */}
      {dark && (
        <div style={{ position: "absolute", top: 20, right: 20, display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 99, background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", fontSize: 11, fontWeight: 800 }}>
          <Star size={11} fill="currentColor" /> Most popular
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: dark ? "rgba(255,255,255,0.5)" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{plan.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: dark ? "#fff" : "#0f172a", letterSpacing: "-0.03em", lineHeight: 1 }}>{plan.price}</span>
          <span style={{ fontSize: 14, fontWeight: 650, color: dark ? "rgba(255,255,255,0.5)" : "#64748b" }}>{plan.period}</span>
        </div>
        <p style={{ fontSize: 14, color: dark ? "rgba(255,255,255,0.7)" : "#4b5563", margin: "8px 0 0", lineHeight: 1.6 }}>{plan.description}</p>
      </div>

      {/* Credit bar */}
      <CreditBar credits={plan.credits} dark={dark} />

      {/* Features */}
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 9 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: dark ? "rgba(255,255,255,0.8)" : "#374151", fontWeight: 550 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: dark ? "rgba(52,211,153,0.15)" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={11} color={dark ? "#34d399" : "#059669"} strokeWidth={3} />
            </div>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div style={{ marginTop: "auto" }}>
        {isCurrent && plan.id === "free" && (
          <div style={{ width: "100%", padding: "11px", borderRadius: 10, background: dark ? "rgba(255,255,255,0.08)" : "#f8fafc", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, textAlign: "center", fontSize: 14, fontWeight: 750, color: dark ? "rgba(255,255,255,0.6)" : "#94a3b8" }}>
            Current plan
          </div>
        )}
        {isCurrent && plan.id !== "free" && (
          <button type="button" onClick={onManage} disabled={portalLoading}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, background: dark ? "rgba(255,255,255,0.12)" : "#f8fafc", border: `1px solid ${dark ? "rgba(255,255,255,0.2)" : "#e2e8f0"}`, fontSize: 14, fontWeight: 750, color: dark ? "#fff" : "#374151", cursor: "pointer", transition: "all 0.15s" }}
          >
            {portalLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ExternalLink size={14} />}
            Manage plan
          </button>
        )}
        {isUpgradable && (
          <button type="button" onClick={onUpgrade} disabled={checkoutLoading}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 10, background: dark ? "#fff" : "linear-gradient(135deg, #047857, #10b981)", border: "none", fontSize: 14.5, fontWeight: 750, color: dark ? "#047857" : "#fff", cursor: checkoutLoading ? "not-allowed" : "pointer", boxShadow: dark ? "0 4px 16px rgba(255,255,255,0.12)" : "0 4px 16px rgba(5,150,105,0.25)", transition: "all 0.15s", opacity: checkoutLoading ? 0.7 : 1 }}
            onMouseEnter={e => { if (!checkoutLoading) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {checkoutLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CreditCard size={14} />}
            {plan.cta}
          </button>
        )}
        {isNotLoggedIn && (
          <button type="button" onClick={onRegister}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 10, background: dark ? "#fff" : "linear-gradient(135deg, #047857, #10b981)", border: "none", fontSize: 14.5, fontWeight: 750, color: dark ? "#047857" : "#fff", cursor: "pointer", boxShadow: dark ? "none" : "0 4px 16px rgba(5,150,105,0.25)", transition: "all 0.15s" }}
          >
            <ArrowRight size={14} />
            {plan.id === "free" ? "Get started free" : "Get started"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function Pricing() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    if (!isLoggedIn) { setLoadingSubscription(false); return; }
    fetchSubscription().then(setSubscription).catch(() => setSubscription(null)).finally(() => setLoadingSubscription(false));
  }, [isLoggedIn]);

  const currentPlan = subscription?.plan || "free";
  const planAllowance = currentPlan === "premium" ? 100 : currentPlan === "standard" ? 50 : 10;

  async function handleUpgrade(plan) {
    setError("");
    if (!isLoggedIn) { navigate("/login"); return; }
    if (!plan.priceId) return;
    setCheckoutLoading(true);
    try {
      const { url } = await createCheckoutSession(plan.priceId);
      window.location.href = url;
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not start checkout. Please try again."));
    } finally { setCheckoutLoading(false); }
  }

  async function handleManageSubscription() {
    setError("");
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not open subscription portal."));
    } finally { setPortalLoading(false); }
  }

  function nextResetLabel() {
    if (!subscription?.creditsResetAt) return null;
    const d = new Date(subscription.creditsResetAt);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", overflowX: "hidden" }}>
      {/* Nav */}
      <nav style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button type="button" onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>InterviewAI</span>
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            {isLoggedIn ? (
              <button type="button" onClick={() => navigate("/interview/setup")}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(5,150,105,0.25)" }}
              >
                Start interview <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button type="button" onClick={() => navigate("/login")}
                  style={{ padding: "9px 16px", background: "none", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, fontWeight: 650, color: "#374151", cursor: "pointer" }}
                >Sign in</button>
                <button type="button" onClick={() => navigate("/register")}
                  style={{ padding: "9px 18px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 750, color: "#fff", cursor: "pointer" }}
                >Get started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", padding: "72px 24px 56px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)", backgroundSize: "48px 48px" }} aria-hidden="true" />
        <div style={{ position: "absolute", top: -160, left: -120, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.1), transparent 70%)" }} aria-hidden="true" />
        <div style={{ position: "absolute", top: -100, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.07), transparent 70%)" }} aria-hidden="true" />

        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 60, alignItems: "center" }} className="pricing-hero-grid">
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: 99, background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.25)", color: "#047857", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>
                <Sparkles size={12} /> Simple, credit-based pricing
              </div>
              <h1 style={{ fontSize: "clamp(34px, 4vw, 52px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.08, margin: "0 0 16px", color: "#0f172a" }}>
                Interview practice that fits{" "}
                <span style={{ background: "linear-gradient(90deg, #047857, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>your pace</span>.
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "#4b5563", margin: "0 0 28px", maxWidth: 480 }}>
                Every plan unlocks the same AI interviewer and feedback engine. The only difference is how much you practice.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[{ icon: Zap, text: "10–100 credits monthly" }, { icon: ShieldCheck, text: "Cancel anytime" }, { icon: BarChart3, text: "Feedback in seconds" }].map(item => (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 99, background: "#fff", border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 650, color: "#374151" }}>
                    <item.icon size={13} color="#059669" /> {item.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Mock interview preview */}
            <motion.div initial={{ opacity: 0, y: 24, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
              <div style={{ background: "#022c22", borderRadius: 18, padding: "20px", boxShadow: "0 24px 60px rgba(2,44,34,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                  {["#f87171", "#fbbf24", "#34d399"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: 8, fontWeight: 600 }}>Mock interview — live session</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", borderTopLeftRadius: 4, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.55 }}>
                    "Tell me about a time you handled conflicting priorities under a tight deadline."
                  </div>
                  <div style={{ background: "#10b981", borderRadius: 12, padding: "12px 14px", borderTopRightRadius: 4, marginLeft: "auto", maxWidth: "80%", fontSize: 13, color: "#022c22", fontWeight: 550, lineHeight: 1.55 }}>
                    Sure — on my last project, I had two stakeholders with competing deadlines…
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, paddingTop: 12, borderTop: "1px dashed rgba(255,255,255,0.1)", fontSize: 12, color: "#6ee7b7", fontWeight: 650 }}>
                    <ShieldCheck size={13} /> Feedback ready — strong structure, tighten your close
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Account dashboard (logged-in only) */}
      {isLoggedIn && !loadingSubscription && subscription && (
        <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ padding: "0 24px 24px" }}
        >
          <div style={{ maxWidth: 1180, margin: "0 auto", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 20, padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr auto 180px", gap: 24, alignItems: "center", boxShadow: "0 4px 20px rgba(15,23,42,0.06)" }} className="dashboard-grid">
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Your interview practice</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22, fontWeight: 850, color: "#0f172a" }}>
                  {currentPlan === "premium" ? "Premium" : currentPlan === "standard" ? "Standard" : "Free"} plan
                </span>
                {subscription.subscriptionStatus === "active" && currentPlan !== "free" && (
                  <span style={{ padding: "3px 10px", borderRadius: 99, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", fontSize: 11, fontWeight: 750 }}>Active</span>
                )}
                {subscription.subscriptionStatus === "past_due" && (
                  <span style={{ padding: "3px 10px", borderRadius: 99, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: 11, fontWeight: 750 }}>Payment past due</span>
                )}
              </div>
              {nextResetLabel() && (
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  <span style={{ fontWeight: 650 }}>Next credit reset:</span> {nextResetLabel()}
                </div>
              )}
              {currentPlan !== "free" && (
                <button type="button" onClick={handleManageSubscription} disabled={portalLoading}
                  style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 14, padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13.5, fontWeight: 650, color: "#374151", cursor: "pointer", transition: "all 0.15s" }}
                >
                  {portalLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <ExternalLink size={13} />}
                  Manage subscription
                </button>
              )}
            </div>
            <div style={{ width: 1, alignSelf: "stretch", background: "#f1f5f9" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <CreditRing current={subscription.credits ?? 0} total={planAllowance} />
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 650, textAlign: "center" }}>credits remaining</span>
            </div>
          </div>
        </motion.section>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ maxWidth: 720, margin: "0 auto 16px", padding: "12px 16px 12px 20px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, fontSize: 14, color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginLeft: 24, marginRight: 24 }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* Pricing cards */}
      <section style={{ padding: "56px 24px 16px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 850, color: "#0f172a", letterSpacing: "-0.025em", margin: "0 0 12px" }}>Choose your plan</h2>
            <p style={{ fontSize: 16, color: "#4b5563", margin: 0 }}>Start free. Upgrade whenever you need more practice reps.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }} className="plans-grid">
            {PLANS.map(plan => {
              const isCurrent = isLoggedIn && currentPlan === plan.id;
              const isUpgradable = isLoggedIn && plan.priceId && (
                (currentPlan === "free" && (plan.id === "standard" || plan.id === "premium")) ||
                (currentPlan === "standard" && plan.id === "premium")
              );
              const isNotLoggedIn = !isLoggedIn;

              return (
                <PlanCard key={plan.id} plan={plan}
                  isCurrent={isCurrent}
                  isUpgradable={isUpgradable}
                  isNotLoggedIn={isNotLoggedIn && !isCurrent}
                  checkoutLoading={checkoutLoading}
                  portalLoading={portalLoading}
                  onUpgrade={() => handleUpgrade(plan)}
                  onManage={handleManageSubscription}
                  onRegister={() => navigate("/register")}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* How credits work */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 850, color: "#0f172a", letterSpacing: "-0.025em", margin: "0 0 12px" }}>How credits work</h2>
            <p style={{ fontSize: 16, color: "#4b5563", margin: 0 }}>One question, one credit. Nothing more to keep track of.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }} className="how-it-works-grid">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                  style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, padding: "24px 20px", boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} color="#059669" />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#cbd5e1", letterSpacing: "0.1em" }}>{step.step}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 750, color: "#0f172a", margin: "0 0 7px" }}>{step.title}</h3>
                  <p style={{ fontSize: 13.5, color: "#4b5563", margin: 0, lineHeight: 1.65 }}>{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Which plan section */}
      <section style={{ background: "#fff", padding: "64px 24px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: 850, color: "#0f172a", letterSpacing: "-0.025em", margin: "0 0 36px", textAlign: "center" }}>
            Which plan is right for you?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="compare-grid">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                style={{ background: "#f8fafc", borderRadius: 14, padding: "22px 20px", border: "1px solid #f1f5f9" }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{plan.name}</div>
                <p style={{ fontSize: 14, color: "#4b5563", margin: 0, lineHeight: 1.65 }}>{plan.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: "linear-gradient(135deg, #022c22, #047857)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 850, color: "#fff", letterSpacing: "-0.025em", margin: "0 0 14px" }}>
              Start with 10 free credits today.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", margin: "0 0 32px", lineHeight: 1.7 }}>
              No card required. Start practicing and upgrade when you need more reps.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              <button type="button" onClick={() => navigate("/register")}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 26px", background: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 750, color: "#047857", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transition: "transform 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                Get started free <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => navigate("/interview/setup")}
                style={{ padding: "13px 24px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, fontSize: 15, fontWeight: 650, color: "#fff", cursor: "pointer" }}
              >
                Try an interview
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0f172a", padding: "40px 24px 32px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={14} color="#fff" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>InterviewAI</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>AI-powered interview practice, one credit at a time. © 2026 InterviewAI.</p>
        </div>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .pricing-hero-grid { grid-template-columns: 1fr !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .how-it-works-grid { grid-template-columns: 1fr 1fr !important; }
          .compare-grid { grid-template-columns: 1fr !important; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .how-it-works-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
