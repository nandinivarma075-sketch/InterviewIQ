import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CheckCircle, BarChart3, ArrowRight, RotateCcw,
  MessageSquare, Clock, Zap, Target, TrendingUp,
  AlertCircle, ChevronRight, Eye,
} from 'lucide-react';
import { sessions as sessionsApi, reports as reportsApi } from '../utils/api';
import { getScoreGrade, formatDuration } from '../utils/helpers';
import './PlaceholderPage.css';
import './InterviewCompletedPage.css';

// TOTAL_QUESTIONS is now derived dynamically from the actual session — see resolvedTotal below.

function ScoreMeter({ score, label, color }) {
  return (
    <div className="completed-score-bar">
      <div className="completed-score-bar__header">
        <span>{label}</span>
        <strong style={{ color }}>{score}</strong>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill"
          style={{ width: `${score}%`, background: color, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function ScoreFactor({ icon: Icon, label, value, note, color = 'var(--purple-500)' }) {
  return (
    <div className="score-factor">
      <div className="score-factor__icon" style={{ color }}>
        <Icon size={16} />
      </div>
      <div className="score-factor__body">
        <span className="score-factor__label">{label}</span>
        <span className="score-factor__value">{value}</span>
        {note && <span className="score-factor__note">{note}</span>}
      </div>
    </div>
  );
}

export default function InterviewCompletedPage() {
  const { state } = useLocation();
  const sessionId  = state?.sessionId ?? null;

  const [report,    setReport]    = useState(null);
  const [breakdown, setBreakdown] = useState(state?.breakdown ?? null);
  const [loading,   setLoading]   = useState(!!sessionId);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    reportsApi.getSession(sessionId)
      .then((data) => setReport(data))
      .catch((e)  => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const session  = report?.session;
  const scores   = session?.scores;
  const overall  = scores?.overall;
  const g        = overall != null ? getScoreGrade(overall) : null;
  const durationMin = session?.durationSec ? Math.round(session.durationSec / 60) : null;

  // ── Authoritative attempt summary ────────────────────────────────────────
  // Priority: report API (evidenceBased) > navigation state breakdown > legacy fallback
  const attemptSummary = report?.attemptSummary ?? state?.attemptSummary ?? null;
  const questionRecords = report?.questions ?? [];

  // ── Dynamic total — NEVER hardcode 4 ─────────────────────────────────────
  // Read from the most authoritative source available:
  //   1. attemptSummary.totalConfigured (from backend end-session response / report API)
  //   2. session.questionsTotal (from session record)
  //   3. questionRecords.length (number of per-question rows we actually received)
  //   4. Absolute fallback: 4 (only if the session has no data at all)
  const resolvedTotal =
    attemptSummary?.totalConfigured ??
    session?.questionsTotal ??
    (questionRecords.length > 0 ? questionRecords.length : null) ??
    4;

  // For the coverage display: use real per-question records when available
  // fallback to the old heuristic (questionsAnswered filled sequentially)
  const qAnswered  = attemptSummary?.totalGenuinelyAnswered
    ?? breakdown?.questionsAnswered
    ?? session?.questionsAsked
    ?? null;
  const qRemaining = qAnswered != null ? Math.max(0, resolvedTotal - qAnswered) : null;

  // Accuracy tier
  const accuracyScore = breakdown?.accuracyScore ?? (scores?.technical ?? 85);
  const accuracyTier =
    accuracyScore >= 90 ? { label: 'Exceptional Accuracy', color: 'var(--success-500)', tip: 'Outstanding technical precision and concept mastery.' } :
    accuracyScore >= 80 ? { label: 'High Accuracy',        color: 'var(--blue-500)',    tip: 'Solid technical understanding and clear concepts.' } :
    accuracyScore >= 70 ? { label: 'Good Accuracy',        color: 'var(--warning-500)', tip: 'Covered major points with minor omissions.' } :
                          { label: 'Needs Improvement',    color: 'var(--error-500)',   tip: 'Review core concepts and technical definitions.' };

  return (
    <div className="placeholder-page completed-page" id="interview-completed-page">
      {/* ── Header ── */}
      <div className="completed-page__hero">
        <div className="completed-page__icon-ring">
          <CheckCircle size={44} strokeWidth={1.5} />
        </div>
        <h2 className="completed-page__title">Interview Complete! 🎉</h2>
        <p className="completed-page__sub">
          {session?.role
            ? `You completed the ${session.role} interview.`
            : 'Your interview is complete.'}
          {' '}Your AI-powered performance report is ready.
        </p>
      </div>

      {/* ── Overall score ring ── */}
      {!loading && overall != null && (
        <div className="completed-page__score-section">
          <div className="completed-page__score-ring-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140"
              aria-label={`Overall score: ${overall} out of 100`}>
              <circle cx="70" cy="70" r="58" fill="none"
                stroke="var(--navy-100)" strokeWidth="10" />
              <circle cx="70" cy="70" r="58" fill="none"
                stroke="url(#cGrad)" strokeWidth="10"
                strokeDasharray={`${(overall / 100) * 364.4} 364.4`}
                strokeLinecap="round" transform="rotate(-90 70 70)" />
              <defs>
                <linearGradient id="cGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="var(--purple-600)" />
                  <stop offset="100%" stopColor="var(--blue-400)"   />
                </linearGradient>
              </defs>
            </svg>
            <div className="completed-page__score-inner">
              <span className="completed-page__score-num" style={{ color: g.color }}>{overall}</span>
              <span className="completed-page__score-denom">/ 100</span>
              <span className="completed-page__score-grade" style={{ color: g.color }}>{g.label}</span>
            </div>
          </div>

          {/* Category score bars */}
          {scores && (
            <div className="completed-page__score-bars">
              {scores.technical      != null && <ScoreMeter score={scores.technical}      label="Technical"        color="var(--purple-500)" />}
              {scores.problemSolving != null && <ScoreMeter score={scores.problemSolving} label="Problem Solving"  color="var(--blue-500)"   />}
              {scores.communication  != null && <ScoreMeter score={scores.communication}  label="Communication"   color="var(--success-500)"/>}
              {scores.adaptability   != null && <ScoreMeter score={scores.adaptability}   label="Adaptability"    color="var(--warning-500)"/>}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="completed-page__loading">
          <div className="skeleton" style={{ height: 140, width: 140, borderRadius: '50%' }} />
          <div className="skeleton" style={{ height: 20, width: 240 }} />
          <div className="skeleton" style={{ height: 20, width: 200 }} />
        </div>
      )}

      {/* ── Questions coverage ── */}
      {(qAnswered != null || questionRecords.length > 0) && (
        <div className="card completed-page__coverage">
          <div className="card-body">
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--navy-700)' }}>
              📋 Question Coverage ({resolvedTotal} {resolvedTotal === 1 ? 'question' : 'questions'})
            </h3>
            <div className="completed-page__q-grid">
              {Array.from({ length: resolvedTotal }, (_, i) => {
                // Use per-question record when available (evidence-based)
                const rec = questionRecords[i];
                const recState = rec?.state;
                const isAnswered = recState === 'ANSWERED' || recState === 'PARTIALLY_ANSWERED' || recState === 'EVALUATED';
                const isSkipped  = recState === 'SKIPPED';
                const isPartial  = recState === 'PARTIALLY_ANSWERED';
                // Fallback to sequential heuristic for legacy sessions
                const legacyAnswered = !rec && qAnswered != null && i < qAnswered;
                const showDone    = isAnswered || legacyAnswered;
                const showSkip    = isSkipped;
                const showPartial = isPartial;
                return (
                  <div key={i} title={rec ? `${rec.state.replace(/_/g,' ')}${rec.wordCount ? ` · ${rec.wordCount} words` : ''}` : ''}
                    className={[
                      'completed-page__q-bubble',
                      showDone && !showPartial ? 'completed-page__q-bubble--done'    : '',
                      showPartial              ? 'completed-page__q-bubble--partial' : '',
                      showSkip                 ? 'completed-page__q-bubble--skip'   : '',
                      !showDone && !showSkip && !showPartial ? 'completed-page__q-bubble--miss' : '',
                    ].filter(Boolean).join(' ')}>
                    <span>Q{i + 1}</span>
                    {showDone && !showPartial ? <CheckCircle size={12} /> :
                     showPartial             ? <span style={{ fontSize: 9 }}>½</span> :
                     showSkip               ? <span style={{ fontSize: 9 }}>⤵</span> :
                                              <span style={{ fontSize: 9, opacity: 0.5 }}>—</span>}
                  </div>
                );
              })}
            </div>

            {/* Attempt stats */}
            {attemptSummary ? (
              <div style={{ display:'flex', gap:'var(--space-4)', flexWrap:'wrap', marginTop:'var(--space-3)' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-500)' }}>
                  <strong style={{ color:'var(--success-600)' }}>{attemptSummary.totalGenuinelyAnswered}</strong> answered
                  {attemptSummary.totalSkipped > 0 && <> · <strong style={{ color:'var(--navy-400)' }}>{attemptSummary.totalSkipped}</strong> skipped</>}
                  {attemptSummary.totalNotAttempted > 0 && <> · <strong style={{ color:'var(--error-500)' }}>{attemptSummary.totalNotAttempted}</strong> not attempted</>}
                  {attemptSummary.totalPartiallyAnswered > 0 && <> · <strong style={{ color:'var(--warning-500)' }}>{attemptSummary.totalPartiallyAnswered}</strong> partial</>}
                  {' '}of <strong>{resolvedTotal}</strong> total.
                  {qRemaining > 0 && (
                    <span style={{ color: 'var(--warning-600)', marginLeft: 4 }}>
                      (Practice again to answer all {resolvedTotal} questions!)
                    </span>
                  )}
                  {attemptSummary.completionRate != null && (
                    <span style={{ marginLeft: 8, color: attemptSummary.completionRate >= 75 ? 'var(--success-600)' : 'var(--navy-400)', fontWeight: 600 }}>
                      · {attemptSummary.completionRate}% completion
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-500)', marginTop: 'var(--space-3)' }}>
                You answered <strong>{qAnswered}</strong> of <strong>{resolvedTotal}</strong> questions.
                {qRemaining > 0 && (
                  <span style={{ color: 'var(--warning-600)', marginLeft: 4 }}>
                    ({qRemaining} question{qRemaining > 1 ? 's' : ''} unanswered — practice again to improve your score!)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Scoring factors ── */}
      {breakdown && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--navy-700)' }}>
              🔍 How Your Score Was Calculated
            </h3>
          </div>
          <div className="card-body completed-page__factors">
            <ScoreFactor
              icon={Zap}
              label="Answer Accuracy & Correctness"
              value={`${accuracyScore}% Technical Accuracy`}
              note={`${accuracyTier.label}: ${accuracyTier.tip}`}
              color={accuracyTier.color}
            />
            <ScoreFactor
              icon={Target}
              label="Question Coverage"
              value={`${breakdown.questionsAnswered} / ${breakdown.totalQuestions} answered`}
              note={breakdown.completionBonus > 0 ? `+${breakdown.completionBonus} completion bonus` : 'Complete all questions for a bonus'}
              color={breakdown.completionBonus > 0 ? 'var(--success-500)' : 'var(--navy-400)'}
            />
            <ScoreFactor
              icon={Clock}
              label="Session Duration"
              value={durationMin != null ? (durationMin > 0 ? `${durationMin} min` : 'Under 1 min') : '—'}
              note={`Duration factor: ${Math.round(breakdown.durFactor * 100)}% — aim for 5+ min per question`}
              color={breakdown.durFactor > 0.95 ? 'var(--success-500)' : 'var(--warning-500)'}
            />
            {breakdown.cvBonus > 0 && (
              <ScoreFactor
                icon={Eye}
                label="Camera Analysis"
                value={`+${Math.round(breakdown.cvBonus)} bonus points`}
                note="Based on gaze (facing camera) and posture (upright)"
                color="var(--blue-500)"
              />
            )}
            <ScoreFactor
              icon={Zap}
              label="Difficulty"
              value={breakdown.difficulty}
              note={breakdown.difficulty === 'Hard' ? 'Hard interviews apply a 0.93× multiplier'
                  : breakdown.difficulty === 'Easy' ? 'Easy interviews apply a 1.06× multiplier'
                  : 'Medium — standard scoring'}
              color="var(--purple-500)"
            />
          </div>

          {/* Technical Accuracy & Quality Rubric */}
          <div className="card-body" style={{ borderTop: 'var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--navy-600)', marginBottom: 'var(--space-3)' }}>
              🎯 Technical Accuracy &amp; Rigor Rubric:
            </p>
            <div className="completed-page__scale">
              {[
                { label: '90–100%: Production-Grade', desc: 'All concepts accurate + reasoning/trade-offs', color: 'var(--success-600)' },
                { label: '75–89%: Technically Sound', desc: 'Accurate core concepts, minor omissions', color: 'var(--blue-500)' },
                { label: '50–74%: Partially Correct', desc: 'Basic knowledge, missing essential nuances', color: 'var(--warning-500)' },
                { label: '< 50%: Flawed / Substandard', desc: 'Factual misconceptions or concept gaps', color: 'var(--error-500)' },
              ].map((tier) => (
                <div key={tier.label} className="completed-page__scale-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="completed-page__scale-dot" style={{ background: tier.color }} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: tier.color }}>{tier.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--navy-400)', paddingLeft: 12 }}>{tier.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Overall Executive Feedback ── */}
      {session?.aiSummary && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} style={{ color: 'var(--purple-500)' }} />
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--navy-700)' }}>
              Executive Performance Summary &amp; Score Analysis
            </h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--navy-600)', lineHeight: 'var(--leading-relaxed)' }}>
              {session.aiSummary}
            </p>
          </div>
        </div>
      )}

      {/* ── Question-by-Question Marks Deduction & Actionable Feedback ── */}
      {questionRecords?.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Target size={18} style={{ color: 'var(--purple-600)' }} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--navy-900)' }}>
                Where You Lost Marks &amp; What to Include to Improve
              </h3>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-400)', fontWeight: 600 }}>
              Detailed Question Analysis
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {questionRecords.map((qa, idx) => {
              const isAnswered = qa.state === 'ANSWERED' || qa.state === 'PARTIALLY_ANSWERED' || qa.state === 'EVALUATED';
              const feedback = qa.aiFeedback;
              const marksAwarded = feedback?.marksAwarded ?? qa.scores?.technical ?? 0;
              const marksLost = feedback?.marksLost ?? (100 - marksAwarded);
              const deductions = feedback?.deductions ?? [];
              const howToImprove = feedback?.howToImprove ?? [];

              return (
                <div key={qa.id ?? idx} style={{
                  padding: 'var(--space-6)',
                  borderBottom: idx < questionRecords.length - 1 ? '1px solid var(--border-subtle, #e2e8f0)' : 'none',
                }}>
                  {/* Top Bar for Question */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <span style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: 'var(--navy-800)' }}>
                      Question {idx + 1}
                    </span>
                    <span className="badge badge-purple" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                      {qa.questionType || 'technical'}
                    </span>
                    <span className="badge badge-navy" style={{ fontSize: 11 }}>
                      {qa.state?.replace(/_/g, ' ')}
                    </span>

                    {/* Score and Marks Lost Pill */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: marksAwarded >= 85 ? 'var(--success-50)' : marksAwarded >= 60 ? 'var(--warning-50)' : 'var(--error-50)',
                        color: marksAwarded >= 85 ? 'var(--success-700)' : marksAwarded >= 60 ? 'var(--warning-700)' : 'var(--error-700)',
                        border: '1px solid currentColor',
                      }}>
                        Score: {marksAwarded} / 100
                      </span>
                      {marksLost > 0 && (
                        <span style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--error-600)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}>
                          -{marksLost} pts lost
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <h4 style={{ fontSize: 'var(--text-base)', color: 'var(--navy-900)', fontWeight: 600, marginBottom: 'var(--space-3)', lineHeight: 1.4 }}>
                    {qa.questionText}
                  </h4>

                  {/* Candidate Response */}
                  {isAnswered && qa.transcriptVerbatim ? (
                    <div style={{
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3) var(--space-4)',
                      marginBottom: 'var(--space-4)',
                      borderLeft: '3px solid var(--navy-300)',
                    }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--navy-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        Your Answer:
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--navy-700)', fontStyle: 'normal', lineHeight: 1.5 }}>
                        &ldquo;{qa.transcriptVerbatim}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3) var(--space-4)',
                      marginBottom: 'var(--space-4)',
                      borderLeft: '3px solid var(--error-400)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--error-600)',
                      fontStyle: 'italic',
                    }}>
                      No answer was recorded for this question. Full marks (-100 pts) were deducted.
                    </div>
                  )}

                  {/* Submitted Code Solution (Live Coding Sandbox) */}
                  {qa.codeSolution && (
                    <div style={{
                      background: '#181825',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                      marginBottom: 'var(--space-4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cdd6f4',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#89b4fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          💻 Candidate Code Solution &amp; Test Runner:
                        </span>
                        {qa.codeResults?.length > 0 && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: qa.codeResults.every(r => r.passed) ? 'rgba(166, 227, 161, 0.15)' : 'rgba(243, 139, 168, 0.15)',
                            color: qa.codeResults.every(r => r.passed) ? '#a6e3a1' : '#f38ba8',
                          }}>
                            {qa.codeResults.filter(r => r.passed).length}/{qa.codeResults.length} Test Cases Passed
                          </span>
                        )}
                      </div>
                      <pre style={{
                        margin: 0,
                        fontSize: 12,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        background: '#11111b',
                        padding: 10,
                        borderRadius: 6,
                        overflowX: 'auto',
                      }}>
                        {qa.codeSolution}
                      </pre>
                    </div>
                  )}

                  {/* AI Follow-Up Probe & Recovery Bonus */}
                  {qa.followUpQuestion && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04), rgba(59, 130, 246, 0.04))',
                      border: '1px solid rgba(124, 58, 237, 0.25)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                      marginBottom: 'var(--space-4)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--purple-700)', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                          <Zap size={14} fill="currentColor" />
                          AI INTERVIEWER FOLLOW-UP PROBE:
                        </div>
                        {qa.followUpBonus > 0 ? (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--success-700)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}>
                            +{qa.followUpBonus} pts recovered
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--navy-400)' }}>
                            {qa.followUpAnswer ? 'No bonus awarded' : 'Follow-up skipped'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--navy-800)', marginBottom: 6 }}>
                        {qa.followUpQuestion}
                      </div>
                      {qa.followUpAnswer ? (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-600)', background: 'rgba(255, 255, 255, 0.7)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--navy-500)' }}>Your Clarification: </span>
                          &ldquo;{qa.followUpAnswer}&rdquo;
                        </div>
                      ) : (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-400)', fontStyle: 'italic' }}>
                          Follow-up was skipped without clarification.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deductions: Where exactly marks were lost */}
                  {deductions.length > 0 && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.04)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                      marginBottom: 'var(--space-4)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--error-700)', fontWeight: 700, fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
                        <AlertCircle size={15} />
                        WHERE YOU LOST MARKS (DEDUCTIONS):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {deductions.map((d, dIdx) => (
                          <div key={dIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                            <span style={{
                              flexShrink: 0,
                              background: 'var(--error-100, #fee2e2)',
                              color: 'var(--error-700, #b91c1c)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 700,
                              fontSize: 11,
                            }}>
                              -{d.pointsDeducted} pts
                            </span>
                            <div style={{ color: 'var(--navy-700)' }}>
                              <strong>{d.reason}:</strong> {d.detail}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actionable Feedback: What to include to improve */}
                  {howToImprove.length > 0 && (
                    <div style={{
                      background: 'rgba(124, 58, 237, 0.04)',
                      border: '1px solid rgba(124, 58, 237, 0.2)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                      marginBottom: 'var(--space-4)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--purple-700)', fontWeight: 700, fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
                        <Zap size={15} />
                        WHAT TO INCLUDE TO IMPROVE YOUR SCORE:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--text-xs)', color: 'var(--navy-700)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {howToImprove.map((item, itemIdx) => (
                          <li key={itemIdx} style={{ lineHeight: 1.5 }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Verified Strengths */}
                  {feedback?.strengths?.length > 0 && feedback.strengths[0] !== 'Attempted response' && (
                    <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--success-700)' }}>
                      <strong>✓ Verified Strengths: </strong>
                      <span>{feedback.strengths.join(' · ')}</span>
                    </div>
                  )}

                  {/* Reference Model Answer */}
                  {feedback?.modelAnswer && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderLeft: '3px solid var(--success-500)',
                      borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                      padding: 'var(--space-3) var(--space-4)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        Model Answer (Production-Grade Reference):
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-800)', lineHeight: 1.5, margin: 0 }}>
                        {feedback.modelAnswer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--warning-50)', borderRadius: 10, fontSize: 13, color: 'var(--warning-700)' }}>
          <AlertCircle size={14} /> Could not load full breakdown: {error}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="completed-page__actions">
        {sessionId ? (
          <Link to={`/report/${sessionId}`} className="btn btn-primary btn-lg" id="completed-view-report">
            <BarChart3 size={16} /> View Full Report <ArrowRight size={15} />
          </Link>
        ) : (
          <Link to="/history" className="btn btn-primary btn-lg" id="completed-view-history">
            <BarChart3 size={16} /> View History <ArrowRight size={15} />
          </Link>
        )}
        <Link to="/interview/setup" className="btn btn-secondary btn-lg" id="completed-practice-again">
          <RotateCcw size={15} /> Practice Again
        </Link>
      </div>
    </div>
  );
}
