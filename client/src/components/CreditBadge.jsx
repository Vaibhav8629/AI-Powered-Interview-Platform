/**
 * CreditBadge
 *
 * A compact credit balance indicator designed to sit inside the app's
 * navigation bar or any page header.  Matches the emerald design system.
 *
 * Props:
 *   credits      {number}  current credit balance
 *   planAllowance{number}  total credits for the plan (e.g. 100 or 1000)
 *   plan         {string}  "free" | "pro"
 *   onClick      {func}    called when the badge is clicked (navigate to /pricing)
 */

import { Zap } from "lucide-react";

export default function CreditBadge({ credits = 0, planAllowance = 100, plan = "free", onClick }) {
  const pct = planAllowance > 0 ? Math.min((credits / planAllowance) * 100, 100) : 0;
  const low = pct < 20;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${credits} of ${planAllowance} credits remaining — click to manage`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "1px solid #d9e2e0",
        borderRadius: 999,
        padding: "5px 12px 5px 8px",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
    >
      {/* Zap icon */}
      <span style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 6,
        background: low ? "#fef2f2" : "#f0fdf4",
        flexShrink: 0,
      }}>
        <Zap size={12} color={low ? "#b42318" : "#059669"} />
      </span>

      {/* Credit count */}
      <span style={{ fontSize: 13, fontWeight: 700, color: low ? "#b42318" : "#214236", whiteSpace: "nowrap" }}>
        {credits.toLocaleString()}
        <span style={{ fontWeight: 500, color: "#6b7e78", marginLeft: 1 }}>
          /{planAllowance.toLocaleString()}
        </span>
      </span>

      {/* Inline mini bar */}
      <span style={{ width: 36, height: 5, borderRadius: 9999, background: "#e5f0ed", overflow: "hidden", flexShrink: 0 }}>
        <span style={{
          display: "block",
          height: "100%",
          width: `${pct}%`,
          borderRadius: 9999,
          background: low
            ? "linear-gradient(90deg, #ef4444, #b91c1c)"
            : "linear-gradient(90deg, #10b981, #059669)",
          transition: "width 0.6s ease",
        }} />
      </span>

      {plan === "pro" && (
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.04em",
          color: "#059669",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 4,
          padding: "1px 5px",
          textTransform: "uppercase",
        }}>
          Pro
        </span>
      )}
    </button>
  );
}
