import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  LockKeyhole,
  Menu,
  MessageSquare,
  Mic,
  MousePointer2,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import CreditBadge from '../components/CreditBadge';
import { fetchUserCredits } from '../services/api';

const ANSWER_TEXT =
  'I would first clarify the user profile and constraints, then outline the tradeoffs before choosing a token-bucket approach with shared state.';

const NAV_ITEMS = [
  { href: '#features', label: 'Features' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#faq', label: 'FAQ' },
];

const FEATURE_CARDS = [
  {
    title: 'Adaptive question flow',
    description: 'The interviewer follows your actual answer, asking sharper follow-ups when your reasoning needs more depth.',
    icon: BrainCircuit,
    accent: 'mint',
  },
  {
    title: 'Role-aware setup',
    description: 'Tune every session around role, seniority, interview type, and the skills you want to pressure-test.',
    icon: Target,
    accent: 'amber',
  },
  {
    title: 'Voice-first practice',
    description: 'Practice out loud with live transcription, listening states, and a pace that feels closer to a real conversation.',
    icon: Mic,
    accent: 'blue',
  },
  {
    title: 'Actionable review',
    description: 'Turn every answer into clear feedback on structure, communication, and technical confidence.',
    icon: BarChart3,
    accent: 'rose',
  },
];

const WORKFLOW = [
  {
    step: '01',
    title: 'Configure the room',
    description: 'Choose role, level, domain, and interview type before the session begins.',
    icon: Briefcase,
  },
  {
    step: '02',
    title: 'Answer naturally',
    description: 'Speak through real interview prompts while the AI adapts to your response.',
    icon: Volume2,
  },
  {
    step: '03',
    title: 'Review the signal',
    description: 'See what worked, what was unclear, and where to practice next.',
    icon: FileText,
  },
];

const CAPABILITIES = [
  { title: 'Adaptive questions', description: 'Follow-ups adjust to the strength and clarity of each answer.', icon: BrainCircuit, image: '/Adaptive_question.png' },
  { title: 'Role-based interviews', description: 'Sessions match the job function, seniority, and interview style you select.', icon: Briefcase, image: '/Role_based_interviews.png' },
  { title: 'Real-time evaluation', description: 'The session tracks communication, confidence, and technical reasoning.', icon: Activity, image: '/Real_time_evaluation.png' },
  { title: 'Performance insights', description: 'Feedback highlights the areas that matter most before the next round.', icon: TrendingUp, image: '/Performance_insights.png' },
  { title: 'Voice-native practice', description: 'Speak, pause, and recover the way you would in a live interview.', icon: Mic, image: '/Voice_native.png' },
];

const FAQS = [
  {
    q: 'How realistic are the AI follow-up questions?',
    a: 'The interview flow is based on your previous answer, so follow-ups can probe missing details, tradeoffs, examples, or unclear reasoning.',
  },
  {
    q: 'Can I practice for different roles?',
    a: 'Yes. The setup flow lets you tailor sessions to role, experience level, interview type, and the skills you want to practice.',
  },
  {
    q: 'Does voice practice work like a real interview?',
    a: 'The product is designed around spoken answers, live transcription, listening states, and post-session feedback rather than typed drills.',
  },
  {
    q: 'Where do I see previous sessions?',
    a: 'Use the history view to return to completed interviews and review past feedback.',
  },
];

const METERS = [
  { label: 'Structure', value: 82 },
  { label: 'Depth', value: 74 },
  { label: 'Clarity', value: 89 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState({});
  const [typedLength, setTypedLength] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const [creditInfo, setCreditInfo] = useState(null);
  const waveBars = useRef([36, 58, 42, 76, 54, 88, 64, 45, 72, 52, 84, 61, 44, 70, 96, 58, 82, 47, 63, 75, 50, 69]).current;

  const transcript = useMemo(() => ANSWER_TEXT.slice(0, typedLength), [typedLength]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) return;

    fetchUserCredits()
      .then(setCreditInfo)
      .catch(() => setCreditInfo(null));
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
      { threshold: 0.18, rootMargin: '0px 0px -80px 0px' }
    );

    document.querySelectorAll('[data-observe]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let direction = 1;
    const interval = setInterval(() => {
      setTypedLength((length) => {
        if (direction === 1 && length >= ANSWER_TEXT.length) {
          direction = -1;
          return length;
        }
        if (direction === -1 && length <= 0) {
          direction = 1;
          return length;
        }
        return length + direction;
      });
    }, 34);

    return () => clearInterval(interval);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);
  const goToSetup = () => navigate('/interview/setup');
  const goToHistory = () => navigate('/interview/history');

  return (
    <div className="landing-page">
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="nav-shell">
          <a className="brand" href="/" aria-label="InterviewAI home">
            <span className="brand-mark"><Zap size={17} aria-hidden="true" /></span>
            <span>InterviewAI</span>
          </a>

          <div className="nav-links">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
          </div>

          <div className="nav-actions">
            {creditInfo && (
              <CreditBadge
                credits={creditInfo.credits}
                planAllowance={creditInfo.planAllowance ?? 100}
                plan={creditInfo.plan ?? 'free'}
                onClick={() => navigate('/pricing')}
              />
            )}
            <button type="button" className="ghost-button" onClick={() => navigate('/login')}>Log in</button>
            <button type="button" className="solid-button small" onClick={goToSetup}>
              <span>Start interview</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className="menu-button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>

        {isMenuOpen && (
          <div id="mobile-menu" className="mobile-menu">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}</a>
            ))}
            <div className="mobile-actions">
              <button type="button" className="ghost-button" onClick={() => navigate('/login')}>Log in</button>
              <button type="button" className="solid-button" onClick={goToSetup}>Start interview</button>
            </div>
          </div>
        )}
      </nav>

      <main>
        <section className="hero">
          <div className="hero-grid">
            <motion.div
              className="hero-copy"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="eyebrow-pill" variants={itemVariants}>
                <Sparkles size={14} aria-hidden="true" />
                AI mock interviews with real follow-up pressure
              </motion.div>
              <motion.h1 variants={itemVariants}>
                Practice the interview, not just the question list.
              </motion.h1>
              <motion.p className="hero-lede" variants={itemVariants}>
                A premium interview workspace for candidates who want realistic voice practice,
                adaptive prompts, and feedback that turns every answer into a sharper next attempt.
              </motion.p>
              <motion.div className="hero-actions" variants={itemVariants}>
                <button type="button" className="solid-button hero-button" onClick={goToSetup}>
                  <Play size={17} aria-hidden="true" />
                  <span>Start mock interview</span>
                </button>
                <button type="button" className="outline-button hero-button" onClick={goToHistory}>
                  <Clock size={17} aria-hidden="true" />
                  <span>View history</span>
                </button>
              </motion.div>
              <motion.div className="hero-assurance" variants={itemVariants}>
                <span><CheckCircle2 size={15} aria-hidden="true" /> Role-based setup</span>
                <span><CheckCircle2 size={15} aria-hidden="true" /> Voice-native sessions</span>
                <span><CheckCircle2 size={15} aria-hidden="true" /> Private review</span>
              </motion.div>
            </motion.div>

            <motion.div
              className="interview-workspace"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            >
              <div className="workspace-topbar">
                <div>
                  <span className="workspace-kicker">Live room</span>
                  <h2>Frontend systems interview</h2>
                </div>
                <span className="live-status"><span /> Listening</span>
              </div>

              <div className="workspace-body">
                <div className="question-panel">
                  <div className="panel-label"><Brain size={14} aria-hidden="true" /> Current prompt</div>
                  <p>Walk me through how you would design a rate limiter for a high-traffic API.</p>
                </div>

                <div className="voice-panel">
                  <div className="voice-header">
                    <div>
                      <div className="panel-label"><Mic size={14} aria-hidden="true" /> Voice answer</div>
                      <span>01:42 elapsed</span>
                    </div>
                    <button type="button" className="icon-button" aria-label="Microphone active">
                      <Mic size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="waveform" aria-hidden="true">
                    {waveBars.map((height, index) => (
                      <span key={index} style={{ '--height': `${height}%`, animationDelay: `${index * 0.045}s` }} />
                    ))}
                  </div>
                </div>

                <div className="transcript-panel">
                  <div className="panel-label"><MessageSquare size={14} aria-hidden="true" /> Live transcript</div>
                  <p>{transcript}<span className="caret" /></p>
                </div>
              </div>

              <div className="score-strip">
                {METERS.map((meter) => (
                  <div key={meter.label} className="mini-meter">
                    <div className="mini-meter-label">
                      <span>{meter.label}</span>
                      <strong>{meter.value}%</strong>
                    </div>
                    <div className="mini-meter-track">
                      <span style={{ width: `${meter.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="section feature-section" data-observe>
          <div className="section-heading split">
            <div>
              <span className="section-kicker">Practice stack</span>
              <h2>Everything on the page moves the candidate toward a better answer.</h2>
            </div>
            <p>
              See the interview environment before you commit to a session: prompts, voice state,
              transcript quality, and feedback are all part of one focused practice flow.
            </p>
          </div>

          <div className={`feature-grid ${visibleSections.features ? 'is-visible' : ''}`}>
            {FEATURE_CARDS.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className={`feature-card accent-${feature.accent}`} style={{ transitionDelay: `${index * 90}ms` }}>
                  <div className="feature-icon"><Icon size={22} aria-hidden="true" /></div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="workflow" className="section workflow-section" data-observe>
          <div className="section-heading centered">
            <span className="section-kicker">Interview flow</span>
            <h2>From setup to review in one clear loop.</h2>
            <p>Each step is designed to reduce ambiguity: choose the room, answer naturally, then review what to improve.</p>
          </div>

          <div className={`workflow-grid ${visibleSections.workflow ? 'is-visible' : ''}`}>
            {WORKFLOW.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.step} className="workflow-card" style={{ transitionDelay: `${index * 120}ms` }}>
                  <div className="workflow-index">{item.step}</div>
                  <div className="workflow-icon"><Icon size={22} aria-hidden="true" /></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="capabilities" className="section capabilities-section" data-observe>
          <div className="section-heading split">
            <div>
              <span className="section-kicker">AI capabilities</span>
              <h2>A richer view of what the platform can do.</h2>
            </div>
            <p>
              The platform combines adaptive prompts, role-specific setup, voice practice,
              and post-session review into one candidate-ready workflow.
            </p>
          </div>

          <div className={`capability-grid ${visibleSections.capabilities ? 'is-visible' : ''}`}>
            {CAPABILITIES.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <article key={capability.title} className="capability-card" style={{ transitionDelay: `${index * 80}ms` }}>
                  <div className="capability-media">
                    <img src={capability.image} alt="" />
                  </div>
                  <div className="capability-copy">
                    <span><Icon size={16} aria-hidden="true" /> {capability.title}</span>
                    <p>{capability.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section review-section" data-observe id="review">
          <div className="review-card">
            <div className="review-copy">
              <span className="section-kicker">Feedback surface</span>
              <h2>Make the next answer easier to improve.</h2>
              <p>
                Feedback is organized around the parts of an answer candidates can actually improve:
                structure, technical depth, clarity, and follow-through.
              </p>
              <div className="review-points">
                <span><MousePointer2 size={16} aria-hidden="true" /> Clear primary action</span>
                <span><ShieldCheck size={16} aria-hidden="true" /> Privacy-forward positioning</span>
                <span><BarChart3 size={16} aria-hidden="true" /> Scannable review metrics</span>
              </div>
            </div>

            <div className="feedback-panel">
              <div className="feedback-header">
                <span>Session review</span>
                <span className="review-badge"><TrendingUp size={14} aria-hidden="true" /> Improving</span>
              </div>
              {METERS.map((meter) => (
                <div key={meter.label} className="feedback-meter">
                  <div>
                    <span>{meter.label}</span>
                    <strong>{meter.value}%</strong>
                  </div>
                  <div className="feedback-track">
                    <span style={{ width: visibleSections.review ? `${meter.value}%` : '0%' }} />
                  </div>
                </div>
              ))}
              <div className="feedback-note">
                <LockKeyhole size={16} aria-hidden="true" />
                Session recordings and transcripts stay tied to the candidate account.
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="section faq-section" data-observe>
          <div className="section-heading centered">
            <span className="section-kicker">Questions</span>
            <h2>What candidates usually want to know.</h2>
          </div>

          <div className="faq-list">
            {FAQS.map((item, index) => (
              <article key={item.q} className={`faq-item ${openFaq === index ? 'is-open' : ''}`}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  aria-expanded={openFaq === index}
                >
                  <span>{item.q}</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <div>
            <span className="section-kicker">Ready room</span>
            <h2>Run the practice interview before the real one runs you.</h2>
            <p>Start a role-calibrated session, answer out loud, and leave with a cleaner practice plan.</p>
          </div>
          <button type="button" className="solid-button hero-button" onClick={goToSetup}>
            <span>Start practicing</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-mark"><Zap size={16} aria-hidden="true" /></span>
          <div>
            <strong>InterviewAI</strong>
            <p>Practice smarter. Interview better.</p>
          </div>
        </div>
        <div className="footer-links">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          <button type="button" onClick={goToHistory}>History</button>
        </div>
      </footer>

      <style>{`
        :root {
          --ink: #111827;
          --muted: #5b6472;
          --soft: #f6f8fb;
          --panel: #ffffff;
          --line: #dfe6ee;
          --line-strong: #cbd5e1;
          --emerald: #10b981;
          --emerald-dark: #047857;
          --teal-ink: #073b3a;
          --amber: #f59e0b;
          --blue: #2563eb;
          --rose: #e11d48;
          --shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
          --radius: 8px;
        }

        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          margin: 0;
          color: var(--ink);
          background:
            linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px),
            linear-gradient(180deg, rgba(17,24,39,0.035) 1px, transparent 1px),
            #f8fafc;
          background-size: 44px 44px;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        button, a { font: inherit; }
        button { cursor: pointer; }
        a { color: inherit; text-decoration: none; }

        @keyframes wave {
          0%, 100% { transform: scaleY(0.38); opacity: 0.55; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes caret {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.72); opacity: 0.55; }
        }

        .landing-page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 16% 0%, rgba(16,185,129,0.18), transparent 31rem),
            radial-gradient(circle at 82% 15%, rgba(245,158,11,0.12), transparent 28rem),
            transparent;
        }

        .navbar {
          position: fixed;
          inset: 0 0 auto;
          z-index: 50;
          border-bottom: 1px solid rgba(203,213,225,0.55);
          background: rgba(248,250,252,0.78);
          backdrop-filter: blur(18px);
          transition: box-shadow 0.25s ease, background 0.25s ease;
        }
        .navbar-scrolled {
          background: rgba(255,255,255,0.92);
          box-shadow: 0 14px 42px rgba(15,23,42,0.08);
        }
        .nav-shell {
          width: min(1180px, calc(100% - 40px));
          min-height: 72px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 28px;
        }
        .brand,
        .footer-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          letter-spacing: 0;
        }
        .brand-mark {
          width: 32px;
          height: 32px;
          display: inline-grid;
          place-items: center;
          color: #fff;
          border-radius: var(--radius);
          background: linear-gradient(135deg, var(--teal-ink), var(--emerald));
          box-shadow: 0 12px 24px rgba(16,185,129,0.24);
          flex: 0 0 auto;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          padding: 5px;
          border: 1px solid rgba(203,213,225,0.7);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.65);
        }
        .nav-links a {
          padding: 8px 12px;
          border-radius: 6px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 650;
          transition: color 0.2s ease, background 0.2s ease;
        }
        .nav-links a:hover {
          color: var(--ink);
          background: #fff;
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ghost-button,
        .outline-button,
        .solid-button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          padding: 0 17px;
          font-weight: 750;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          white-space: nowrap;
        }
        .ghost-button {
          background: rgba(255,255,255,0.68);
          color: var(--ink);
        }
        .outline-button {
          background: rgba(255,255,255,0.74);
          color: var(--ink);
        }
        .solid-button {
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
        .solid-button.small {
          min-height: 40px;
          padding: 0 15px;
          font-size: 14px;
        }
        .menu-button {
          display: none;
          margin-left: auto;
          width: 42px;
          height: 42px;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: #fff;
          color: var(--ink);
          align-items: center;
          justify-content: center;
        }
        .mobile-menu {
          display: none;
        }

        main { padding-top: 72px; }
        .hero {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 72px 0 84px;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(420px, 1.08fr);
          gap: 54px;
          align-items: center;
          min-height: calc(100vh - 130px);
        }
        .hero-copy h1 {
          margin: 18px 0 22px;
          max-width: 720px;
          font-size: clamp(44px, 6.4vw, 78px);
          line-height: 0.96;
          letter-spacing: 0;
        }
        .hero-lede {
          max-width: 610px;
          color: var(--muted);
          font-size: 18px;
          line-height: 1.75;
          margin: 0;
        }
        .eyebrow-pill,
        .section-kicker,
        .panel-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--emerald-dark);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .eyebrow-pill {
          padding: 9px 12px;
          border: 1px solid rgba(16,185,129,0.24);
          border-radius: 999px;
          background: rgba(236,253,245,0.9);
        }
        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 34px 0 22px;
        }
        .hero-button {
          min-height: 52px;
          padding: 0 22px;
          font-size: 15px;
        }
        .hero-assurance {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
        }
        .hero-assurance span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .hero-assurance svg { color: var(--emerald-dark); }

        .interview-workspace,
        .review-card,
        .final-cta {
          border: 1px solid rgba(203,213,225,0.78);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.82);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
        }
        .interview-workspace {
          overflow: hidden;
          position: relative;
        }
        .interview-workspace::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(120deg, rgba(16,185,129,0.14), transparent 34%),
            linear-gradient(300deg, rgba(245,158,11,0.12), transparent 36%);
        }
        .workspace-topbar {
          position: relative;
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 24px;
          border-bottom: 1px solid rgba(203,213,225,0.68);
        }
        .workspace-kicker {
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .workspace-topbar h2 {
          margin: 5px 0 0;
          font-size: 20px;
          letter-spacing: 0;
        }
        .live-status,
        .review-badge {
          height: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 7px 10px;
          background: #ecfdf5;
          color: var(--emerald-dark);
          border: 1px solid rgba(16,185,129,0.22);
          font-size: 12px;
          font-weight: 850;
        }
        .live-status span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--emerald);
          animation: pulse 1.5s ease-in-out infinite;
        }
        .workspace-body {
          position: relative;
          padding: 24px;
          display: grid;
          gap: 14px;
        }
        .question-panel,
        .voice-panel,
        .transcript-panel,
        .feedback-panel {
          border: 1px solid rgba(203,213,225,0.72);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.78);
        }
        .question-panel,
        .transcript-panel {
          padding: 18px;
        }
        .question-panel p {
          margin: 12px 0 0;
          font-size: 21px;
          line-height: 1.45;
          font-weight: 800;
          letter-spacing: 0;
        }
        .voice-panel { padding: 18px; }
        .voice-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }
        .voice-header span {
          display: block;
          margin-top: 6px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
        }
        .icon-button {
          width: 42px;
          height: 42px;
          border-radius: var(--radius);
          border: 1px solid rgba(16,185,129,0.24);
          background: #ecfdf5;
          color: var(--emerald-dark);
          display: inline-grid;
          place-items: center;
        }
        .waveform {
          height: 86px;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
          padding: 0 4px;
        }
        .waveform span {
          flex: 1;
          height: var(--height);
          min-width: 4px;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--emerald), var(--teal-ink));
          animation: wave 1.15s ease-in-out infinite;
          transform-origin: center;
        }
        .transcript-panel {
          min-height: 118px;
          background: #111827;
          color: #fff;
          border-color: rgba(17,24,39,0.3);
        }
        .transcript-panel .panel-label { color: #86efac; }
        .transcript-panel p {
          margin: 12px 0 0;
          color: rgba(255,255,255,0.9);
          line-height: 1.65;
          font-size: 14px;
        }
        .caret {
          display: inline-block;
          width: 2px;
          height: 16px;
          margin-left: 3px;
          vertical-align: -2px;
          background: #86efac;
          animation: caret 0.9s step-end infinite;
        }
        .score-strip {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          border-top: 1px solid rgba(203,213,225,0.68);
          background: rgba(203,213,225,0.8);
        }
        .mini-meter {
          padding: 16px;
          background: rgba(255,255,255,0.9);
        }
        .mini-meter-label {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
        }
        .mini-meter-label strong { color: var(--ink); }
        .mini-meter-track,
        .feedback-track {
          height: 7px;
          overflow: hidden;
          margin-top: 9px;
          border-radius: 999px;
          background: #e2e8f0;
        }
        .mini-meter-track span,
        .feedback-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--emerald-dark), var(--emerald));
          transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .section {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 92px 0;
        }
        .section-heading {
          margin-bottom: 34px;
        }
        .section-heading.split {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(280px, 0.55fr);
          gap: 44px;
          align-items: end;
        }
        .section-heading.centered {
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }
        .section-heading h2,
        .review-copy h2,
        .final-cta h2 {
          margin: 12px 0 0;
          font-size: clamp(31px, 4.2vw, 52px);
          line-height: 1.04;
          letter-spacing: 0;
        }
        .section-heading p,
        .review-copy p,
        .final-cta p {
          color: var(--muted);
          line-height: 1.72;
          font-size: 16px;
          margin: 12px 0 0;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        .feature-card,
        .workflow-card,
        .capability-card {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.55s ease, transform 0.55s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .is-visible .feature-card,
        .is-visible .workflow-card,
        .is-visible .capability-card {
          opacity: 1;
          transform: translateY(0);
        }
        .feature-card {
          min-height: 270px;
          padding: 22px;
          border-radius: var(--radius);
          background: #fff;
          border: 1px solid var(--line);
          box-shadow: 0 16px 44px rgba(15,23,42,0.07);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .feature-card:hover,
        .workflow-card:hover,
        .capability-card:hover {
          transform: translateY(-4px);
          border-color: var(--line-strong);
          box-shadow: 0 22px 54px rgba(15,23,42,0.12);
        }
        .feature-icon,
        .workflow-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: var(--radius);
          color: #fff;
        }
        .accent-mint .feature-icon { background: var(--emerald-dark); }
        .accent-amber .feature-icon { background: var(--amber); }
        .accent-blue .feature-icon { background: var(--blue); }
        .accent-rose .feature-icon { background: var(--rose); }
        .feature-card h3,
        .workflow-card h3,
        .capability-copy span {
          margin: 0;
          font-size: 18px;
          line-height: 1.25;
          letter-spacing: 0;
        }
        .feature-card p,
        .workflow-card p,
        .capability-copy p {
          margin: 10px 0 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.65;
        }

        .workflow-section {
          width: 100%;
          max-width: none;
          padding-left: max(20px, calc((100vw - 1180px) / 2));
          padding-right: max(20px, calc((100vw - 1180px) / 2));
          background:
            linear-gradient(180deg, rgba(255,255,255,0), rgba(236,253,245,0.72) 22%, rgba(236,253,245,0.72) 78%, rgba(255,255,255,0));
        }
        .workflow-grid {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .workflow-card {
          position: relative;
          min-height: 280px;
          padding: 24px;
          border: 1px solid rgba(203,213,225,0.82);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.88);
          overflow: hidden;
        }
        .workflow-index {
          position: absolute;
          right: 20px;
          top: 14px;
          color: rgba(17,24,39,0.08);
          font-size: 68px;
          font-weight: 900;
          line-height: 1;
        }
        .workflow-icon {
          position: relative;
          z-index: 1;
          margin-bottom: 70px;
          background: var(--teal-ink);
        }

        .capability-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
        }
        .capability-card {
          min-height: 318px;
          display: flex;
          flex-direction: column;
          grid-column: span 2;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          background: #fff;
          overflow: hidden;
          box-shadow: 0 16px 44px rgba(15,23,42,0.07);
        }
        .capability-card:nth-child(4) { grid-column: 2 / span 2; }
        .capability-card:nth-child(5) { grid-column: 4 / span 2; }
        .capability-media {
          min-height: 194px;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            linear-gradient(135deg, rgba(236,253,245,0.96), rgba(255,247,237,0.78)),
            #f8fafc;
          border-bottom: 1px solid var(--line);
        }
        .capability-media img {
          width: 100%;
          height: 154px;
          object-fit: contain;
        }
        .capability-copy {
          padding: 18px;
        }
        .capability-copy span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 850;
        }
        .capability-copy svg { color: var(--emerald-dark); }

        .review-card {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(340px, 0.7fr);
          gap: 30px;
          padding: 34px;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.94), rgba(236,253,245,0.88)),
            #fff;
        }
        .review-copy {
          align-self: center;
        }
        .review-points {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }
        .review-points span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          background: rgba(255,255,255,0.75);
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
        }
        .feedback-panel {
          padding: 22px;
          background: #fff;
          box-shadow: 0 18px 48px rgba(15,23,42,0.09);
        }
        .feedback-header,
        .feedback-meter div:first-child {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
        }
        .feedback-header {
          margin-bottom: 22px;
          font-weight: 900;
        }
        .feedback-meter {
          margin-top: 18px;
        }
        .feedback-meter div:first-child {
          color: var(--muted);
          font-size: 13px;
          font-weight: 850;
        }
        .feedback-meter strong { color: var(--ink); }
        .feedback-note {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 24px;
          padding: 14px;
          border-radius: var(--radius);
          background: #111827;
          color: rgba(255,255,255,0.88);
          font-size: 13px;
          line-height: 1.5;
        }
        .feedback-note svg {
          color: #86efac;
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .faq-section {
          max-width: 880px;
        }
        .faq-list {
          display: grid;
          gap: 10px;
        }
        .faq-item {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: rgba(255,255,255,0.84);
          overflow: hidden;
        }
        .faq-item button {
          width: 100%;
          min-height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border: 0;
          background: transparent;
          color: var(--ink);
          padding: 0 20px;
          text-align: left;
          font-weight: 850;
        }
        .faq-item svg {
          flex: 0 0 auto;
          color: var(--emerald-dark);
          transition: transform 0.25s ease;
        }
        .faq-item.is-open svg { transform: rotate(180deg); }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.28s ease, padding 0.28s ease;
        }
        .faq-answer p {
          margin: 0;
          color: var(--muted);
          line-height: 1.65;
          padding: 0 20px;
        }
        .faq-item.is-open .faq-answer {
          max-height: 180px;
          padding-bottom: 20px;
        }

        .final-cta {
          width: min(1180px, calc(100% - 40px));
          margin: 30px auto 80px;
          padding: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          background:
            linear-gradient(135deg, rgba(17,24,39,0.96), rgba(7,59,58,0.96)),
            #111827;
          color: #fff;
          overflow: hidden;
        }
        .final-cta .section-kicker { color: #86efac; }
        .final-cta h2 {
          max-width: 760px;
          color: #fff;
        }
        .final-cta p {
          max-width: 620px;
          color: rgba(255,255,255,0.72);
        }

        .footer {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 28px 0 46px;
          display: flex;
          justify-content: space-between;
          gap: 24px;
          color: var(--muted);
          border-top: 1px solid var(--line);
        }
        .footer-brand strong {
          display: block;
          color: var(--ink);
        }
        .footer-brand p {
          margin: 3px 0 0;
          font-size: 13px;
        }
        .footer-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 14px;
          font-size: 14px;
          font-weight: 750;
        }
        .footer-links button {
          border: 0;
          background: transparent;
          color: inherit;
          padding: 0;
          font-weight: inherit;
        }
        .footer-links a:hover,
        .footer-links button:hover {
          color: var(--ink);
        }

        @media (max-width: 1040px) {
          .hero-grid,
          .section-heading.split,
          .review-card {
            grid-template-columns: 1fr;
          }
          .hero-grid {
            min-height: auto;
          }
          .interview-workspace {
            max-width: 760px;
          }
          .feature-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .capability-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .capability-card,
          .capability-card:nth-child(4),
          .capability-card:nth-child(5) {
            grid-column: auto;
          }
        }

        @media (max-width: 840px) {
          .nav-shell {
            width: min(100% - 28px, 1180px);
          }
          .nav-links,
          .nav-actions {
            display: none;
          }
          .menu-button {
            display: inline-flex;
          }
          .mobile-menu {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: min(100% - 28px, 1180px);
            margin: 0 auto 14px;
            padding: 12px;
            border: 1px solid var(--line);
            border-radius: var(--radius);
            background: rgba(255,255,255,0.96);
            box-shadow: 0 20px 44px rgba(15,23,42,0.12);
          }
          .mobile-menu a {
            padding: 12px;
            border-radius: 6px;
            color: var(--muted);
            font-weight: 800;
          }
          .mobile-menu a:hover {
            color: var(--ink);
            background: var(--soft);
          }
          .mobile-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 8px;
          }
          .hero,
          .section,
          .final-cta,
          .footer {
            width: min(100% - 28px, 1180px);
          }
          .hero {
            padding-top: 46px;
          }
          .workflow-grid,
          .score-strip {
            grid-template-columns: 1fr;
          }
          .workflow-icon {
            margin-bottom: 48px;
          }
          .final-cta,
          .footer {
            align-items: flex-start;
            flex-direction: column;
          }
          .footer-links {
            justify-content: flex-start;
          }
        }

        @media (max-width: 620px) {
          .hero-copy h1 {
            font-size: clamp(38px, 14vw, 54px);
          }
          .hero-lede {
            font-size: 16px;
          }
          .hero-actions,
          .mobile-actions,
          .feature-grid,
          .capability-grid {
            grid-template-columns: 1fr;
          }
          .hero-actions {
            display: grid;
          }
          .hero-button,
          .ghost-button,
          .outline-button,
          .solid-button {
            width: 100%;
          }
          .workspace-topbar,
          .voice-header {
            flex-direction: column;
          }
          .workspace-body,
          .workspace-topbar,
          .review-card,
          .final-cta {
            padding: 18px;
          }
          .question-panel p {
            font-size: 18px;
          }
          .waveform {
            gap: 4px;
            height: 70px;
          }
          .feature-card,
          .workflow-card {
            min-height: 230px;
          }
          .capability-media {
            min-height: 170px;
          }
          .capability-media img {
            height: 130px;
          }
          .section {
            padding: 68px 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
