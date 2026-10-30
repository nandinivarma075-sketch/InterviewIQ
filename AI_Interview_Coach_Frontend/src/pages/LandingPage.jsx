import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, ArrowRight, FileText, Briefcase, Brain,
  Mic, MessageSquare, BarChart3, ChevronRight,
  Play, CheckCircle2, TrendingUp, Target, Users,
  Star, Cpu, ScanLine, Volume2, Layers, Award,
  BookOpen, MessageCircle, Repeat2,
} from 'lucide-react';
import './LandingPage.css';

/* ── DATA ───────────────────────────────────────────────────── */

const BENEFITS = [
  { icon: FileText,      label: 'Resume-Based Questions' },
  { icon: Mic,           label: 'Voice Interviews'       },
  { icon: Repeat2,       label: 'Adaptive Follow-Ups'    },
  { icon: BarChart3,     label: 'Detailed AI Feedback'   },
];

const WORKFLOW = [
  {
    num: '01',
    icon: FileText,
    title: 'Upload Resume',
    desc: 'Extract your skills, projects, education and experience instantly.',
    color: 'purple',
  },
  {
    num: '02',
    icon: Briefcase,
    title: 'Select Job Role',
    desc: 'Choose your target role to tailor the interview perfectly.',
    color: 'blue',
  },
  {
    num: '03',
    icon: ScanLine,
    title: 'Analyze Resume + Role',
    desc: 'AI understands your profile and the job requirements in depth.',
    color: 'purple',
  },
  {
    num: '04',
    icon: Cpu,
    title: 'Generate Interview',
    desc: 'Create personalized technical questions just for you.',
    color: 'blue',
  },
  {
    num: '05',
    icon: Mic,
    title: 'Live Voice Interview',
    desc: 'Answer questions naturally using your voice — no typing needed.',
    color: 'purple',
  },
  {
    num: '06',
    icon: Repeat2,
    title: 'Adaptive Follow-Ups',
    desc: 'Questions get deeper or simpler based on your previous answers.',
    color: 'blue',
  },
  {
    num: '07',
    icon: Brain,
    title: 'AI Evaluation',
    desc: 'Evaluate technical knowledge, problem solving and communication.',
    color: 'purple',
  },
  {
    num: '08',
    icon: BarChart3,
    title: 'Final Report',
    desc: 'Receive comprehensive interview feedback and improvement tips.',
    color: 'blue',
  },
];

const FEATURES = [
  {
    icon: FileText,
    title: 'Resume Analysis',
    desc: 'Extract relevant skills, projects, education and experience from your resume.',
    color: 'purple',
  },
  {
    icon: Briefcase,
    title: 'Job Role Selection',
    desc: 'Customize your interview according to the role you want to pursue.',
    color: 'blue',
  },
  {
    icon: Brain,
    title: 'Personalized AI Questions',
    desc: 'Generate interview questions based on your resume and selected role.',
    color: 'purple',
  },
  {
    icon: Mic,
    title: 'Live Voice Interview',
    desc: 'Practice answering questions naturally through a voice-based interview.',
    color: 'blue',
  },
  {
    icon: Repeat2,
    title: 'Adaptive Follow-Ups',
    desc: 'Questions dynamically adapt based on your previous answers.',
    color: 'purple',
  },
  {
    icon: BarChart3,
    title: 'AI Performance Report',
    desc: 'Get detailed feedback after completing your interview.',
    color: 'blue',
  },
];

const EVAL_AREAS = [
  {
    icon: Cpu,
    title: 'Technical Knowledge',
    desc: 'Correctness, relevance, completeness and depth of answers.',
    score: 88,
    color: 'purple',
  },
  {
    icon: Target,
    title: 'Problem Solving',
    desc: 'Reasoning, approach and explanation of solutions.',
    score: 82,
    color: 'blue',
  },
  {
    icon: MessageCircle,
    title: 'Communication',
    desc: 'Speech clarity, pace, pauses, filler words and answer structure.',
    score: 91,
    color: 'success',
  },
  {
    icon: BookOpen,
    title: 'Resume Understanding',
    desc: 'Ability to explain projects, skills and technical decisions.',
    score: 79,
    color: 'warning',
  },
  {
    icon: Repeat2,
    title: 'Interview Adaptability',
    desc: 'Ability to handle follow-up questions based on previous responses.',
    score: 85,
    color: 'purple',
  },
];

/* ── HERO VISUAL (CSS-only mock UI) ───────────────────────── */
function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      {/* Floating glow blobs */}
      <div className="hero-visual__blob hero-visual__blob--purple" />
      <div className="hero-visual__blob hero-visual__blob--blue"   />

      {/* Main card */}
      <div className="hero-card">
        {/* Header */}
        <div className="hero-card__header">
          <div className="hero-card__ai-icon">
            <Zap size={16} fill="white" color="white" />
          </div>
          <div>
            <div className="hero-card__ai-name">AI Interview Coach</div>
            <div className="hero-card__ai-sub">
              <span className="hero-card__dot" />
              Active session
            </div>
          </div>
          <div className="hero-card__timer">04:32</div>
        </div>

        {/* Question */}
        <div className="hero-card__question">
          <div className="hero-card__q-label">
            <Brain size={12} /> Technical Question 3 / 8
          </div>
          <p className="hero-card__q-text">
            "Explain how React's reconciliation algorithm decides what to re-render. What role do keys play?"
          </p>
        </div>

        {/* Waveform */}
        <div className="hero-card__waveform">
          {[0.4,0.7,1,0.8,0.55,0.9,0.65,1,0.5,0.75,0.85,0.6,0.95,0.45,0.8].map((h, i) => (
            <span
              key={i}
              className="hero-card__wave-bar"
              style={{
                height: `${h * 32}px`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
          <span className="hero-card__recording-label"><Mic size={11} /> Recording…</span>
        </div>

        {/* Eval indicators */}
        <div className="hero-card__evals">
          {[
            { label: 'Technical',    score: 88, c: 'var(--purple-500)' },
            { label: 'Communication', score: 91, c: 'var(--blue-500)' },
            { label: 'Problem Solving', score: 82, c: 'var(--success-500)' },
          ].map(({ label, score, c }) => (
            <div key={label} className="hero-card__eval-row">
              <span className="hero-card__eval-label">{label}</span>
              <div className="hero-card__eval-bar">
                <div
                  className="hero-card__eval-fill"
                  style={{ width: `${score}%`, background: c }}
                />
              </div>
              <span className="hero-card__eval-score" style={{ color: c }}>{score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating badges */}
      <div className="hero-badge hero-badge--tl">
        <CheckCircle2 size={14} color="var(--success-500)" />
        <span>Resume analyzed</span>
      </div>
      <div className="hero-badge hero-badge--br">
        <Star size={14} color="var(--warning-500)" />
        <span>Score: <strong>88/100</strong></span>
      </div>
    </div>
  );
}

/* ── MAIN COMPONENT ────────────────────────────────────────── */
export default function LandingPage() {
  const navRef        = useRef(null);
  const heroTextRef   = useRef(null);
  const heroVisualRef = useRef(null);
  const benefitsRef   = useRef(null);
  const workflowRef   = useRef(null);
  const featuresRef   = useRef(null);
  const evalRef       = useRef(null);
  const ctaRef        = useRef(null);

  useEffect(() => {
    let gsap, ScrollTrigger;
    (async () => {
      try {
        const gsapMod  = await import('gsap');
        const stMod    = await import('gsap/ScrollTrigger');
        gsap         = gsapMod.gsap;
        ScrollTrigger = stMod.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);

        // ── Navbar slide-down ──
        gsap.fromTo(navRef.current,
          { y: -60, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }
        );

        // ── Hero text stagger ──
        gsap.fromTo(heroTextRef.current?.querySelectorAll('.hero-anim'),
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.3 }
        );

        // ── Hero visual ──
        gsap.fromTo(heroVisualRef.current,
          { x: 60, opacity: 0 },
          { x: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.5 }
        );

        // ── Benefits strip ──
        gsap.fromTo(benefitsRef.current?.querySelectorAll('.benefit-card'),
          { y: 30, opacity: 0 },
          { scrollTrigger: { trigger: benefitsRef.current, start: 'top 85%' }, y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
        );

        // ── Workflow cards ──
        gsap.fromTo(workflowRef.current?.querySelectorAll('.workflow-card'),
          { y: 50, opacity: 0 },
          { scrollTrigger: { trigger: workflowRef.current, start: 'top 80%' }, y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
        );

        // ── Feature cards ──
        gsap.fromTo(featuresRef.current?.querySelectorAll('.feature-card'),
          { y: 40, opacity: 0 },
          { scrollTrigger: { trigger: featuresRef.current, start: 'top 80%' }, y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
        );

        // ── Eval cards ──
        gsap.fromTo(evalRef.current?.querySelectorAll('.eval-card'),
          { x: -30, opacity: 0 },
          { scrollTrigger: { trigger: evalRef.current, start: 'top 80%' }, x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
        );

        // ── CTA ──
        gsap.fromTo(ctaRef.current,
          { y: 40, opacity: 0 },
          { scrollTrigger: { trigger: ctaRef.current, start: 'top 85%' }, y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );
      } catch (e) {
        // GSAP unavailable — degrade gracefully
      }
    })();

    return () => {
      try {
        if (ScrollTrigger) ScrollTrigger.getAll().forEach((t) => t.kill());
      } catch (_) {}
    };
  }, []);

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing" id="landing-page">

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav ref={navRef} className="lnav" role="navigation" aria-label="Main navigation">
        <div className="lnav__inner container">
          {/* Logo */}
          <Link to="/" className="lnav__logo" id="nav-logo" aria-label="AI Interview Coach home">
            <div className="lnav__logo-icon">
              <Zap size={18} fill="white" color="white" />
            </div>
            <div className="lnav__logo-text">
              <span className="lnav__logo-name">AI Interview</span>
              <span className="lnav__logo-accent"> Coach</span>
            </div>
          </Link>

          {/* Center links */}
          <div className="lnav__links" role="list">
            <a href="#features"    onClick={scrollTo('lp-features')}    className="lnav__link" id="nav-features">Features</a>
            <a href="#how-it-works" onClick={scrollTo('lp-workflow')}   className="lnav__link" id="nav-how-it-works">How It Works</a>
            <a href="#evaluation"  onClick={scrollTo('lp-evaluation')}  className="lnav__link" id="nav-evaluation">Evaluation</a>
          </div>

          {/* Actions */}
          <div className="lnav__actions">
            <Link to="/login"    className="btn btn-secondary btn-sm" id="nav-login-btn">Log In</Link>
            <Link to="/register" className="btn btn-primary   btn-sm" id="nav-register-btn">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger (CSS only for now) */}
          <button className="lnav__mobile-toggle" aria-label="Open menu" id="nav-mobile-menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="lp-hero" aria-labelledby="hero-heading">
        <div className="lp-hero__bg-glow" aria-hidden="true" />
        <div className="lp-hero__grid-overlay" aria-hidden="true" />

        <div className="container lp-hero__inner">
          {/* Left — text */}
          <div className="lp-hero__text" ref={heroTextRef}>
            <div className="hero-anim lp-hero__badge">
              <span className="badge badge-purple">
                <Zap size={11} fill="var(--purple-600)" />
                AI-Powered Interview Platform
              </span>
            </div>

            <h1 id="hero-heading" className="hero-anim lp-hero__title">
              Practice Smarter.<br />
              <span className="gradient-text">Interview Better.</span>
            </h1>

            <p className="hero-anim lp-hero__subtitle">
              Personalized AI mock interviews built around your resume and target job role.
              Practice through voice, handle adaptive follow-up questions, and receive
              detailed AI-powered feedback.
            </p>

            <div className="hero-anim lp-hero__cta">
              <Link to="/register" className="btn btn-primary btn-xl" id="hero-start-btn">
                Start Your Interview <ArrowRight size={18} />
              </Link>
              <a
                href="#lp-workflow"
                onClick={scrollTo('lp-workflow')}
                className="btn btn-secondary btn-lg lp-hero__cta-secondary"
                id="hero-see-how"
              >
                <Play size={15} className="lp-hero__play-icon" />
                See How It Works
              </a>
            </div>

            <div className="hero-anim lp-hero__trust">
              <div className="lp-hero__trust-avatars">
                {['#8B5CF6','#3B82F6','#10B981','#F59E0B'].map((c, i) => (
                  <div key={i} className="lp-hero__trust-avatar" style={{ background: c, marginLeft: i ? -10 : 0 }} />
                ))}
              </div>
              <p className="lp-hero__trust-text">
                <strong>2,000+</strong> candidates already practicing
              </p>
            </div>
          </div>

          {/* Right — hero visual */}
          <div className="lp-hero__visual-wrap" ref={heroVisualRef}>
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ── BENEFITS STRIP ──────────────────────────────────── */}
      <section className="lp-benefits" ref={benefitsRef} aria-label="Key benefits">
        <div className="container lp-benefits__inner">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <div key={label} className="benefit-card">
              <div className="benefit-card__icon">
                <Icon size={20} />
              </div>
              <span className="benefit-card__label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="lp-section lp-workflow" id="lp-workflow" aria-labelledby="workflow-heading">
        <div className="container">
          <div className="lp-section__header">
            <div className="lp-section__eyebrow">How It Works</div>
            <h2 id="workflow-heading" className="lp-section__title">
              From Resume to <span className="gradient-text">Interview-Ready</span>
            </h2>
            <p className="lp-section__sub">
              Eight structured steps that take you from a blank resume to a complete AI-driven performance report.
            </p>
          </div>

          <div className="workflow-grid" ref={workflowRef}>
            {WORKFLOW.map(({ num, icon: Icon, title, desc, color }, i) => (
              <div key={num} className={`workflow-card workflow-card--${color}`}>
                <div className="workflow-card__num">{num}</div>
                <div className={`workflow-card__icon workflow-card__icon--${color}`}>
                  <Icon size={22} />
                </div>
                <h3 className="workflow-card__title">{title}</h3>
                <p className="workflow-card__desc">{desc}</p>
                {i < WORKFLOW.length - 1 && (
                  <div className="workflow-card__connector" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEY FEATURES ─────────────────────────────────────── */}
      <section
        className="lp-section lp-features"
        id="lp-features"
        aria-labelledby="features-heading"
      >
        <div className="container">
          <div className="lp-section__header">
            <div className="lp-section__eyebrow">Features</div>
            <h2 id="features-heading" className="lp-section__title">
              Everything You Need to <span className="gradient-text">Practice Better</span>
            </h2>
            <p className="lp-section__sub">
              A complete toolkit designed specifically for job seekers who want to interview with confidence.
            </p>
          </div>

          <div className="features-grid" ref={featuresRef}>
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="feature-card">
                <div className={`feature-card__icon feature-card__icon--${color}`}>
                  <Icon size={22} />
                </div>
                <h3 className="feature-card__title">{title}</h3>
                <p className="feature-card__desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI EVALUATION ────────────────────────────────────── */}
      <section
        className="lp-section lp-evaluation"
        id="lp-evaluation"
        aria-labelledby="eval-heading"
      >
        <div className="container lp-evaluation__inner">
          {/* Left — text */}
          <div className="lp-evaluation__text">
            <div className="lp-section__eyebrow">AI Evaluation</div>
            <h2 id="eval-heading" className="lp-section__title lp-section__title--left">
              Know What <span className="gradient-text">You're Good At</span>
            </h2>
            <p className="lp-section__sub lp-section__sub--left">
              After each interview, our AI generates a detailed evaluation across five key dimensions
              so you know exactly where to focus.
            </p>
            <div className="lp-evaluation__badges">
              <span className="badge badge-purple"><CheckCircle2 size={11} /> Instant scoring</span>
              <span className="badge badge-blue"><TrendingUp size={11} /> Progress tracking</span>
              <span className="badge badge-success"><Award size={11} /> Actionable tips</span>
            </div>
            <Link to="/register" className="btn btn-primary" id="eval-cta-btn" style={{ marginTop: 'var(--space-6)' }}>
              Get Your Evaluation <ArrowRight size={15} />
            </Link>
          </div>

          {/* Right — cards */}
          <div className="eval-cards" ref={evalRef}>
            {EVAL_AREAS.map(({ icon: Icon, title, desc, score, color }) => (
              <div key={title} className="eval-card">
                <div className="eval-card__left">
                  <div className={`eval-card__icon eval-card__icon--${color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="eval-card__info">
                    <div className="eval-card__title">{title}</div>
                    <div className="eval-card__desc">{desc}</div>
                  </div>
                </div>
                <div className="eval-card__right">
                  <div className="eval-card__score-wrap">
                    <span
                      className="eval-card__score"
                      style={{
                        color: score >= 90 ? 'var(--success-500)'
                          : score >= 80 ? 'var(--blue-500)'
                          : 'var(--warning-500)',
                      }}
                    >
                      {score}
                    </span>
                    <span className="eval-card__score-max">/100</span>
                  </div>
                  <div className="eval-card__bar">
                    <div
                      className="eval-card__bar-fill"
                      style={{
                        width: `${score}%`,
                        background: score >= 90 ? 'var(--gradient-score-excellent)'
                          : score >= 80 ? 'var(--gradient-score-good)'
                          : 'var(--gradient-score-fair)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="lp-cta" aria-labelledby="cta-heading" ref={ctaRef}>
        <div className="lp-cta__glow" aria-hidden="true" />
        <div className="container lp-cta__inner">
          <div className="lp-cta__icon" aria-hidden="true">
            <Zap size={28} fill="white" color="white" />
          </div>
          <h2 id="cta-heading" className="lp-cta__title">
            Turn Interview Practice Into<br />
            <span className="lp-cta__title-accent">Interview Confidence.</span>
          </h2>
          <p className="lp-cta__sub">
            Practice with questions that are relevant to you, adapt to every answer,
            and understand exactly where you can improve.
          </p>
          <Link to="/register" className="btn btn-xl lp-cta__btn" id="final-cta-btn">
            Start Practicing <ArrowRight size={18} />
          </Link>
          <p className="lp-cta__note">Free to start · No credit card required</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="lp-footer" role="contentinfo">
        <div className="container lp-footer__inner">
          <div className="lp-footer__brand">
            <div className="lp-footer__logo">
              <div className="lp-footer__logo-icon">
                <Zap size={15} fill="white" color="white" />
              </div>
              <span className="lp-footer__logo-name">AI Interview Coach</span>
            </div>
            <p className="lp-footer__tagline">AI-powered personalized interview practice.</p>
          </div>

          <nav className="lp-footer__links" aria-label="Footer navigation">
            <a href="#lp-features"   onClick={scrollTo('lp-features')}   className="lp-footer__link" id="footer-features">Features</a>
            <a href="#lp-workflow"   onClick={scrollTo('lp-workflow')}   className="lp-footer__link" id="footer-workflow">How It Works</a>
            <a href="#lp-evaluation" onClick={scrollTo('lp-evaluation')} className="lp-footer__link" id="footer-evaluation">Evaluation</a>
            <Link to="/login" className="lp-footer__link" id="footer-login">Login</Link>
          </nav>

          <p className="lp-footer__copy">© 2025 AI Interview Coach. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
