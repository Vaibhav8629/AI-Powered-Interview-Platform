import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  Check,
  Sparkles,
  ArrowRight,
  CreditCard,
  BarChart3,
  Mic,
  Brain,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  fetchSubscription,
  createCheckoutSession,
  createPortalSession,
  getApiErrorMessage,
} from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Plan definitions (visual only — prices/credits are enforced on backend)
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "/month",
    tagline: "Get started at no cost",
    credits: 10,
    features: [
      { label: "10 credits / month", icon: Zap },
      { label: "AI-powered interviews", icon: Brain },
      { label: "Adaptive questions", icon: Sparkles },
      { label: "Interview feedback", icon: BarChart3 },
      { label: "Interview history", icon: Mic },
    ],
    cta: "Current Plan",
    highlighted: false,
    priceId: null,
  },
  {
    id: "standard",
    name: "Standard",
    price: "₹199",
    period: "/month",
    tagline: "For consistent interview prep",
    credits: 50,
    features: [
      { label: "50 credits / month", icon: Zap },
      { label: "Everything in Free", icon: Check },
      { label: "AI-powered interviews", icon: Brain },
      { label: "Adaptive questions", icon: Sparkles },
      { label: "Interview feedback", icon: BarChart3 },
      { label: "Interview history", icon: Mic },
    ],
    cta: "Upgrade to Standard",
    highlighted: false,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_STANDARD,
  },
  {
    id: "premium",
    name: "Premium",
    price: "₹299",
    period: "/month",
    tagline: "For serious interview prep",
    credits: 100,
    features: [
      { label: "100 credits / month", icon: Zap },
      { label: "Everything in Standard", icon: Check },
      { label: "AI-powered interviews", icon: Brain },
      { label: "Adaptive questions", icon: Sparkles },
      { label: "Interview feedback", icon: BarChart3 },
      { label: "Interview history", icon: Mic },
      { label: "Priority support", icon: ShieldCheck },
    ],
    cta: "Upgrade to Premium",
    highlighted: true,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Credit bar component (reused from InterviewSetup style)
// ─────────────────────────────────────────────────────────────────────────────
function CreditBar({ current, total }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const low = pct < 20;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#3a554c", fontWeight: 600 }}>
          {current} / {total} credits
        </span>
        <span style={{ fontSize: 12, color: low ? "#b42318" : "#3a554c" }}>
          {Math.round(pct)}% remaining
        </span>
      </div>
      <div style={{ height: 8, background: "#e5f0ed", borderRadius: 9999, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            height: "100%",
            borderRadius: 9999,
            background: low
              ? "linear-gradient(90deg, #ef4444, #b91c1c)"
              : "linear-gradient(90deg, #10b981, #059669)",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Pricing page
// ─────────────────────────────────────────────────────────────────────────────
export default function Pricing() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);

  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoadingSubscription(false);
      return;
    }
    fetchSubscription()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setLoadingSubscription(false));
  }, [isLoggedIn]);

  const currentPlan = subscription?.plan || "free";
  const planAllowance = currentPlan === "premium" ? 100 : currentPlan === "standard" ? 50 : 10;

  async function handleUpgrade(plan) {
    setError("");
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!plan.priceId) return;

    setCheckoutLoading(true);
    try {
      const { url } = await createCheckoutSession(plan.priceId);
      window.location.href = url;
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not start checkout. Please try again."));
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleManageSubscription() {
    setError("");
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not open subscription portal."));
    } finally {
      setPortalLoading(false);
    }
  }

  function nextResetLabel() {
    if (!subscription?.creditsResetAt) return null;
    const resetDate = new Date(subscription.creditsResetAt);
    resetDate.setDate(resetDate.getDate() + 30);
    return resetDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <button type="button" onClick={() => navigate("/")} style={s.logoBtn} aria-label="Home">
          <span style={s.logoBadge}><Zap size={16} color="#fff" /></span>
          <span style={s.logoText}>InterviewAI</span>
        </button>
        <div style={s.navRight}>
          {isLoggedIn ? (
            <button type="button" onClick={() => navigate("/interview/setup")} style={s.navCta}>
              Start interview <ArrowRight size={14} style={{ marginLeft: 4 }} />
            </button>
          ) : (
            <>
              <button type="button" onClick={() => navigate("/login")} style={s.navLogin}>Log in</button>
              <button type="button" onClick={() => navigate("/register")} style={s.navCta}>Get started</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={s.badge}>
            <Sparkles size={13} style={{ marginRight: 6 }} />
            Simple, credit-based pricing
          </div>
          <h1 style={s.heroTitle}>Pay for what you practise</h1>
          <p style={s.heroSub}>
            Start free with 10 monthly credits. Upgrade to Standard or Premium for more interview sessions.
          </p>
        </motion.div>
      </section>

      {/* Current plan summary (logged-in only) */}
      {isLoggedIn && !loadingSubscription && subscription && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={s.summaryCard}
        >
          <div style={s.summaryRow}>
            <div>
              <div style={s.summaryLabel}>Current plan</div>
              <div style={s.summaryPlan}>
                {currentPlan === "premium" ? "Premium" : currentPlan === "standard" ? "Standard" : "Free"}
                {subscription.subscriptionStatus === "active" && currentPlan !== "free" && (
                  <span style={s.activePill}>Active</span>
                )}
                {subscription.subscriptionStatus === "past_due" && (
                  <span style={{ ...s.activePill, background: "#fef2f2", color: "#b42318", border: "1px solid #fca5a5" }}>
                    Payment past due
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={s.summaryLabel}>Next credit reset</div>
              <div style={s.summaryValue}>{nextResetLabel() || "—"}</div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <CreditBar current={subscription.credits} total={planAllowance} />
          </div>

          {currentPlan !== "free" && (
            <button
              type="button"
              onClick={handleManageSubscription}
              style={s.portalBtn}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 size={14} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} />
              ) : (
                <ExternalLink size={14} style={{ marginRight: 6 }} />
              )}
              Manage subscription
            </button>
          )}
        </motion.div>
      )}

      {/* Error banner */}
      {error && (
        <div style={s.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#b42318", fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Pricing cards */}
      <section style={s.cardsSection}>
        <div style={s.cardsGrid}>
          {PLANS.map((plan, idx) => {
            const isCurrent = isLoggedIn && currentPlan === plan.id;
            const isSelected = selectedPlan === plan.id;
            // A logged-in user on free can upgrade to standard or premium.
            // A logged-in user on standard can upgrade to premium.
            const isUpgradable =
              isLoggedIn &&
              plan.priceId &&
              (
                (currentPlan === "free" && (plan.id === "standard" || plan.id === "premium")) ||
                (currentPlan === "standard" && plan.id === "premium")
              );
            const isNotLoggedIn = !isLoggedIn && plan.priceId;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.1 }}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  ...s.card,
                  ...(isSelected ? s.cardSelected : {}),
                  ...(isSelected && plan.highlighted ? s.cardSelectedHighlighted : {}),
                  ...(isSelected ? {} : plan.highlighted ? s.cardHighlighted : {}),
                  cursor: "pointer",
                }}
              >
                {plan.highlighted && (
                  <div style={s.popularBadge}>
                    <Sparkles size={11} style={{ marginRight: 4 }} />
                    Most popular
                  </div>
                )}

                <div style={s.cardTop}>
                  <div>
                    <div style={{
                      ...s.planName,
                      ...(isSelected ? { color: "#0a1f17" } : {}),
                    }}>
                      {plan.name}
                    </div>
                    <div style={{
                      ...s.planTagline,
                      ...(isSelected ? { color: "#4a6b5f" } : {}),
                    }}>
                      {plan.tagline}
                    </div>
                  </div>
                  <div style={s.priceBlock}>
                    <span style={{
                      ...s.price,
                      ...(isSelected ? { color: "#0a1f17" } : {}),
                    }}>
                      {plan.price}
                    </span>
                    <span style={{
                      ...s.period,
                      ...(isSelected ? { color: "#4a6b5f" } : {}),
                    }}>
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div style={{ ...s.creditChip, ...(plan.highlighted ? s.creditChipDark : {}) }}>
                  <Zap size={13} style={{ marginRight: 5 }} />
                  {plan.credits.toLocaleString()} credits / month
                </div>

                <ul style={s.featureList}>
                  {plan.features.map((f) => {
                    const Icon = f.icon;
                    return (
                      <li key={f.label} style={s.featureItem}>
                        <span style={{
                          ...s.featureIcon,
                          ...(isSelected ? { background: "#dcfce7", color: "#059669" } : {}),
                          ...((plan.highlighted && !isSelected) ? s.featureIconDark : {}),
                        }}>
                          <Icon size={13} />
                        </span>
                        <span style={{
                          ...s.featureLabel,
                          ...(isSelected ? { color: "#214236" } : {}),
                        }}>
                          {f.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div style={{ marginTop: "auto", paddingTop: 24 }}>
                  {isCurrent && plan.id === "free" && (
                    <div style={s.currentPlanBtn}>Current Plan</div>
                  )}
                  {isCurrent && plan.id !== "free" && (
                    <button
                      type="button"
                      onClick={handleManageSubscription}
                      style={s.manageBtn}
                      disabled={portalLoading}
                    >
                      {portalLoading ? <Loader2 size={14} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} /> : null}
                      Manage Plan
                    </button>
                  )}
                  {isUpgradable && (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(plan)}
                      style={s.upgradeBtn}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? (
                        <Loader2 size={14} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} />
                      ) : (
                        <CreditCard size={14} style={{ marginRight: 6 }} />
                      )}
                      {plan.cta}
                    </button>
                  )}
                  {isNotLoggedIn && (
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      style={s.upgradeBtn}
                    >
                      Get started — it's free
                    </button>
                  )}
                  {!isLoggedIn && plan.id === "free" && (
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      style={s.currentPlanBtn}
                    >
                      Sign up free
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Credit cost explainer */}
      <section style={s.explainer}>
        <h2 style={s.explainerTitle}>How credits work</h2>
        <p style={s.explainerSub}>One credit, one question. Your monthly allowance resets every 30 days.</p>
        <div style={s.costGrid}>
          {[
            { q: 5, c: 5 },
            { q: 10, c: 10 },
          ].map(({ q, c }) => (
            <div key={q} style={s.costCard}>
              <div style={s.costNum}>{q}</div>
              <div style={s.costLabel}>questions</div>
              <div style={s.costEq}>=</div>
              <div style={{ ...s.costNum, color: "#059669" }}>{c}</div>
              <div style={{ ...s.costLabel, color: "#059669" }}>credits</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerLogo}>
            <span style={s.logoBadge}><Zap size={14} color="#fff" /></span>
            <span style={{ fontWeight: 700, color: "#0a1f17" }}>InterviewAI</span>
          </div>
          <p style={{ fontSize: 13, color: "#6b7e78" }}>
            © 2026 InterviewAI. All rights reserved.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — exact same palette as the rest of the application
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#0a1f17",
    fontFamily: "inherit",
    overflowX: "hidden",
  },

  // Nav
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 40px",
    backgroundColor: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #e5ede9",
  },
  logoBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  logoBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "linear-gradient(135deg, #059669, #0f5f49)",
  },
  logoText: {
    fontSize: 17,
    fontWeight: 800,
    color: "#0a1f17",
    letterSpacing: "-0.01em",
  },
  navRight: { display: "flex", alignItems: "center", gap: 12 },
  navLogin: {
    background: "none",
    border: "1px solid #c8d6d1",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    color: "#214236",
    cursor: "pointer",
  },
  navCta: {
    display: "flex",
    alignItems: "center",
    background: "#0f5f49",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
  },

  // Hero
  hero: {
    textAlign: "center",
    padding: "80px 40px 48px",
    maxWidth: 700,
    margin: "0 auto",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 9999,
    padding: "5px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#059669",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: "clamp(32px, 5vw, 52px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#0a1f17",
    marginBottom: 14,
    lineHeight: 1.1,
  },
  heroSub: {
    fontSize: 17,
    color: "#4a6b5f",
    lineHeight: 1.65,
    maxWidth: 480,
    margin: "0 auto",
  },

  // Summary card
  summaryCard: {
    maxWidth: 640,
    margin: "0 auto 32px",
    padding: "22px 28px",
    border: "1px solid #d9e2e0",
    borderRadius: 16,
    background: "#ffffff",
    boxShadow: "0 4px 16px rgba(10,31,23,0.06)",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    flexWrap: "wrap",
    gap: 12,
  },
  summaryLabel: { fontSize: 12, fontWeight: 600, color: "#6b7e78", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
  summaryPlan: { fontSize: 20, fontWeight: 700, color: "#0a1f17", display: "flex", alignItems: "center", gap: 8 },
  summaryValue: { fontSize: 14, fontWeight: 600, color: "#214236" },
  activePill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 9px",
    borderRadius: 9999,
    background: "#f0fdf4",
    color: "#059669",
    border: "1px solid #bbf7d0",
  },
  portalBtn: {
    display: "inline-flex",
    alignItems: "center",
    marginTop: 16,
    background: "none",
    border: "1px solid #c8d6d1",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#214236",
    cursor: "pointer",
  },

  // Error
  errorBanner: {
    maxWidth: 640,
    margin: "0 auto 20px",
    padding: "12px 16px",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: 10,
    fontSize: 14,
    color: "#b42318",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  // Cards
  cardsSection: { padding: "0 40px 64px", maxWidth: 1100, margin: "0 auto" },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 24,
    maxWidth: 960,
    margin: "0 auto",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    padding: "28px 26px",
    border: "1px solid #d9e2e0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 2px 12px rgba(10,31,23,0.05)",
    position: "relative",
    transition: "background-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease",
    userSelect: "none",
  },
  cardHighlighted: {
    background: "#ffffff",
    border: "1px solid #d9e2e0",
    boxShadow: "0 2px 12px rgba(10,31,23,0.05)",
    transform: "none",
  },
  cardSelected: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
    boxShadow: "0 0 0 1px rgba(34, 197, 94, 0.18), 0 0 18px rgba(16, 185, 129, 0.12), 0 0 32px rgba(34, 197, 94, 0.08)",
    transform: "translateY(-2px)",
  },
  cardSelectedHighlighted: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
    boxShadow: "0 0 0 1px rgba(34, 197, 94, 0.2), 0 0 22px rgba(16, 185, 129, 0.14), 0 0 36px rgba(34, 197, 94, 0.08)",
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#10b981",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 9999,
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  planName: { fontSize: 20, fontWeight: 800, color: "#0a1f17", marginBottom: 2 },
  planTagline: { fontSize: 13, color: "#6b7e78" },
  priceBlock: { textAlign: "right" },
  price: { fontSize: 30, fontWeight: 800, color: "#0a1f17", letterSpacing: "-0.02em" },
  period: { fontSize: 13, color: "#6b7e78" },
  creditChip: {
    display: "inline-flex",
    alignItems: "center",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 9999,
    padding: "5px 12px",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#059669",
    marginBottom: 20,
    width: "fit-content",
  },
  creditChipDark: {
    background: "rgba(16,185,129,0.15)",
    border: "1px solid rgba(16,185,129,0.3)",
    color: "#6ee7b7",
  },
  featureList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 },
  featureItem: { display: "flex", alignItems: "center", gap: 10 },
  featureIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 6,
    background: "#f0fdf4",
    color: "#059669",
    flexShrink: 0,
  },
  featureIconDark: { background: "rgba(255,255,255,0.12)", color: "#6ee7b7" },
  featureLabel: { fontSize: 13.5, color: "#214236" },

  // CTAs inside cards
  currentPlanBtn: {
    width: "100%",
    padding: "11px 0",
    textAlign: "center",
    fontSize: 14,
    fontWeight: 600,
    color: "#4a6b5f",
    background: "#f5f7f8",
    border: "1px solid #d9e2e0",
    borderRadius: 10,
    cursor: "default",
  },
  upgradeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 700,
    color: "#0a1f17",
    background: "#10b981",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  manageBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 10,
    cursor: "pointer",
  },

  // Credit cost explainer
  explainer: {
    background: "#f5f7f8",
    padding: "56px 40px",
    textAlign: "center",
  },
  explainerTitle: { fontSize: 26, fontWeight: 800, color: "#0a1f17", marginBottom: 10 },
  explainerSub: { fontSize: 15, color: "#4a6b5f", marginBottom: 36 },
  costGrid: {
    display: "flex",
    justifyContent: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  costCard: {
    background: "#ffffff",
    border: "1px solid #d9e2e0",
    borderRadius: 14,
    padding: "20px 28px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    minWidth: 120,
    boxShadow: "0 2px 8px rgba(10,31,23,0.05)",
  },
  costNum: { fontSize: 30, fontWeight: 800, color: "#0a1f17", lineHeight: 1.1 },
  costLabel: { fontSize: 12, fontWeight: 600, color: "#6b7e78", textTransform: "uppercase", letterSpacing: "0.05em" },
  costEq: { fontSize: 20, fontWeight: 700, color: "#b0c4bc", margin: "4px 0" },

  // Footer
  footer: {
    borderTop: "1px solid #e5ede9",
    padding: "28px 40px",
    background: "#ffffff",
  },
  footerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  footerLogo: { display: "flex", alignItems: "center", gap: 8 },
};
