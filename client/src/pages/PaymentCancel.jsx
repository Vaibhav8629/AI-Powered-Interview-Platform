import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, XCircle, ArrowLeft, ArrowRight } from "lucide-react";

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #f1f5f9", padding: "0 24px", height: 64, display: "flex", alignItems: "center" }}>
        <button type="button" onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #047857, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={16} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>InterviewAI</span>
        </button>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: "100%", maxWidth: 460, background: "#fff", border: "1px solid #f1f5f9", borderRadius: 24, padding: "44px 40px", textAlign: "center", boxShadow: "0 8px 40px rgba(15,23,42,0.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}
        >
          <div style={{ width: 80, height: 80, borderRadius: 22, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <XCircle size={40} color="#dc2626" />
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 850, color: "#0f172a", letterSpacing: "-0.02em", margin: "0 0 10px" }}>Payment cancelled</h1>
          <p style={{ fontSize: 15.5, color: "#4b5563", lineHeight: 1.7, margin: "0 0 32px", maxWidth: 340 }}>
            No payment was made and your plan hasn't changed. You can upgrade any time from the pricing page.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <button type="button" onClick={() => navigate("/pricing")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px", background: "linear-gradient(135deg, #047857, #10b981)", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(5,150,105,0.25)", transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              Return to Pricing <ArrowRight size={15} />
            </button>
            <button type="button" onClick={() => navigate("/")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 11, fontSize: 14.5, fontWeight: 650, color: "#374151", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#10b981"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#e2e8f0"}
            >
              <ArrowLeft size={15} /> Back to home
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
