import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
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

  const credits = subscription?.credits?.toLocaleString() ?? 1000;

  return (
    <div className="payment-success-page">
      <nav className="payment-nav">
        <button type="button" onClick={() => navigate("/")} className="brand" aria-label="InterviewAI home">
          <span className="brand-mark"><Zap size={17} aria-hidden="true" /></span>
          <span>InterviewAI</span>
        </button>
        <button type="button" className="ghost-button" onClick={() => navigate("/pricing")}>
          View pricing
        </button>
      </nav>

      <main className="payment-shell">
        <section className="payment-copy" aria-labelledby="payment-title">
          <div className="eyebrow-pill">
            <Sparkles size={14} aria-hidden="true" />
            Stripe checkout
          </div>
          <h1 id="payment-title">
            {status === "confirmed" ? "Your Pro workspace is ready." : "Finishing your subscription setup."}
          </h1>
          <p>
            We confirm the payment through Stripe first, then unlock your interview credits as soon
            as the subscription webhook reaches your account.
          </p>

          <div className="assurance-row">
            <span><CheckCircle2 size={15} aria-hidden="true" /> Secure checkout</span>
            <span><ShieldCheck size={15} aria-hidden="true" /> Account-linked credits</span>
            <span><CreditCard size={15} aria-hidden="true" /> Pro plan billing</span>
          </div>
        </section>

        <motion.section
          key={status}
          className="status-panel"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
        >
          {status === "polling" && (
            <>
              <div className="panel-topline">
                <span className="live-status"><span /> Processing</span>
                <span>{pollCount + 1}/{MAX_POLLS}</span>
              </div>
              <div className="icon-wrap">
                <Loader2 size={38} aria-hidden="true" className="spin-icon" />
              </div>
              <h2>Payment received</h2>
              <p>
                We're confirming your subscription with Stripe. This usually takes a few seconds.
              </p>
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${Math.min(((pollCount + 1) / MAX_POLLS) * 100, 100)}%` }} />
              </div>
              <div className="dot-row" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.3}s` }} />
                ))}
              </div>
            </>
          )}

          {status === "confirmed" && (
            <>
              <div className="panel-topline">
                <span className="success-badge"><Sparkles size={13} aria-hidden="true" /> Subscription activated</span>
                <span>Pro</span>
              </div>
              <div className="icon-wrap success">
                <CheckCircle2 size={42} aria-hidden="true" />
              </div>
              <h2>Welcome to Pro</h2>
              <p>
                Your Pro plan is now active. You have <strong>{credits}</strong> credits ready to use.
              </p>
              <div className="credit-strip">
                <span>Available credits</span>
                <strong>{credits}</strong>
              </div>
              <button
                type="button"
                onClick={() => navigate("/interview/setup")}
                className="solid-button"
              >
                <span>Start practicing</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/pricing")}
                className="outline-button"
              >
                View subscription
              </button>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="panel-topline">
                <span className="pending-badge"><CheckCircle2 size={13} aria-hidden="true" /> Payment successful</span>
                <span>Pending</span>
              </div>
              <div className="icon-wrap pending">
                <CheckCircle2 size={42} aria-hidden="true" />
              </div>
              <h2>Subscription still processing</h2>
              <p>
                Your payment went through. Your subscription may take a moment to appear on your account.
              </p>
              <button
                type="button"
                onClick={() => navigate("/pricing")}
                className="solid-button"
              >
                Go to pricing
              </button>
            </>
          )}
        </motion.section>
      </main>

      <style>{`
        .payment-success-page {
          --ink: #111827;
          --muted: #5b6472;
          --soft: #f6f8fb;
          --panel: #ffffff;
          --line: rgba(203,213,225,0.72);
          --line-strong: rgba(15,23,42,0.14);
          --emerald: #10b981;
          --emerald-dark: #047857;
          --teal-ink: #073b3a;
          --amber: #f59e0b;
          --radius: 8px;
          --shadow: 0 22px 60px rgba(15,23,42,0.12);
          min-height: 100vh;
          overflow-x: hidden;
          color: var(--ink);
          background:
            linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px),
            linear-gradient(180deg, rgba(17,24,39,0.035) 1px, transparent 1px),
            radial-gradient(circle at 16% 12%, rgba(16,185,129,0.16), transparent 32%),
            radial-gradient(circle at 88% 22%, rgba(245,158,11,0.12), transparent 26%),
            linear-gradient(180deg, #fbfdfc 0%, #f6f8fb 100%);
          background-size: 46px 46px, 46px 46px, auto, auto, auto;
        }

        .payment-success-page * {
          box-sizing: border-box;
        }

        .payment-nav {
          width: min(1180px, calc(100% - 40px));
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin: 0 auto;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--ink);
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0;
          cursor: pointer;
        }

        .brand-mark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: var(--radius);
          color: #fff;
          background: linear-gradient(135deg, var(--teal-ink), var(--emerald));
          box-shadow: 0 12px 24px rgba(16,185,129,0.24);
        }

        .payment-shell {
          width: min(1180px, calc(100% - 40px));
          min-height: calc(100vh - 72px);
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(360px, 0.65fr);
          align-items: center;
          gap: 54px;
          margin: 0 auto;
          padding: 56px 0 72px;
        }

        .payment-copy {
          max-width: 690px;
        }

        .eyebrow-pill {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(16,185,129,0.22);
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(236,253,245,0.9);
          color: var(--emerald-dark);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .payment-copy h1 {
          max-width: 760px;
          margin: 18px 0 0;
          color: var(--ink);
          font-size: clamp(44px, 6.8vw, 78px);
          line-height: 0.98;
          letter-spacing: 0;
        }

        .payment-copy p {
          max-width: 620px;
          margin: 20px 0 0;
          color: var(--muted);
          font-size: 18px;
          line-height: 1.72;
        }

        .assurance-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 28px;
        }

        .assurance-row span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 10px 12px;
          background: rgba(255,255,255,0.72);
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
        }

        .assurance-row svg {
          color: var(--emerald-dark);
        }

        .status-panel {
          position: relative;
          overflow: hidden;
          padding: 28px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.86);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
        }

        .status-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(135deg, rgba(236,253,245,0.92), rgba(255,255,255,0.34) 44%, rgba(255,247,237,0.48)),
            linear-gradient(180deg, rgba(255,255,255,0.7), transparent);
        }

        .status-panel > * {
          position: relative;
          z-index: 1;
        }

        .panel-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 26px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .live-status,
        .success-badge,
        .pending-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 7px 10px;
          background: #ecfdf5;
          color: var(--emerald-dark);
          border: 1px solid rgba(16,185,129,0.22);
          letter-spacing: 0;
          text-transform: none;
        }

        .live-status span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--emerald);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .pending-badge {
          background: #fffbeb;
          color: #b45309;
          border-color: rgba(245,158,11,0.28);
        }

        .icon-wrap {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border-radius: var(--radius);
          background: #ecfdf5;
          color: var(--emerald-dark);
          border: 1px solid rgba(16,185,129,0.22);
          margin-bottom: 22px;
        }

        .icon-wrap.success {
          background: linear-gradient(135deg, var(--teal-ink), var(--emerald));
          color: #fff;
          box-shadow: 0 14px 34px rgba(4,120,87,0.26);
        }

        .icon-wrap.pending {
          background: #fffbeb;
          color: #b45309;
          border-color: rgba(245,158,11,0.28);
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        .status-panel h2 {
          margin: 0;
          color: var(--ink);
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.05;
          letter-spacing: 0;
        }

        .status-panel p {
          margin: 14px 0 0;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.7;
        }

        .status-panel strong {
          color: var(--ink);
        }

        .progress-track {
          height: 8px;
          overflow: hidden;
          margin-top: 24px;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--emerald-dark), var(--emerald));
          transition: width 0.35s ease;
        }

        .dot-row {
          display: flex;
          gap: 8px;
          margin-top: 18px;
        }

        .dot-row span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--emerald);
          animation: dotPulse 1.2s ease-in-out infinite;
        }

        .credit-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin: 24px 0 18px;
          padding: 16px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.78);
          color: var(--muted);
          font-size: 13px;
          font-weight: 850;
        }

        .credit-strip strong {
          font-size: 24px;
          color: var(--emerald-dark);
        }

        .ghost-button,
        .outline-button,
        .solid-button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          padding: 0 17px;
          font-weight: 750;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .ghost-button {
          background: rgba(255,255,255,0.68);
          color: var(--ink);
        }

        .outline-button {
          width: 100%;
          margin-top: 10px;
          background: rgba(255,255,255,0.78);
          color: var(--ink);
        }

        .solid-button {
          width: 100%;
          margin-top: 24px;
          border-color: transparent;
          color: #fff;
          background: linear-gradient(135deg, var(--teal-ink), var(--emerald-dark) 52%, var(--emerald));
          box-shadow: 0 14px 32px rgba(4,120,87,0.28);
        }

        .solid-button:hover,
        .outline-button:hover,
        .ghost-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(15,23,42,0.12);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.52; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }

        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 920px) {
          .payment-shell {
            grid-template-columns: 1fr;
            gap: 34px;
            align-items: start;
            padding-top: 34px;
          }

          .payment-copy {
            max-width: 760px;
          }
        }

        @media (max-width: 620px) {
          .payment-nav,
          .payment-shell {
            width: min(100% - 28px, 1180px);
          }

          .payment-nav {
            min-height: 66px;
          }

          .payment-nav .ghost-button {
            display: none;
          }

          .payment-copy h1 {
            font-size: clamp(38px, 13vw, 54px);
          }

          .payment-copy p {
            font-size: 16px;
          }

          .status-panel {
            padding: 20px;
          }

          .panel-topline {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
