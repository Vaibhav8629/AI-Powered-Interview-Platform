import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <button type="button" onClick={() => navigate("/")} style={s.logoBtn} aria-label="Home">
          <span style={s.logoBadge}><Zap size={16} color="#fff" /></span>
          <span style={s.logoText}>InterviewAI</span>
        </button>
      </nav>

      <div style={s.center}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={s.card}
        >
          <div style={s.iconWrap}>
            <XCircle size={44} color="#b42318" />
          </div>
          <h1 style={s.title}>Payment Cancelled</h1>
          <p style={s.subtitle}>
            No payment was made and your plan hasn't changed. You can upgrade any time from the
            pricing page.
          </p>
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            style={s.ctaBtn}
          >
            <ArrowLeft size={15} style={{ marginRight: 6 }} />
            Return to Pricing
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={s.secondaryBtn}
          >
            Back to home
          </button>
        </motion.div>
      </div>
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
    maxWidth: 420,
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
  iconWrap: { width: 80, height: 80, borderRadius: 24, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 800, color: "#0a1f17", margin: 0 },
  subtitle: { fontSize: 15, color: "#4a6b5f", lineHeight: 1.6, margin: 0, maxWidth: 340 },
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
};
