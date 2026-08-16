import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  Menu, X, Zap, Mic, BarChart3, Brain, BrainCircuit, Briefcase, Activity, CheckCircle2, Sparkles, ArrowRight,
  Star, ChevronDown, Volume2, TrendingUp, Award, Users, Target, ShieldCheck,
  MessageSquare, Clock,
} from 'lucide-react';
import CreditBadge from '../components/CreditBadge';
import { fetchUserCredits } from '../services/api';

const ANSWER_TEXT =
  "During my recent project, I led a team of five engineers through a critical migration, balancing scope changes with a two-week deadline.";

const FEATURES = [
  {
    title: 'Adaptive questioning',
    description: 'Every follow-up is generated live from your last answer, not pulled from a static bank.',
    icon: Brain,
    size: 'lg',
  },
  {
    title: 'Role-calibrated',
    description: 'Interviews tuned to your target role, seniority, and stack.',
    icon: Target,
    size: 'sm',
  },
  {
    title: 'Real-time evaluation',
    description: 'Communication, technical depth, and structure scored as you speak.',
    icon: BarChart3,
    size: 'sm',
  },
  {
    title: 'Voice-native',
    description: 'Natural spoken interviews with live transcription, no typing required.',
    icon: Mic,
    size: 'md',
  },
  {
    title: 'Actionable feedback',
    description: 'Leave every session with three concrete things to fix before the real thing.',
    icon: CheckCircle2,
    size: 'md',
  },
  {
    title: 'Private by default',
    description: 'Recordings and transcripts are yours. Delete any session in one tap.',
    icon: ShieldCheck,
    size: 'sm',
  },
];

const WORKFLOW = [
  { step: '01', title: 'Choose your interview', description: 'Select your target role, experience level, and interview type to build a personalized session.', icon: Brain },
  { step: '02', title: 'Interview with AI', description: 'Answer realistic questions with intelligent follow-ups that adapt to your responses.', icon: Mic },
  { step: '03', title: 'Get instant feedback', description: 'See exactly where you excelled and where to improve, backed by AI-scored evaluation.', icon: BarChart3 },
];

const CAPABILITIES = [
  { title: 'Adaptive questions', description: 'Questions dynamically adjust based on your answers and performance.', icon: BrainCircuit, image: '/Adaptive_question.png' },
  { title: 'Role-based interviews', description: 'Practice interviews specifically designed for your target job role.', icon: Briefcase, image: '/Role_based_interviews.png' },
  { title: 'Real-time evaluation', description: 'Get evaluated on communication, technical knowledge, and answer quality.', icon: Activity, image: '/Real_time_evaluation.png' },
  { title: 'Performance insights', description: 'Track your progress and identify exactly where you need to improve.', icon: BarChart3, image: '/Performance_insights.png' },
  { title: 'Voice-native', description: 'Natural spoken interviews with live transcription, no typing required.', icon: Mic, image: '/Voice_native.png' },
];

const LOGOS = ['Nova Labs', 'Quantify', 'Northbeam', 'Fintra', 'Corelab', 'Meridian', 'Hearthstack', 'Palladium'];

const TESTIMONIALS = [
  { name: 'Ananya R.', role: 'SDE-2 candidate', initials: 'AR', rating: 5, quote: 'The follow-up questions felt like a real panel, not a script. I walked into my onsite already calm.' },
  { name: 'Marcus T.', role: 'Frontend engineer', initials: 'MT', rating: 5, quote: 'The feedback on my communication score was blunt in the best way. Fixed the exact thing that was holding me back.' },
  { name: 'Priya K.', role: 'New grad, ML', initials: 'PK', rating: 4, quote: 'Ran six mock interviews in a weekend. Each one adapted to what I struggled with in the last.' },
];

const FAQS = [
  { q: 'How realistic are the AI follow-up questions?', a: 'Every follow-up is generated from your actual answer in the moment, the same way a human interviewer probes deeper on a weak point or an interesting claim.' },
  { q: 'Which roles and levels are supported?', a: 'From new-grad to staff level, across frontend, backend, ML, and general SWE tracks. You choose the role and seniority before each session.' },
  { q: 'Can I practice by voice?', a: 'Yes. Sessions are voice-native with live transcription, so you practice the way you will actually be interviewed.' },
  { q: 'What happens to my recordings?', a: 'They stay private to your account. You can review, download, or permanently delete any session at any time.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [typedLength, setTypedLength] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const [counts, setCounts] = useState({ interviews: 0, questions: 0, accuracy: 0, hours: 0 });
  const [creditInfo, setCreditInfo] = useState(null);
  const waveBars = useRef(Array.from({ length: 26 }, () => 18 + Math.random() * 62)).current;
  const workflowRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: workflowRef,
    offset: ['start end', 'end start'],
  });

  const lineProgress = useTransform(scrollYProgress, [0.04, 0.70], [0, 1], { clamp: true });
  const smoothLine = useSpring(lineProgress, { stiffness: 140, damping: 18, restDelta: 0.001 });

  const step1Progress = useTransform(scrollYProgress, [0.06, 0.22], [0, 1], { clamp: true });
  const step2Progress = useTransform(scrollYProgress, [0.24, 0.40], [0, 1], { clamp: true });
  const step3Progress = useTransform(scrollYProgress, [0.42, 0.58], [0, 1], { clamp: true });
  const smoothStep1 = useSpring(step1Progress, { stiffness: 140, damping: 18, restDelta: 0.001 });
  const smoothStep2 = useSpring(step2Progress, { stiffness: 140, damping: 18, restDelta: 0.001 });
  const smoothStep3 = useSpring(step3Progress, { stiffness: 140, damping: 18, restDelta: 0.001 });
  const step1Glow = useTransform(smoothStep1, (v) => `0px ${v * 10}px ${v * 26}px rgba(16,185,129,${0.22 * v})`);
  const step2Glow = useTransform(smoothStep2, (v) => `0px ${v * 10}px ${v * 26}px rgba(16,185,129,${0.22 * v})`);
  const step3Glow = useTransform(smoothStep3, (v) => `0px ${v * 10}px ${v * 26}px rgba(16,185,129,${0.22 * v})`);

  const stepCardX = [
    useTransform(smoothStep1, [0, 1], [50, 0]),
    useTransform(smoothStep2, [0, 1], [-50, 0]),
    useTransform(smoothStep3, [0, 1], [50, 0]),
  ];
  const stepCardScale = [
    useTransform(smoothStep1, [0, 1], [0.98, 1]),
    useTransform(smoothStep2, [0, 1], [0.98, 1]),
    useTransform(smoothStep3, [0, 1], [0.98, 1]),
  ];
  const stepNodeScale = [
    useTransform(smoothStep1, [0, 1], [0.6, 1]),
    useTransform(smoothStep2, [0, 1], [0.6, 1]),
    useTransform(smoothStep3, [0, 1], [0.6, 1]),
  ];

  const navItems = [
    { href: '#features', label: 'Features' },
    { href: '#workflow', label: 'How it works' },
    { href: '#capabilities', label: 'AI capabilities' },
    { href: '#about', label: 'About' },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch credit info for logged-in users
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
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll('[data-observe]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const [timelineStage, setTimelineStage] = useState(0);
  useEffect(() => {
    if (!visibleSections.workflow || timelineStage !== 0) return;
    const timers = [
      setTimeout(() => setTimelineStage(1), 120),
      setTimeout(() => setTimelineStage(2), 900),
      setTimeout(() => setTimelineStage(3), 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [visibleSections.workflow, timelineStage]);

  // Typewriter effect for the live transcript in the hero console
  useEffect(() => {
    let dir = 1;
    const interval = setInterval(() => {
      setTypedLength((len) => {
        if (dir === 1 && len >= ANSWER_TEXT.length) {
          dir = -1;
          return len;
        }
        if (dir === -1 && len <= 0) {
          dir = 1;
          return len;
        }
        return len + dir;
      });
    }, 32);
    return () => clearInterval(interval);
  }, []);

  // Animated counters once the stats section enters view
  useEffect(() => {
    if (!visibleSections.stats) return;
    const targets = { interviews: 12000, questions: 50, accuracy: 96, hours: 24 };
    const duration = 1400;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounts({
        interviews: Math.round(targets.interviews * eased),
        questions: Math.round(targets.questions * eased),
        accuracy: Math.round(targets.accuracy * eased),
        hours: Math.round(targets.hours * eased),
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visibleSections.stats]);

  const handleHeroParallax = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
    });
  };

  const handleTilt = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const rx = ((e.clientY - rect.top - rect.height / 2) / rect.height) * -10;
    const ry = ((e.clientX - rect.left - rect.width / 2) / rect.width) * 10;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
  };
  const resetTilt = (e) => {
    e.currentTarget.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)';
  };

  const handleMagnetic = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.28;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.28;
    btn.style.transform = `translate(${x}px, ${y}px)`;
  };
  const resetMagnetic = (e) => {
    e.currentTarget.style.transform = 'translate(0, 0)';
  };

  const revealClass = (id) => `reveal ${visibleSections[id] ? 'reveal-visible' : ''}`;

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div style={styles.navContent}>
          <div style={styles.logo}>
            <span className="logo-badge"><Zap size={18} color="#ffffff" aria-hidden="true" /></span>
            <span style={styles.logoText}>InterviewAI</span>
          </div>

          <div className="nav-links" style={styles.navLinks}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="nav-link">{item.label}</a>
            ))}
          </div>

          <div className="nav-buttons" style={styles.navButtons}>
            {creditInfo && (
              <CreditBadge
                credits={creditInfo.credits}
                planAllowance={creditInfo.planAllowance ?? 100}
                plan={creditInfo.plan ?? 'free'}
                onClick={() => navigate('/pricing')}
              />
            )}
            <button type="button" className="btn-login" onClick={() => navigate('/login')}>Log in</button>
            <button type="button" className="btn-cta btn-icon-button" onClick={() => navigate('/interview/setup')}>
              <span>Start interview</span>
              <ArrowRight size={14} className="btn-arrow" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className="mobile-menu-btn"
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
              <a key={item.href} href={item.href} className="mobile-menu-link" onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </a>
            ))}
            <div className="mobile-menu-buttons">
              <button type="button" className="btn-login" onClick={() => navigate('/login')}>Log in</button>
              <button type="button" className="btn-cta" onClick={() => navigate('/interview/setup')}>Start interview</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section style={styles.hero} onMouseMove={handleHeroParallax}>
        <div className="blob blob-a" style={{ transform: `translate(${mousePos.x * 14}px, ${mousePos.y * 14}px)` }} />
        <div className="blob blob-b" style={{ transform: `translate(${mousePos.x * -18}px, ${mousePos.y * -10}px)` }} />
        <div className="noise-overlay" aria-hidden="true" />

        <div className="hero-badge">
          <span className="badge"><Sparkles size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} aria-hidden="true" />AI-powered mock interview platform</span>
        </div>

        <h1 className="hero-title" aria-label="Practice interviews. Build confidence. Get hired.">
          {['Practice', 'interviews.'].map((w, i) => (
            <span key={w} className="word-reveal" style={{ animationDelay: `${i * 90}ms` }}>{w}&nbsp;</span>
          ))}
          <br />
          <span className="highlight">
            {['Build', 'confidence.'].map((w, i) => (
              <span key={w} className="word-reveal" style={{ animationDelay: `${(i + 2) * 90}ms` }}>{w}&nbsp;</span>
            ))}
          </span>
          <br />
          <span className="word-reveal" style={{ animationDelay: '360ms' }}>Get hired.</span>
        </h1>

        <p className="hero-description">
          Practice realistic AI-powered mock interviews tailored to your role, experience, and skills.
          Get intelligent follow-up questions, performance insights, and actionable feedback.
        </p>

        <div style={styles.heroCTAContainer}>
          <button type="button" className="btn-primary btn-icon-button" onMouseMove={handleMagnetic} onMouseLeave={resetMagnetic} onClick={() => navigate('/interview/setup')}>
            <span>Start interview</span>
            <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
          </button>
          <button type="button" className="btn-secondary" onMouseMove={handleMagnetic} onMouseLeave={resetMagnetic} onClick={() => navigate('/interview/history')}>
            View history
          </button>
        </div>

        <div className="trust-line">Role-based interviews &middot; Adaptive questions &middot; AI-powered feedback</div>

        {/* AI Interview Console */}
        <div className="console-wrap">
          <div className="glass-card console">
            <div className="console-top">
              <div className="console-dots"><span /><span /><span /></div>
              <div className="console-title">Live AI interview &mdash; Frontend developer</div>
              <div className="console-timer"><Clock size={13} aria-hidden="true" /> 01:42</div>
            </div>

            <div className="console-body">
              <div className="console-question">
                <div className="eyebrow">Question</div>
                <p>&ldquo;Tell me about a challenging project you worked on.&rdquo;</p>
              </div>

              <div className="waveform" aria-hidden="true">
                {waveBars.map((h, i) => (
                  <span key={i} className="wave-bar" style={{ '--h': `${h}%`, animationDelay: `${i * 0.06}s` }} />
                ))}
              </div>

              <div className="console-transcript">
                <div className="eyebrow"><Volume2 size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} aria-hidden="true" />Live transcript</div>
                <p>{ANSWER_TEXT.slice(0, typedLength)}<span className="caret" /></p>
              </div>

              <div className="thinking-row">
                <span className="thinking-dots"><span /><span /><span /></span>
                AI analyzing response&hellip;
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trusted by / logo marquee */}
      <section className="logos-section" data-observe id="logos">
        <div className="logos-label">Trusted by candidates who now work at</div>
        <div className="marquee">
          <div className="marquee-track">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span key={i} className="logo-pill">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="section" data-observe ref={workflowRef}>
        <div className="section-header">
          <h2 className="section-title">Three steps, start to feedback</h2>
          <p className="section-subtitle">From interview setup to detailed feedback, AI handles the process so you can focus on improving.</p>
        </div>

        <div className="timeline">
          <motion.div className="timeline-line" style={{ scaleY: smoothLine }} aria-hidden="true" />
          {WORKFLOW.map((item, idx) => {
            const Icon = item.icon;
            const progress = idx === 0 ? smoothStep1 : idx === 1 ? smoothStep2 : smoothStep3;
            const glow = idx === 0 ? step1Glow : idx === 1 ? step2Glow : step3Glow;
            return (
              <motion.div key={item.step} className="timeline-item" style={{ opacity: progress }}>
                <motion.div
                  className="timeline-node"
                  style={{
                    opacity: progress,
                    scale: stepNodeScale[idx],
                    boxShadow: glow,
                  }}
                >
                  <Icon size={20} aria-hidden="true" />
                </motion.div>
                <motion.div
                  className="timeline-card"
                  style={{
                    opacity: progress,
                    x: stepCardX[idx],
                    scale: stepCardScale[idx],
                  }}
                >
                  <div className="step-label">{item.step}</div>
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-description">{item.description}</p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="section section-alt" data-observe>
        <div className="section-header">
          <h2 className="section-title">Advanced <span className="highlight">AI</span> capabilities</h2>
        </div>

        <div className={`capabilities-grid ${revealClass('capabilities')}`}>
          {CAPABILITIES.map((capability, idx) => {
            const Icon = capability.icon;
            return (
              <div key={capability.title} className="capability-card" style={{ transitionDelay: `${idx * 80}ms` }}>
                <div className="capability-card-inner">
                  <div className="capability-card-face capability-card-front">
                    <div className="capability-card-media">
                      <img src={capability.image} alt={capability.title} className="capability-card-image" />
                    </div>
                    <h3 className="capability-card-title">{capability.title}</h3>
                  </div>
                  <div className="capability-card-face capability-card-back">
                    <div className="capability-card-icon capability-card-icon-back">
                      <Icon size={28} aria-hidden="true" />
                    </div>
                    <h3 className="capability-card-title capability-card-title-back">{capability.title}</h3>
                    <p className="capability-card-description capability-card-description-back">{capability.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Product showcase */}
      <section className="section" data-observe id="product">
        <div className="section-header">
          <h2 className="section-title">See it in action</h2>
        </div>

        <div className="showcase">
          <div className="glass-card showcase-main">
            <div className="console-top">
              <div className="console-dots"><span /><span /><span /></div>
              <div className="console-title">AI interviewer</div>
              <div className="console-timer"><Clock size={13} aria-hidden="true" /> 01:42</div>
            </div>
            <div className="console-body">
              <div className="console-question">
                <div className="eyebrow">Question</div>
                <p>&ldquo;Walk me through how you would design a rate limiter.&rdquo;</p>
              </div>
              <div className="console-transcript">
                <div className="eyebrow"><MessageSquare size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} aria-hidden="true" />Your response</div>
                <p>&ldquo;I&rsquo;d start with a token bucket per client, backed by a shared store for consistency across nodes&hellip;&rdquo;</p>
              </div>
              <div className="thinking-row">
                <span className="status-dot" aria-hidden="true" /> Listening&hellip;
              </div>
            </div>
          </div>

          <aside className="glass-card showcase-sidebar">
            <div className="eyebrow" style={{ marginBottom: 16 }}>Feedback</div>
            {[
              { label: 'Technical depth', value: 86 },
              { label: 'Communication', value: 91 },
              { label: 'Structure', value: 78 },
            ].map((m) => (
              <div key={m.label} className="meter-row">
                <div className="meter-label"><span>{m.label}</span><span>{m.value}%</span></div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: visibleSections.product ? `${m.value}%` : '0%' }} />
                </div>
              </div>
            ))}
            <div className="confidence-badge">
              <TrendingUp size={16} aria-hidden="true" />
              Confidence trending up this session
            </div>
          </aside>
        </div>
      </section>

      {/* Stats */}
      <section className="section stats-section" data-observe id="stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{counts.interviews.toLocaleString()}+</div>
            <div className="stat-label">Interviews completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{counts.questions}+</div>
            <div className="stat-label">Adaptive question types</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{counts.accuracy}%</div>
            <div className="stat-label">Feedback accuracy rating</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{counts.hours}/7</div>
            <div className="stat-label">Available to practice</div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section section-alt" data-observe id="testimonials">
        <div className="section-header">
          <h2 className="section-title">Candidates who practiced their way in</h2>
        </div>
        <div className={`testimonial-grid ${revealClass('testimonials')}`}>
          {TESTIMONIALS.map((t, idx) => (
            <div key={t.name} className="testimonial-card" style={{ transitionDelay: `${idx * 90}ms` }}>
              <div className="stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < t.rating ? '#10b981' : 'none'} color="#10b981" aria-hidden="true" />
                ))}
              </div>
              <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="testimonial-person">
                <span className="avatar">{t.initials}</span>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why choose us / About */}
      <section id="about" className="section" data-observe>
        <div className="section-header">
          <h2 className="section-title">Why candidates choose InterviewAI</h2>
          <p className="section-subtitle">Not a question bank. A practice partner that gets sharper the more you use it.</p>
        </div>
        <div className={`why-grid ${revealClass('about')}`}>
          {[
            { icon: Award, title: 'Built by ex-interviewers', desc: 'Question design informed by real hiring loops at top tech companies.' },
            { icon: Users, title: 'Practiced by thousands', desc: 'A growing base of candidates across SWE, ML, and product roles.' },
            { icon: ShieldCheck, title: 'Private, always', desc: 'Your sessions are never shared or used to train public models.' },
          ].map((w, idx) => {
            const Icon = w.icon;
            return (
              <div key={w.title} className="why-card" style={{ transitionDelay: `${idx * 90}ms` }}>
                <Icon size={24} className="capability-icon" aria-hidden="true" />
                <h3 className="capability-title">{w.title}</h3>
                <p className="capability-description">{w.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-alt" data-observe id="faq">
        <div className="section-header">
          <h2 className="section-title">Frequently asked questions</h2>
        </div>
        <div className="faq-list">
          {FAQS.map((item, idx) => (
            <div key={item.q} className={`faq-item ${openFaq === idx ? 'faq-open' : ''}`}>
              <button
                type="button"
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                aria-expanded={openFaq === idx}
              >
                {item.q}
                <ChevronDown size={18} className="faq-chevron" aria-hidden="true" />
              </button>
              <div className="faq-answer"><p>{item.a}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-section" data-observe id="cta">
        <div className="blob blob-c" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <h2 className="cta-title">Your next interview starts here.</h2>
        <p className="cta-description">
          Stop guessing how you&rsquo;ll perform. Practice with AI, learn from every answer, and
          walk into your next interview prepared.
        </p>
        <button type="button" className="btn-primary btn-primary-lg btn-icon-button" onMouseMove={handleMagnetic} onMouseLeave={resetMagnetic} onClick={() => navigate('/interview/setup')}>
          <span>Start practicing</span>
          <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-badge"><Zap size={16} color="#ffffff" aria-hidden="true" /></span>
              <span>InterviewAI</span>
            </div>
            <p className="footer-tagline">Practice smarter. Interview better.</p>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Product</div>
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="footer-link">{item.label}</a>
            ))}
            <a href="#history" className="footer-link">History</a>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Company</div>
            <a href="#about" className="footer-link">About</a>
            <a href="#testimonials" className="footer-link">Testimonials</a>
            <a href="#faq" className="footer-link">FAQ</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 InterviewAI. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        :root {
          --g-950: #052e1c;
          --g-900: #064e3b;
          --g-800: #065f46;
          --g-700: #047857;
          --g-600: #059669;
          --g-500: #10b981;
          --g-400: #34d399;
          --g-300: #6ee7b7;
          --g-100: #d1fae5;
          --g-50: #ecfdf5;
          --ink: #0a1f17;
          --gray: #5b6b64;
          --gray-light: #8a978f;
          --line: #e3ece7;
          --white: #ffffff;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
          color: var(--ink);
          background-color: var(--white);
        }
        button { font-family: inherit; }
        a { color: inherit; }

        /* ---------- Keyframes ---------- */
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes wordIn { from { opacity: 0; transform: translateY(18px) rotateX(40deg); } to { opacity: 1; transform: translateY(0) rotateX(0); } }
        @keyframes waveform { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
        @keyframes blobDrift { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(20px, -30px) scale(1.08); } }
        @keyframes marqueeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        /* ---------- Layout helpers ---------- */
        .section { padding: 120px 40px; max-width: 1320px; margin: 0 auto; }
        .section-alt { background: var(--g-50); max-width: 100%; padding: 120px 40px; }
        .section-alt > * { max-width: 1320px; margin-left: auto; margin-right: auto; }
        .section-header { text-align: center; margin-bottom: 72px; }
        .section-title { font-size: clamp(32px, 4vw, 44px); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 16px; color: var(--ink); }
        .section-subtitle { font-size: 17px; color: var(--gray); max-width: 600px; margin: 0 auto; line-height: 1.6; }
        .highlight { background: linear-gradient(120deg, var(--g-600), var(--g-400)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--g-600); display: flex; align-items: center; margin-bottom: 8px; }
        .reveal { opacity: 1; }
        .reveal-visible .feature-card,
        .reveal-visible .capability-card,
        .reveal-visible .testimonial-card,
        .reveal-visible .timeline-item,
        .reveal-visible .why-card { opacity: 1; transform: translateY(0); }

        /* ---------- Navbar ---------- */
        .navbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(16px) saturate(160%);
          -webkit-backdrop-filter: blur(16px) saturate(160%);
          border-bottom: 1px solid rgba(6,95,70,0.08);
          transition: box-shadow 0.3s ease, background 0.3s ease;
        }
        .navbar-scrolled { box-shadow: 0 8px 30px rgba(5,46,28,0.08); background: rgba(255,255,255,0.9); }
        .logo-badge {
          width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--g-500), var(--g-700)); box-shadow: 0 4px 14px rgba(16,185,129,0.35);
          margin-right: 10px;
        }
        .nav-link { text-decoration: none; color: var(--gray); font-size: 14px; font-weight: 500; position: relative; padding: 4px 2px; transition: color 0.2s; }
        .nav-link::after { content: ''; position: absolute; left: 0; bottom: -2px; width: 0; height: 2px; background: var(--g-500); transition: width 0.25s ease; }
        .nav-link:hover { color: var(--ink); }
        .nav-link:hover::after { width: 100%; }

        .btn-login { background: transparent; border: 1px solid var(--line); padding: 9px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--ink); transition: all 0.2s; }
        .btn-login:hover { background: var(--g-50); border-color: var(--g-300); }
        .btn-cta { background: linear-gradient(135deg, var(--g-500), var(--g-700)); border: none; padding: 9px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; color: white; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 14px rgba(16,185,129,0.3); }
        .btn-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16,185,129,0.4); }

        .btn-primary {
          background: linear-gradient(135deg, var(--g-500), var(--g-700)); border: none; padding: 15px 34px; border-radius: 10px;
          cursor: pointer; font-size: 16px; font-weight: 700; color: white; box-shadow: 0 10px 30px rgba(16,185,129,0.35);
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .btn-primary:hover { box-shadow: 0 14px 36px rgba(16,185,129,0.45); }
        .btn-primary-lg { padding: 18px 42px; font-size: 17px; }
        .btn-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          line-height: 1;
        }
        .btn-arrow {
          flex-shrink: 0;
          display: inline-block;
          vertical-align: middle;
        }
        .btn-secondary {
          background: white; border: 1px solid var(--line); padding: 15px 34px; border-radius: 10px; cursor: pointer;
          font-size: 16px; font-weight: 700; color: var(--ink); box-shadow: 0 2px 10px rgba(5,46,28,0.06); transition: transform 0.15s ease, border-color 0.2s;
        }
        .btn-secondary:hover { border-color: var(--g-400); }

        .mobile-menu-btn { display: none; background: none; border: none; cursor: pointer; color: var(--ink); padding: 4px; }
        .mobile-menu { display: none; }
        @media (max-width: 768px) {
          .nav-links, .nav-buttons { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .mobile-menu { display: flex !important; flex-direction: column; padding: 16px 24px 24px; gap: 4px; border-top: 1px solid var(--line); background: rgba(255,255,255,0.98); }
          .mobile-menu-link { padding: 12px 0; text-decoration: none; color: var(--ink); font-size: 15px; font-weight: 500; border-bottom: 1px solid var(--g-50); }
          .mobile-menu-buttons { display: flex; gap: 12px; margin-top: 16px; }
          .mobile-menu-buttons button { flex: 1; }
        }

        /* ---------- Backgrounds ---------- */
        .blob { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.5; pointer-events: none; z-index: 0; animation: blobDrift 12s ease-in-out infinite; }
        .blob-a { width: 480px; height: 480px; background: radial-gradient(circle, var(--g-300), transparent 70%); top: -120px; left: -140px; }
        .blob-b { width: 420px; height: 420px; background: radial-gradient(circle, var(--g-500), transparent 70%); top: 60px; right: -160px; animation-delay: 2s; }
        .blob-c { position: absolute; inset: 0; margin: auto; width: 600px; height: 600px; background: radial-gradient(circle, var(--g-400), transparent 70%); filter: blur(90px); opacity: 0.35; animation: blobDrift 14s ease-in-out infinite; }
        .noise-overlay {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.035; mix-blend-mode: multiply; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .glass-card {
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 20px 60px rgba(5,46,28,0.12), inset 0 1px 0 rgba(255,255,255,0.8);
        }

        /* ---------- Hero ---------- */
        .hero-badge { animation: slideInDown 0.7s ease 0.1s both; text-align: center; margin-bottom: 24px; position: relative; z-index: 1; }
        .badge {
          display: inline-block; background: var(--g-50); color: var(--g-700); padding: 9px 18px; border-radius: 20px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.02em; border: 1px solid var(--g-100);
        }
        .hero-title {
          font-size: clamp(40px, 6vw, 64px); font-weight: 800; line-height: 1.12; letter-spacing: -0.03em; text-align: center;
          margin-bottom: 24px; color: var(--ink); position: relative; z-index: 1; perspective: 400px;
        }
        .word-reveal { display: inline-block; opacity: 0; animation: wordIn 0.7s cubic-bezier(0.2,0.8,0.2,1) forwards; }
        .hero-description {
          font-size: 18px; color: var(--gray); line-height: 1.65; max-width: 600px; margin: 0 auto 32px; text-align: center;
          animation: slideInDown 0.8s ease 0.5s both; position: relative; z-index: 1;
        }
        .trust-line { font-size: 13px; color: var(--gray-light); text-align: center; margin-bottom: 80px; animation: slideInDown 0.8s ease 0.6s both; position: relative; z-index: 1; }

        .console-wrap { position: relative; max-width: 760px; margin: 0 auto; z-index: 1; }
        .console { border-radius: 20px; overflow: hidden; animation: fadeInUp 0.9s ease 0.3s both; }
        .console-top { display: flex; align-items: center; gap: 14px; padding: 16px 22px; border-bottom: 1px solid rgba(6,95,70,0.08); }
        .console-dots { display: flex; gap: 6px; }
        .console-dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--g-300); }
        .console-title { font-size: 13px; font-weight: 700; color: var(--ink); flex: 1; }
        .console-timer { font-size: 13px; font-weight: 700; color: var(--g-600); display: flex; align-items: center; gap: 5px; }
        .console-body { padding: 26px 26px 24px; }
        .console-question p { font-size: 17px; font-weight: 600; color: var(--ink); line-height: 1.5; }

        .waveform { display: flex; align-items: center; gap: 3px; height: 46px; margin: 20px 0; }
        .wave-bar { flex: 1; max-width: 5px; height: var(--h); background: linear-gradient(180deg, var(--g-400), var(--g-600)); border-radius: 3px; animation: waveform 1.1s ease-in-out infinite; }

        .console-transcript { background: var(--g-50); border-left: 3px solid var(--g-500); border-radius: 10px; padding: 14px 16px; margin-bottom: 18px; min-height: 66px; }
        .console-transcript p { font-size: 14px; color: var(--ink); line-height: 1.6; }
        .caret { display: inline-block; width: 2px; height: 14px; background: var(--g-600); margin-left: 2px; animation: blink 0.9s step-end infinite; vertical-align: middle; }

        .thinking-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--gray); font-weight: 500; }
        .thinking-dots { display: inline-flex; gap: 3px; }
        .thinking-dots span { width: 5px; height: 5px; border-radius: 50%; background: var(--g-500); animation: dotBounce 1.2s infinite; }
        .thinking-dots span:nth-child(2) { animation-delay: 0.15s; }
        .thinking-dots span:nth-child(3) { animation-delay: 0.3s; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--g-500); display: inline-block; animation: pulse 2s infinite; }

        .ring-svg { width: 46px; height: 46px; transform: rotate(-90deg); }
        .ring-track { fill: none; stroke: var(--g-100); stroke-width: 7; }
        .ring-fill { fill: none; stroke: var(--g-500); stroke-width: 7; stroke-linecap: round; transition: stroke-dashoffset 1.4s cubic-bezier(0.2,0.8,0.2,1); }

        /* ---------- Logos marquee ---------- */
        .logos-section { padding: 60px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); overflow: hidden; }
        .logos-label { text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--gray-light); margin-bottom: 24px; }
        .marquee { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent); mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent); }
        .marquee-track { display: flex; gap: 48px; width: max-content; animation: marqueeScroll 22s linear infinite; }
        .logo-pill { font-size: 15px; font-weight: 700; color: var(--gray-light); letter-spacing: -0.01em; white-space: nowrap; }

        /* ---------- Bento features ---------- */
        .bento { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 190px; gap: 22px; }
        .feature-card {
          background: white; border: 1px solid var(--line); border-radius: 18px; padding: 28px; display: flex; flex-direction: column; justify-content: flex-end;
          opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.15s ease, border-color 0.2s, box-shadow 0.2s; will-change: transform;
        }
        .feature-card:hover { border-color: var(--g-300); box-shadow: 0 20px 40px rgba(5,46,28,0.1); }
        .feature-lg { grid-column: span 2; grid-row: span 2; }
        .feature-md { grid-column: span 2; }
        .feature-sm { grid-column: span 2; }
        .feature-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--g-500), var(--g-700)); color: white; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 6px 16px rgba(16,185,129,0.3); }
        .feature-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--ink); }
        .feature-description { font-size: 14px; color: var(--gray); line-height: 1.6; }
        @media (max-width: 900px) {
          .bento { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 180px; }
          .feature-lg { grid-column: span 2; grid-row: span 1; }
          .feature-md, .feature-sm { grid-column: span 1; }
        }
        @media (max-width: 560px) {
          .bento { grid-template-columns: 1fr; }
          .feature-lg, .feature-md, .feature-sm { grid-column: span 1; }
        }

        /* ---------- Timeline ---------- */
        .timeline { position: relative; display: flex; flex-direction: column; gap: 48px; max-width: 780px; margin: 0 auto; }
        .timeline-line { position: absolute; left: 27px; top: 10px; bottom: 10px; width: 2px; background: linear-gradient(180deg, var(--g-500), var(--g-100)); transform-origin: top; }
        .timeline-item { display: flex; gap: 24px; align-items: flex-start; }
        .timeline-node {
          width: 56px; height: 56px; min-width: 56px; border-radius: 16px; background: white; border: 1px solid var(--g-100);
          display: flex; align-items: center; justify-content: center; color: var(--g-600); position: relative; z-index: 1;
        }
        .timeline-card { background: white; border: 1px solid var(--line); border-radius: 16px; padding: 26px 28px; flex: 1; }
        .timeline-item:hover .timeline-card { box-shadow: 0 16px 36px rgba(5,46,28,0.1); transform: translateY(-3px); }
        .step-label { font-size: 12px; font-weight: 800; color: var(--g-500); letter-spacing: 0.08em; margin-bottom: 10px; }
        .card-title { font-size: 19px; font-weight: 700; margin-bottom: 10px; color: var(--ink); }
        .card-description { font-size: 15px; color: var(--gray); line-height: 1.6; }

        /* ---------- Capabilities ---------- */
        .capabilities-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 24px; }
        .capability-card { perspective: 1200px; }
        .capability-card-inner {
          position: relative;
          width: 100%;
          min-height: 280px;
          transform-style: preserve-3d;
          transition: transform 1.45s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        .capabilities-grid > .capability-card:nth-child(1) { grid-column: 1 / span 2; }
        .capabilities-grid > .capability-card:nth-child(2) { grid-column: 3 / span 2; }
        .capabilities-grid > .capability-card:nth-child(3) { grid-column: 5 / span 2; }
        .capabilities-grid > .capability-card:nth-child(4) { grid-column: 2 / span 2; }
        .capabilities-grid > .capability-card:nth-child(5) { grid-column: 4 / span 2; }
        .capability-card:hover .capability-card-inner {
          transform: rotateY(180deg);
        }
        .capability-card:hover { transform: translateY(-3px); }
        .capability-card-face {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 28px 24px 24px;
          text-align: center;
          backface-visibility: hidden;
          border: 1px solid rgba(16,185,129,0.12);
        }
        .capability-card-front {
          background: white;
          box-shadow: 0 24px 70px rgba(16,185,129,0.08);
        }
        .capability-card-media {
          width: 100%;
          height: 68%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .capability-card-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
        }
        .capability-card-back {
          background: linear-gradient(180deg, var(--g-600), var(--g-500));
          color: white;
          transform: rotateY(180deg);
          box-shadow: 0 30px 90px rgba(16,185,129,0.18);
        }
        .capability-card-icon {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          margin-bottom: 20px;
          background: var(--g-50);
          color: var(--g-600);
          transition: background 0.35s ease, color 0.35s ease, box-shadow 0.35s ease;
        }
        .capability-card-icon-back { background: rgba(255,255,255,0.16); color: white; }
        .capability-card-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 8px;
          line-height: 1.2;
        }
        .capability-card-title-back { color: white; }
        .capability-card-description {
          font-size: 14px;
          color: var(--gray);
          line-height: 1.7;
          max-width: 290px;
        }
        .capability-card-description-back { color: rgba(255,255,255,0.92); margin-top: 10px; }
        .capability-card:hover .capability-card-front {
          box-shadow: 0 30px 90px rgba(16,185,129,0.15);
        }
        .capability-card:hover .capability-card-back {
          box-shadow: 0 30px 90px rgba(16,185,129,0.24);
        }
        .reveal-visible .capability-card { opacity: 1; transform: translateY(0); }
        .capability-card { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; }
        .why-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
        @media (max-width: 1100px) { .capabilities-grid { grid-template-columns: repeat(2, minmax(240px, 1fr)); } }
        @media (max-width: 720px) { .capabilities-grid { grid-template-columns: 1fr; } }

        /* ---------- Showcase ---------- */
        .showcase { display: grid; grid-template-columns: 1.5fr 1fr; gap: 28px; margin-top: 60px; align-items: start; }
        .showcase-main { border-radius: 20px; overflow: hidden; }
        .showcase-sidebar { border-radius: 20px; padding: 26px; }
        .meter-row { margin-bottom: 20px; }
        .meter-label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
        .meter-track { height: 8px; background: var(--g-50); border-radius: 5px; overflow: hidden; }
        .meter-fill { height: 100%; background: linear-gradient(90deg, var(--g-400), var(--g-600)); border-radius: 5px; transition: width 1.2s cubic-bezier(0.2,0.8,0.2,1); }
        .confidence-badge { margin-top: 8px; background: var(--g-50); color: var(--g-700); border-radius: 10px; padding: 12px 14px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        @media (max-width: 820px) { .showcase { grid-template-columns: 1fr; } }

        /* ---------- Stats ---------- */
        .stats-section { padding: 80px 40px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; }
        .stat-card { text-align: center; padding: 32px 20px; border-radius: 16px; background: var(--g-50); }
        .stat-number { font-size: 38px; font-weight: 800; background: linear-gradient(120deg, var(--g-600), var(--g-400)); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 8px; }
        .stat-label { font-size: 14px; color: var(--gray); font-weight: 500; }

        /* ---------- Testimonials ---------- */
        .testimonial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
        .testimonial-card { background: white; border: 1px solid var(--line); border-radius: 18px; padding: 28px; opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease, box-shadow 0.2s; }
        .testimonial-card:hover { box-shadow: 0 18px 40px rgba(5,46,28,0.08); }
        .stars { display: flex; gap: 3px; margin-bottom: 14px; }
        .testimonial-quote { font-size: 15px; color: var(--ink); line-height: 1.65; margin-bottom: 20px; }
        .testimonial-person { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--g-400), var(--g-700)); color: white; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .testimonial-name { font-size: 14px; font-weight: 700; color: var(--ink); }
        .testimonial-role { font-size: 13px; color: var(--gray-light); }

        /* ---------- FAQ ---------- */
        .faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
        .faq-item { background: white; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; transition: border-color 0.2s; }
        .faq-item.faq-open { border-color: var(--g-300); }
        .faq-question { width: 100%; text-align: left; background: none; border: none; padding: 20px 24px; font-size: 15px; font-weight: 600; color: var(--ink); cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .faq-chevron { transition: transform 0.3s ease; color: var(--g-500); }
        .faq-open .faq-chevron { transform: rotate(180deg); }
        .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; padding: 0 24px; }
        .faq-open .faq-answer { max-height: 200px; padding: 0 24px 20px; }
        .faq-answer p { font-size: 14px; color: var(--gray); line-height: 1.6; }

        /* ---------- CTA ---------- */
        .cta-section {
          position: relative; overflow: hidden; text-align: center; padding: 110px 40px; margin: 60px auto; max-width: 1320px;
          border-radius: 32px; background: linear-gradient(160deg, var(--g-950), var(--g-800));
        }
        .cta-title { position: relative; z-index: 1; font-size: clamp(30px, 4vw, 44px); font-weight: 800; margin-bottom: 18px; color: white; letter-spacing: -0.02em; }
        .cta-description { position: relative; z-index: 1; font-size: 16px; color: rgba(255,255,255,0.72); max-width: 560px; margin: 0 auto 34px; line-height: 1.6; }

        /* ---------- Footer ---------- */
        .footer { background: white; border-top: 1px solid var(--line); padding: 64px 40px 24px; }
        .footer-content { max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 48px; margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid var(--line); }
        .footer-brand { text-align: left; }
        .footer-logo { display: flex; align-items: center; font-size: 18px; font-weight: 800; margin-bottom: 12px; color: var(--ink); }
        .footer-tagline { font-size: 14px; color: var(--gray); }
        .footer-col-title { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--gray-light); margin-bottom: 14px; }
        .footer-col { display: flex; flex-direction: column; gap: 10px; }
        .footer-link { font-size: 14px; color: var(--gray); text-decoration: none; transition: color 0.2s; width: fit-content; }
        .footer-link:hover { color: var(--g-600); }
        .footer-bottom { max-width: 1320px; margin: 0 auto; text-align: center; font-size: 13px; color: var(--gray-light); }
        @media (max-width: 700px) { .footer-content { grid-template-columns: 1fr; } }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { width: '100%', backgroundColor: '#ffffff', color: '#0a1f17', overflowX: 'hidden' },
  navContent: { maxWidth: '1400px', margin: '0 auto', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', minWidth: '150px' },
  logoText: { color: '#0a1f17' },
  navLinks: { display: 'flex', gap: '40px', flex: 1, marginLeft: '60px' },
  navButtons: { display: 'flex', gap: '14px', alignItems: 'center' },
  hero: {
    marginTop: '80px', padding: '110px 40px 60px', textAlign: 'center', position: 'relative', maxWidth: '1400px',
    margin: '80px auto 0', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    alignItems: 'center', overflow: 'hidden',
  },
  heroCTAContainer: { display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '20px', position: 'relative', zIndex: 1, flexWrap: 'wrap' },
};