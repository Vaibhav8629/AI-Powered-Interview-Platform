import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Menu, X, History, CreditCard, LogOut, User, ChevronDown } from "lucide-react";
import { fetchUserCredits } from "../services/api";
import CreditBadge from "./CreditBadge";

const NAV_LINKS = [
  { href: "/interview/setup", label: "Practice" },
  { href: "/interview/history", label: "History" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar({ variant = "light" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [creditInfo, setCreditInfo] = useState(null);

  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchUserCredits().then(setCreditInfo).catch(() => null);
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  const isActive = (href) => location.pathname === href;

  const isDark = variant === "dark";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "all 0.25s ease",
        background: scrolled
          ? isDark ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.94)"
          : isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.7)",
        backdropFilter: "blur(20px)",
        borderBottom: scrolled
          ? `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}`
          : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 24px rgba(15,23,42,0.08)" : "none",
      }}
    >
      <div
        style={{
          maxWidth: "var(--container)",
          margin: "0 auto",
          padding: "0 24px",
          height: 68,
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Brand */}
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            flexShrink: 0,
          }}
          aria-label="InterviewAI home"
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-brand)",
              flexShrink: 0,
            }}
          >
            <Zap size={16} color="#fff" />
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: isDark ? "#fff" : "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            InterviewAI
          </span>
        </button>

        {/* Desktop nav links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginLeft: "auto",
          }}
          className="nav-links-desktop"
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => navigate(link.href)}
              style={{
                background: isActive(link.href)
                  ? isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.05)"
                  : "none",
                border: "none",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive(link.href) ? 700 : 550,
                color: isActive(link.href)
                  ? isDark ? "#fff" : "var(--ink)"
                  : isDark ? "rgba(255,255,255,0.65)" : "var(--muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.04)";
                e.currentTarget.style.color = isDark ? "#fff" : "var(--ink)";
              }}
              onMouseLeave={(e) => {
                if (!isActive(link.href)) {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.65)" : "var(--muted)";
                }
              }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="nav-actions-desktop">
          {isLoggedIn && creditInfo && (
            <CreditBadge
              credits={creditInfo.credits}
              planAllowance={creditInfo.planAllowance ?? 100}
              plan={creditInfo.plan ?? "free"}
              onClick={() => navigate("/pricing")}
              dark={isDark}
            />
          )}

          {isLoggedIn ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: isDark ? "rgba(255,255,255,0.1)" : "var(--surface)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "var(--line)"}`,
                  borderRadius: 99,
                  padding: "7px 12px 7px 8px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--brand-600), var(--brand-400))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={13} color="#fff" />
                </div>
                <ChevronDown
                  size={14}
                  color={isDark ? "rgba(255,255,255,0.6)" : "var(--muted)"}
                  style={{ transition: "transform 0.2s", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0)" }}
                />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      minWidth: 180,
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      boxShadow: "0 20px 48px rgba(15,23,42,0.12), 0 8px 16px rgba(15,23,42,0.06)",
                      padding: "6px",
                      zIndex: 100,
                    }}
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    {[
                      { icon: History, label: "Interview History", href: "/interview/history" },
                      { icon: CreditCard, label: "Manage Credits", href: "/pricing" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => { navigate(item.href); setUserMenuOpen(false); }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          padding: "9px 12px",
                          background: "none",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "var(--ink)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >
                        <item.icon size={15} color="var(--muted)" />
                        {item.label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: "var(--line)", margin: "4px 8px" }} />
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "9px 12px",
                        background: "none",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--error)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                    >
                      <LogOut size={15} color="var(--error)" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "none",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "var(--line)"}`,
                  borderRadius: 9,
                  padding: "9px 16px",
                  fontSize: 14,
                  fontWeight: 650,
                  color: isDark ? "rgba(255,255,255,0.85)" : "var(--ink)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => navigate("/interview/setup")}
                style={{
                  background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))",
                  border: "none",
                  borderRadius: 9,
                  padding: "9px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-brand)",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                Start free
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            background: "none",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "var(--line)"}`,
            borderRadius: 9,
            color: isDark ? "rgba(255,255,255,0.8)" : "var(--ink)",
            cursor: "pointer",
            marginLeft: "auto",
          }}
          className="nav-hamburger"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              overflow: "hidden",
              background: "#fff",
              borderTop: "1px solid var(--line)",
            }}
          >
            <div style={{ padding: "12px 20px 20px" }}>
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => { navigate(link.href); setMenuOpen(false); }}
                  style={{
                    display: "flex",
                    width: "100%",
                    padding: "12px 14px",
                    background: isActive(link.href) ? "var(--brand-50)" : "none",
                    border: "none",
                    borderRadius: 9,
                    fontSize: 15,
                    fontWeight: isActive(link.href) ? 700 : 550,
                    color: isActive(link.href) ? "var(--brand-700)" : "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {link.label}
                </button>
              ))}
              <div style={{ height: 1, background: "var(--line)", margin: "8px 0" }} />
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  style={{
                    display: "flex",
                    width: "100%",
                    padding: "12px 14px",
                    background: "none",
                    border: "none",
                    borderRadius: 9,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--error)",
                    cursor: "pointer",
                    textAlign: "left",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              ) : (
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => { navigate("/login"); setMenuOpen(false); }}
                    style={{
                      flex: 1,
                      padding: "11px",
                      background: "none",
                      border: "1px solid var(--line)",
                      borderRadius: 9,
                      fontSize: 14,
                      fontWeight: 650,
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigate("/register"); setMenuOpen(false); }}
                    style={{
                      flex: 1,
                      padding: "11px",
                      background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))",
                      border: "none",
                      borderRadius: 9,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Get started
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .nav-actions-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
