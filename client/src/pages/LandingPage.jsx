import React, { useState, useEffect } from 'react';
import { Menu, X, Zap, Mic, BarChart3, Brain, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState({});

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-observe]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const navItems = [
    { href: '#features', label: 'Features' },
    { href: '#workflow', label: 'How it works' },
    { href: '#capabilities', label: 'AI capabilities' },
    { href: '#about', label: 'About' },
  ];

  const revealClass = (id) => `reveal ${visibleSections[id] ? 'reveal-visible' : ''}`;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={{ ...styles.navbar, ...(scrolled ? styles.navbarScrolled : {}) }}>
        <div style={styles.navContent}>
          <div style={styles.logo}>
            <Zap size={24} color="#10b981" style={{ marginRight: '8px' }} aria-hidden="true" />
            <span style={styles.logoText}>InterviewAI</span>
          </div>

          <div className="nav-links" style={styles.navLinks}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="nav-link" style={styles.navLink}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="nav-buttons" style={styles.navButtons}>
            <button type="button" className="btn-login">Log in</button>
            <button type="button" className="btn-cta">Start interview</button>
          </div>

          <button
            type="button"
            className="mobile-menu-btn"
            style={styles.mobileMenuBtn}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div id="mobile-menu" className="mobile-menu">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="mobile-menu-link"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mobile-menu-buttons">
              <button type="button" className="btn-login">Log in</button>
              <button type="button" className="btn-cta">Start interview</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroBadge}>
          <span style={styles.badge}>AI-powered mock interview platform</span>
        </div>

        <h1 style={styles.heroTitle}>
          Practice interviews.
          <br />
          <span style={styles.highlight}>Build confidence.</span>
          <br />
          Get hired.
        </h1>

        <p style={styles.heroDescription}>
          Practice realistic AI-powered mock interviews tailored to your role, experience, and
          skills. Get intelligent follow-up questions, performance insights, and actionable
          feedback.
        </p>

        <div style={styles.heroCTAContainer}>
          <button type="button" className="btn-primary">Start interview</button>
          <button type="button" className="btn-secondary">View history</button>
        </div>

        <div style={styles.trustLine}>
          Role-based interviews &middot; Adaptive questions &middot; AI-powered feedback
        </div>

        {/* Floating Cards in Hero */}
        <div style={styles.floatingCardsContainer}>
          <div className="floating-card float-1" style={{ ...styles.floatingCard, left: '4%', top: '10%' }}>
            <div style={styles.floatingCardContent}>
              <div style={styles.cardLabel}>Frontend developer</div>
              <div style={styles.cardStatus}>
                <span className="status-dot" style={styles.statusIndicator} aria-hidden="true" />
                Interview in progress
              </div>
            </div>
          </div>

          <div className="floating-card float-2" style={{ ...styles.floatingCard, left: '38%', top: '0%' }}>
            <div style={styles.floatingCardContent}>
              <div style={styles.cardLabel}>Communication</div>
              <div style={styles.cardScore}>Excellent</div>
            </div>
          </div>

          <div className="floating-card float-3" style={{ ...styles.floatingCard, left: '68%', top: '14%' }}>
            <div style={styles.floatingCardContent}>
              <div style={styles.cardLabel}>Technical skills</div>
              <div style={styles.cardPercent}>82%</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: '82%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" style={styles.workflowSection} data-observe>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Everything you need to practice smarter</h2>
          <p style={styles.sectionSubtitle}>
            From interview setup to detailed feedback, AI handles the process so you can focus on
            improving.
          </p>
        </div>

        <div className={revealClass('workflow')} id="workflow-cards" style={styles.workflowCards}>
          {[
            {
              step: '01',
              title: 'Choose your interview',
              description:
                'Select your target role, experience level, and interview type to create a personalized interview.',
              icon: Brain,
            },
            {
              step: '02',
              title: 'Interview with AI',
              description:
                'Answer realistic questions with intelligent follow-ups that adapt to your responses.',
              icon: Mic,
            },
            {
              step: '03',
              title: 'Get instant feedback',
              description:
                'Understand your strengths, weaknesses, and areas for improvement with AI-powered evaluation.',
              icon: BarChart3,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="workflow-card"
                style={{
                  ...styles.workflowCard,
                  transitionDelay: `${idx * 100}ms`,
                }}
              >
                <div style={styles.stepLabel}>{item.step}</div>
                <Icon size={32} color="#10b981" style={{ marginBottom: '16px' }} aria-hidden="true" />
                <h3 style={styles.cardTitle}>{item.title}</h3>
                <p style={styles.cardDescription}>{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Advanced AI Capabilities Section */}
      <section id="capabilities" style={styles.capabilitiesSection} data-observe>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            Advanced <span style={styles.highlight}>AI</span> capabilities
          </h2>
        </div>

        <div className={revealClass('capabilities')} id="capabilities" style={styles.capabilitiesGrid}>
          {[
            {
              title: 'Adaptive questions',
              description: 'Questions dynamically adjust based on your answers and performance.',
            },
            {
              title: 'Role-based interviews',
              description: 'Practice interviews specifically designed for your target job role.',
            },
            {
              title: 'Real-time evaluation',
              description: 'Get evaluated on communication, technical knowledge, and answer quality.',
            },
            {
              title: 'Performance insights',
              description: 'Track your progress and identify exactly where you need to improve.',
            },
          ].map((capability, idx) => (
            <div
              key={capability.title}
              className="capability-card"
              style={{ ...styles.capabilityCard, transitionDelay: `${idx * 80}ms` }}
            >
              <CheckCircle2 size={24} color="#10b981" style={{ marginBottom: '12px' }} aria-hidden="true" />
              <h3 style={styles.capabilityTitle}>{capability.title}</h3>
              <p style={styles.capabilityDescription}>{capability.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Experience Section */}
      <section style={styles.productSection} data-observe>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>See it in action</h2>
        </div>

        <div style={styles.dashboardContainer}>
          <div className="dashboard" style={styles.dashboard}>
            <div style={styles.dashboardHeader}>
              <div style={styles.dashboardTitle}>AI interviewer</div>
            </div>

            <div style={styles.dashboardContent}>
              <div style={styles.questionBlock}>
                <div style={styles.questionLabel}>Question</div>
                <div style={styles.questionText}>
                  &ldquo;Tell me about a challenging project you worked on.&rdquo;
                </div>
              </div>

              <div style={styles.timerBlock}>
                <span style={styles.timer}>01:42</span>
              </div>

              <div style={styles.responseBlock}>
                <div style={styles.responseLabel}>Your response</div>
                <div style={styles.responseText}>
                  &ldquo;During my recent project, I led a team of 5 engineers&hellip;&rdquo;
                </div>
              </div>

              <div style={styles.aiStatus}>
                <span className="status-dot" style={styles.listeningDot} aria-hidden="true" />
                Listening&hellip;
              </div>
            </div>
          </div>

          {/* Floating Stats Around Dashboard */}
          <div className="dashboard-stat float-1" style={{ ...styles.dashboardStat, ...styles.dashboardStat1 }}>
            <div style={styles.statValue}>86%</div>
            <div style={styles.statLabel}>Technical</div>
          </div>
          <div className="dashboard-stat float-2" style={{ ...styles.dashboardStat, ...styles.dashboardStat2 }}>
            <div style={styles.statValue}>91%</div>
            <div style={styles.statLabel}>Communication</div>
          </div>
          <div className="dashboard-stat float-3" style={{ ...styles.dashboardStat, ...styles.dashboardStat3 }}>
            <div style={styles.statValue}>84%</div>
            <div style={styles.statLabel}>Confidence</div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={styles.statsSection} data-observe>
        <div style={styles.statsGrid}>
          {[
            { number: '10+', label: 'Interview types' },
            { number: '50+', label: 'AI questions' },
            { number: 'Real-time', label: 'Feedback' },
            { number: '24/7', label: 'Practice' },
          ].map((stat) => (
            <div key={stat.label} style={styles.statCard}>
              <div style={styles.statNumber}>{stat.number}</div>
              <div style={styles.statCardLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section style={styles.finalCTASection} data-observe>
        <h2 style={styles.finalCTATitle}>Your next interview starts here.</h2>
        <p style={styles.finalCTADescription}>
          Stop guessing how you&rsquo;ll perform. Practice with AI, learn from every answer, and
          walk into your next interview prepared.
        </p>
        <button type="button" className="btn-primary">Start practicing</button>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerBrand}>
            <div style={styles.footerLogo}>
              <Zap size={20} color="#10b981" style={{ marginRight: '8px' }} aria-hidden="true" />
              <span>InterviewAI</span>
            </div>
            <p style={styles.footerTagline}>Practice smarter. Interview better.</p>
          </div>

          <div style={styles.footerLinks}>
            {navItems.slice(0, 3).map((item) => (
              <a key={item.href} href={item.href} className="footer-link" style={styles.footerLink}>
                {item.label}
              </a>
            ))}
            <a href="#history" className="footer-link" style={styles.footerLink}>
              History
            </a>
          </div>
        </div>

        <div style={styles.footerBottom}>
          <p>&copy; 2026 InterviewAI. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
          color: #1f2937;
          background-color: #f7f7f5;
        }

        button {
          font-family: inherit;
        }

        a {
          color: inherit;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .nav-link:hover {
          color: #10b981;
        }

        .btn-login {
          background: transparent;
          border: 1px solid #e5e7eb;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          transition: all 0.2s;
        }
        .btn-login:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .btn-cta {
          background: #10b981;
          border: none;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: white;
          transition: all 0.2s;
        }
        .btn-cta:hover {
          background: #059669;
        }

        .btn-primary {
          background: #10b981;
          border: none;
          padding: 14px 32px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          color: white;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .btn-primary:hover {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .btn-secondary {
          background: white;
          border: 1px solid #e5e7eb;
          padding: 14px 32px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .btn-secondary:hover {
          border-color: #d1d5db;
          transform: translateY(-1px);
        }

        .mobile-menu-btn {
          display: none;
        }

        .mobile-menu {
          display: none;
        }

        .floating-card {
          transition: transform 0.3s ease;
        }
        .floating-card:hover {
          transform: translateY(-4px) scale(1.02) !important;
        }
        .float-1 { animation: float 4s ease-in-out infinite; transform: rotate(-2deg); }
        .float-2 { animation: float 4s ease-in-out infinite 0.2s; transform: rotate(1deg); }
        .float-3 { animation: float 4s ease-in-out infinite 0.4s; transform: rotate(-1deg); }

        .status-dot {
          animation: pulse 2s infinite;
        }

        .reveal {
          opacity: 0;
        }
        .reveal-visible {
          opacity: 1;
        }
        .reveal-visible .workflow-card,
        .reveal-visible .capability-card {
          opacity: 1;
          transform: translateY(0) rotate(0deg);
        }
        .workflow-card {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease, box-shadow 0.3s ease;
          cursor: default;
        }
        .workflow-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          transform: translateY(-4px);
        }

        .capability-card {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          cursor: default;
        }
        .capability-card:hover {
          border-color: #10b981;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          transform: translateY(-4px);
        }

        .dashboard-stat {
          animation: float 5s ease-in-out infinite;
        }
        .dashboard-stat.float-1 { animation-delay: 0s; }
        .dashboard-stat.float-2 { animation-delay: 0.3s; }
        .dashboard-stat.float-3 { animation-delay: 0.6s; }

        .footer-link {
          text-decoration: none;
        }
        .footer-link:hover {
          color: #10b981;
        }

        @media (max-width: 900px) {
          .dashboard-stat1, .dashboard-stat2, .dashboard-stat3 {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .nav-links, .nav-buttons {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .mobile-menu {
            display: flex !important;
            flex-direction: column;
            padding: 16px 24px 24px;
            gap: 4px;
            border-top: 1px solid rgba(0, 0, 0, 0.05);
            background: rgba(247, 247, 245, 0.98);
          }
          .mobile-menu-link {
            padding: 12px 0;
            text-decoration: none;
            color: #1f2937;
            font-size: 15px;
            font-weight: 500;
            border-bottom: 1px solid #f0f0ee;
          }
          .mobile-menu-buttons {
            display: flex;
            gap: 12px;
            margin-top: 16px;
          }
          .mobile-menu-buttons button {
            flex: 1;
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

const styles = {
  container: {
    width: '100%',
    backgroundColor: '#f7f7f5',
    color: '#1f2937',
    overflowX: 'hidden',
  },

  // Navbar
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(247, 247, 245, 0.95)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
  },

  navbarScrolled: {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },

  navContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    minWidth: '150px',
  },

  logoText: {
    color: '#1f2937',
  },

  navLinks: {
    display: 'flex',
    gap: '40px',
    flex: 1,
    marginLeft: '60px',
  },

  navLink: {
    textDecoration: 'none',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'color 0.2s',
    cursor: 'pointer',
  },

  navButtons: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },

  mobileMenuBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#1f2937',
    padding: '4px',
  },

  // Hero Section
  hero: {
    marginTop: '80px',
    padding: '120px 40px',
    textAlign: 'center',
    position: 'relative',
    maxWidth: '1400px',
    margin: '80px auto 0',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroBadge: {
    marginBottom: '24px',
    animation: 'slideInDown 0.8s ease 0.1s both',
  },

  badge: {
    display: 'inline-block',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },

  heroTitle: {
    fontSize: '56px',
    fontWeight: '700',
    lineHeight: '1.2',
    marginBottom: '24px',
    color: '#1f2937',
    animation: 'slideInDown 0.8s ease 0.2s both',
  },

  highlight: {
    color: '#10b981',
  },

  heroDescription: {
    fontSize: '18px',
    color: '#6b7280',
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '0 auto 32px',
    animation: 'slideInDown 0.8s ease 0.3s both',
  },

  heroCTAContainer: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginBottom: '32px',
    animation: 'slideInDown 0.8s ease 0.4s both',
  },

  trustLine: {
    fontSize: '13px',
    color: '#9ca3af',
    animation: 'slideInDown 0.8s ease 0.5s both',
    marginBottom: '80px',
  },

  floatingCardsContainer: {
    position: 'relative',
    height: '300px',
    width: '100%',
    maxWidth: '900px',
  },

  floatingCard: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    minWidth: '220px',
    cursor: 'pointer',
  },

  floatingCardContent: {
    textAlign: 'left',
  },

  cardLabel: {
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '8px',
    fontWeight: '500',
  },

  cardStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
  },

  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    display: 'inline-block',
  },

  cardScore: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#10b981',
  },

  cardPercent: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px',
  },

  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },

  // Workflow Section
  workflowSection: {
    padding: '120px 40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  sectionHeader: {
    textAlign: 'center',
    marginBottom: '80px',
  },

  sectionTitle: {
    fontSize: '42px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#1f2937',
  },

  sectionSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
  },

  workflowCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '40px',
  },

  workflowCard: {
    backgroundColor: 'white',
    padding: '40px 32px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
  },

  stepLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: '1px',
    marginBottom: '16px',
  },

  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#1f2937',
  },

  cardDescription: {
    fontSize: '15px',
    color: '#6b7280',
    lineHeight: '1.6',
  },

  // Capabilities Section
  capabilitiesSection: {
    padding: '120px 40px',
    backgroundColor: 'white',
    marginTop: '60px',
  },

  capabilitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  capabilityCard: {
    backgroundColor: '#f9fafb',
    padding: '32px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },

  capabilityTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#1f2937',
  },

  capabilityDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.6',
  },

  // Product Section
  productSection: {
    padding: '120px 40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  dashboardContainer: {
    position: 'relative',
    width: '100%',
    height: '500px',
    margin: '60px auto 0',
  },

  dashboard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
    maxWidth: '700px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 10,
  },

  dashboardHeader: {
    padding: '24px 32px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },

  dashboardTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: '0.5px',
  },

  dashboardContent: {
    padding: '40px 32px',
    position: 'relative',
  },

  questionBlock: {
    marginBottom: '32px',
    paddingRight: '80px',
  },

  questionLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },

  questionText: {
    fontSize: '16px',
    color: '#1f2937',
    fontWeight: '500',
    lineHeight: '1.6',
  },

  timerBlock: {
    position: 'absolute',
    top: '32px',
    right: '32px',
    textAlign: 'center',
  },

  timer: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
  },

  responseBlock: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    borderLeft: '3px solid #10b981',
  },

  responseLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },

  responseText: {
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: '1.6',
  },

  aiStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },

  listeningDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    display: 'inline-block',
  },

  dashboardStat: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: '20px 24px',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    border: '1px solid #e5e7eb',
  },

  dashboardStat1: {
    top: '40px',
    right: '-40px',
    width: '140px',
  },

  dashboardStat2: {
    top: '240px',
    right: '-60px',
    width: '150px',
  },

  dashboardStat3: {
    bottom: '40px',
    left: '-50px',
    width: '140px',
  },

  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
    marginBottom: '4px',
  },

  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },

  // Stats Section
  statsSection: {
    padding: '80px 40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '40px',
  },

  statCard: {
    textAlign: 'center',
    padding: '32px 24px',
  },

  statNumber: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#10b981',
    marginBottom: '8px',
  },

  statCardLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },

  // Final CTA Section
  finalCTASection: {
    padding: '80px 40px',
    textAlign: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  finalCTATitle: {
    fontSize: '42px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#1f2937',
  },

  finalCTADescription: {
    fontSize: '16px',
    color: '#6b7280',
    maxWidth: '600px',
    margin: '0 auto 32px',
    lineHeight: '1.6',
  },

  // Footer
  footer: {
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
    padding: '60px 40px 24px',
    marginTop: '80px',
  },

  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    marginBottom: '40px',
    paddingBottom: '40px',
    borderBottom: '1px solid #e5e7eb',
  },

  footerBrand: {
    textAlign: 'left',
  },

  footerLogo: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#1f2937',
  },

  footerTagline: {
    fontSize: '14px',
    color: '#6b7280',
  },

  footerLinks: {
    display: 'flex',
    gap: '32px',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },

  footerLink: {
    fontSize: '14px',
    color: '#6b7280',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },

  footerBottom: {
    maxWidth: '1400px',
    margin: '0 auto',
    textAlign: 'center',
    fontSize: '13px',
    color: '#9ca3af',
  },
};