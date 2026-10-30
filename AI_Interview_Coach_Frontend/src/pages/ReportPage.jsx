import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart3, Award, CheckCircle2, AlertCircle, TrendingUp,
  Eye, Activity, Hand, Clock, ArrowLeft, Mic,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { reports as reportsApi } from '../utils/api';
import { getScoreGrade, formatDuration } from '../utils/helpers';
import './PlaceholderPage.css';
import './ReportPage.css';

function scoreColor(score) {
  if (score == null) return 'var(--navy-300)';
  if (score >= 90) return 'var(--success-500)';
  if (score >= 80) return 'var(--blue-500)';
  if (score >= 70) return 'var(--warning-500)';
  return 'var(--error-500)';
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__label">{label}</span>
      <span className="chart-tooltip__value">{payload[0].value}<span>/100</span></span>
    </div>
  );
}

function PieLabelTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__label">{payload[0].name}</span>
      <span className="chart-tooltip__value">{payload[0].value}</span>
    </div>
  );
}

const CATEGORY_META = {
  technical:      { label: 'Technical Knowledge',  icon: '💡', grade: (s) => s >= 90 ? 'A' : s >= 80 ? 'B+' : s >= 70 ? 'B' : 'C' },
  problemSolving: { label: 'Problem Solving',       icon: '🧩', grade: (s) => s >= 90 ? 'A' : s >= 80 ? 'A-' : s >= 70 ? 'B+' : 'B' },
  communication:  { label: 'Communication',         icon: '💬', grade: (s) => s >= 90 ? 'A' : s >= 80 ? 'A-' : s >= 70 ? 'B+' : 'B' },
  adaptability:   { label: 'Adaptability',          icon: '🔄', grade: (s) => s >= 90 ? 'A' : s >= 80 ? 'B+' : s >= 70 ? 'B' : 'B-' },
};

const OBS_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

export default function ReportPage() {
  const { sessionId } = useParams();

  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchReport = useCallback(async () => {
    if (!sessionId) { setLoading(false); setError('No session ID provided.'); return; }
    setLoading(true); setError('');
    try {
      const data = await reportsApi.getSession(sessionId);
      setReport(data);
    } catch (e) {
      setError(e.message || 'Could not load report.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="placeholder-page report-page" id="report-page">
        <div className="placeholder-page__header">
          <h2 className="placeholder-page__title">Loading Report…</h2>
        </div>
        <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-xl)' }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-xl)', marginTop: 'var(--space-5)' }} />
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────────────────────
  if (error || !report) {
    return (
      <div className="placeholder-page report-page" id="report-page">
        <div className="placeholder-page__header">
          <h2 className="placeholder-page__title">Report Unavailable</h2>
        </div>
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <AlertCircle size={36} style={{ color: 'var(--error-400)', marginBottom: 'var(--space-4)' }} />
          <p style={{ color: 'var(--navy-600)', marginBottom: 'var(--space-5)' }}>
            {error || 'Session report not found.'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={fetchReport}>Retry</button>
            <Link to="/history" className="btn btn-ghost"><ArrowLeft size={14} /> View History</Link>
          </div>
        </div>
      </div>
    );
  }

  const { session, observations } = report;
  const scores = session.scores;
  const overall = scores?.overall;
  const overallGrade = overall != null ? getScoreGrade(overall) : null;
  const durationMin = session.durationSec ? Math.round(session.durationSec / 60) : null;

  // Build chart data from real scores
  const chartData = Object.entries(CATEGORY_META)
    .map(([key, meta]) => ({
      name: meta.label.split(' ')[0], // short label
      fullName: meta.label,
      score: scores?.[key] ?? null,
      icon: meta.icon,
    }))
    .filter((d) => d.score !== null);

  // Observation pie slices
  const gazePie    = observations?.gaze?.filter((g) => g.count > 0) ?? [];
  const posturePie = observations?.posture?.filter((p) => p.count > 0) ?? [];

  const GAZE_LABEL_MAP = {
    facing_camera: 'Facing Camera', looking_side: 'Looking Side',
    looking_down: 'Looking Down',   unknown: 'Unknown',
  };
  const POSTURE_LABEL_MAP = {
    upright: 'Upright', leaning_forward: 'Leaning Forward',
    leaning_back: 'Leaning Back', slouching: 'Slouching',
    insufficient_visibility: 'Not Visible', unknown: 'Unknown',
  };
  const GESTURE_LABEL_MAP = {
    none: 'No Gesture', one_hand_raised: 'Hand Raised',
    both_hands_raised: 'Both Hands', unknown: 'Unknown',
  };

  return (
    <div className="placeholder-page report-page" id="report-page">
      {/* Back nav */}
      <Link to="/history" className="btn btn-ghost btn-sm" id="report-back-btn"
        style={{ alignSelf: 'flex-start', marginBottom: 'var(--space-2)' }}>
        <ArrowLeft size={14} /> Back to History
      </Link>

      <div className="placeholder-page__header">
        <h2 className="placeholder-page__title">AI Performance Report</h2>
        <p className="placeholder-page__subtitle">
          {session.role ?? 'Interview'} · {session.difficulty ?? '—'}
          {overall != null && (
            <> · Overall Score: <strong style={{ color: overallGrade?.color }}>{overall}/100</strong></>
          )}
        </p>
      </div>

      {/* Overview */}
      <div className="report-overview card">
        <div className="card-body report-overview__body">
          <div className="report-overview__score">
            <div className="report-overview__score-ring">
              <svg width="120" height="120" viewBox="0 0 120 120" aria-label={`Overall score: ${overall ?? 'pending'}`}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--navy-100)" strokeWidth="8" />
                <circle cx="60" cy="60" r="50" fill="none"
                  stroke="url(#scoreGrad)" strokeWidth="8"
                  strokeDasharray={`${((overall ?? 0) / 100) * 314} 314`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="var(--purple-600)" />
                    <stop offset="100%" stopColor="var(--blue-500)"   />
                  </linearGradient>
                </defs>
              </svg>
              <div className="report-overview__score-label">
                <span className="report-overview__score-val">{overall ?? '—'}</span>
                <span className="report-overview__score-unit">/ 100</span>
              </div>
            </div>
            <div>
              {overallGrade && (
                <div className="badge badge-success" style={{ marginBottom: 'var(--space-2)' }}>
                  <Award size={11} /> {overallGrade.label}
                </div>
              )}
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--navy-900)', marginBottom: 'var(--space-1)' }}>
                {session.role ?? 'Interview'}
              </h3>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                {session.questionsAsked > 0 && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--navy-400)', display:'flex', alignItems:'center', gap:4 }}>
                    <Mic size={13}/> {session.questionsAsked} questions
                  </span>
                )}
                {durationMin && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--navy-400)', display:'flex', alignItems:'center', gap:4 }}>
                    <Clock size={13}/> {formatDuration(durationMin)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {session.aiSummary && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--navy-800)' }}>AI Feedback Summary</h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize:'var(--text-sm)', color:'var(--navy-600)', lineHeight:'var(--leading-relaxed)' }}>
              {session.aiSummary}
            </p>
          </div>
        </div>
      )}

      {/* Bar chart — category scores */}
      {chartData.length > 0 && (
        <div className="card report-chart-card">
          <div className="card-header">
            <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
              <BarChart3 size={16} style={{ color:'var(--purple-500)' }} />
              <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--navy-800)' }}>Score Breakdown</h3>
            </div>
          </div>
          <div className="card-body" style={{ padding:'var(--space-6)' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top:8, right:8, left:-24, bottom:0 }} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--navy-100)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--navy-400)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fontSize:12, fill:'var(--navy-400)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<BarTooltip />} cursor={{ fill:'var(--navy-50)' }} />
                <Bar dataKey="score" radius={[6,6,0,0]}>
                  {chartData.map((entry, idx) => <Cell key={idx} fill={scoreColor(entry.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Score category cards */}
      {chartData.length > 0 && (
        <div className="report-categories">
          <h3 className="dashboard__section-title" style={{ marginBottom:'var(--space-4)' }}>Category Breakdown</h3>
          <div className="report-categories__grid">
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const score = scores?.[key];
              if (score == null) return null;
              return (
                <div key={key} className="card report-category-card">
                  <div className="card-body">
                    <div className="report-category-card__top">
                      <span style={{ fontSize:'var(--text-sm)', fontWeight:600, color:'var(--navy-700)' }}>
                        {meta.icon} {meta.label}
                      </span>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'var(--text-xl)', color:scoreColor(score) }}>
                        {score}
                      </span>
                    </div>
                    <div className="progress-bar" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
                      <div className="progress-bar__fill" style={{ width:`${score}%`, background:scoreColor(score) }} />
                    </div>
                    <div style={{ marginTop:'var(--space-2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span className="badge badge-success">{meta.grade(score)}</span>
                      <span style={{ fontSize:'var(--text-xs)', color:'var(--navy-400)' }}>{getScoreGrade(score).label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Camera observations */}
      {observations?.total > 0 && (
        <div className="card">
          <div className="card-header">
            <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
              <Eye size={16} style={{ color:'var(--purple-500)' }} />
              <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--navy-800)' }}>
                Behaviour Analysis ({observations.total} samples)
              </h3>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'var(--space-6)' }}>
              {/* Gaze */}
              {gazePie.length > 0 && (
                <div>
                  <p style={{ fontSize:'var(--text-sm)', fontWeight:600, color:'var(--navy-700)', marginBottom:'var(--space-3)', display:'flex', alignItems:'center', gap:6 }}>
                    <Eye size={14}/> Gaze Distribution
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={gazePie.map((g) => ({ name: GAZE_LABEL_MAP[g.label] ?? g.label, value: g.count }))}
                        cx="50%" cy="50%" outerRadius={60} dataKey="value">
                        {gazePie.map((_, idx) => <Cell key={idx} fill={OBS_COLORS[idx % OBS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<PieLabelTooltip />} />
                      <Legend wrapperStyle={{ fontSize:11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Posture */}
              {posturePie.length > 0 && (
                <div>
                  <p style={{ fontSize:'var(--text-sm)', fontWeight:600, color:'var(--navy-700)', marginBottom:'var(--space-3)', display:'flex', alignItems:'center', gap:6 }}>
                    <Activity size={14}/> Posture Distribution
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={posturePie.map((p) => ({ name: POSTURE_LABEL_MAP[p.label] ?? p.label, value: p.count }))}
                        cx="50%" cy="50%" outerRadius={60} dataKey="value">
                        {posturePie.map((_, idx) => <Cell key={idx} fill={OBS_COLORS[idx % OBS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<PieLabelTooltip />} />
                      <Legend wrapperStyle={{ fontSize:11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Gesture summary */}
              {observations?.gesture?.length > 0 && (
                <div>
                  <p style={{ fontSize:'var(--text-sm)', fontWeight:600, color:'var(--navy-700)', marginBottom:'var(--space-3)', display:'flex', alignItems:'center', gap:6 }}>
                    <Hand size={14}/> Gesture Summary
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                    {observations.gesture.filter((g) => g.count > 0).map((g) => {
                      const total = observations.gesture.reduce((a, x) => a + x.count, 0);
                      const pct   = total > 0 ? Math.round((g.count / total) * 100) : 0;
                      return (
                        <div key={g.label} style={{ display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                          <span style={{ fontSize:'var(--text-xs)', color:'var(--navy-600)', minWidth:100 }}>
                            {GESTURE_LABEL_MAP[g.label] ?? g.label}
                          </span>
                          <div className="progress-bar" style={{ flex:1, height:6 }}>
                            <div className="progress-bar__fill" style={{ width:`${pct}%`, background:'var(--purple-500)' }} />
                          </div>
                          <span style={{ fontSize:'var(--text-xs)', color:'var(--navy-400)', minWidth:32, textAlign:'right' }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No observations note */}
      {observations?.total === 0 && (
        <div className="card" style={{ padding:'var(--space-5)', textAlign:'center', color:'var(--navy-400)' }}>
          <Eye size={28} style={{ opacity:0.3, marginBottom:'var(--space-2)' }} />
          <p style={{ fontSize:'var(--text-sm)' }}>No camera observations were recorded for this session.</p>
          <p style={{ fontSize:'var(--text-xs)', marginTop:4 }}>Enable the camera during interviews for behaviour analysis.</p>
        </div>
      )}

      {/* Transcript */}
      {session.transcript && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--navy-800)' }}>Full Transcript</h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize:'var(--text-sm)', color:'var(--navy-600)', lineHeight:'var(--leading-relaxed)', whiteSpace:'pre-wrap', maxHeight:200, overflowY:'auto' }}>
              {session.transcript}
            </p>
          </div>
        </div>
      )}

      {/* ── Attempt summary ── */}
      {report.attemptSummary && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--navy-800)' }}>
              📋 Question Attempt Summary
            </h3>
            {!report.attemptSummary.evidenceBased && (
              <span className="badge badge-navy" style={{ fontSize:10 }}>Legacy — estimated</span>
            )}
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'var(--space-3)' }}>
              {[
                { label:'Configured',   val: report.attemptSummary.totalConfigured,       color:'var(--navy-500)' },
                { label:'Presented',    val: report.attemptSummary.totalPresented,         color:'var(--blue-500)' },
                { label:'Answered',     val: report.attemptSummary.totalGenuinelyAnswered, color:'var(--success-500)' },
                { label:'Partial',      val: report.attemptSummary.totalPartiallyAnswered, color:'var(--warning-500)' },
                { label:'Skipped',      val: report.attemptSummary.totalSkipped,           color:'var(--navy-400)' },
                { label:'Not Attempted',val: report.attemptSummary.totalNotAttempted,      color:'var(--error-400)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ textAlign:'center', padding:'var(--space-3)', background:'var(--bg-subtle)', borderRadius:'var(--radius-lg)' }}>
                  <div style={{ fontSize:'var(--text-2xl)', fontWeight:800, color }}>{val}</div>
                  <div style={{ fontSize:'var(--text-xs)', color:'var(--navy-500)', marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:'var(--space-3)', display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
              <div className="progress-bar" style={{ flex:1 }}>
                <div className="progress-bar__fill" style={{
                  width: `${report.attemptSummary.completionRate}%`,
                  background: report.attemptSummary.completionRate === 100 ? 'var(--success-500)' :
                              report.attemptSummary.completionRate >= 50  ? 'var(--warning-500)' : 'var(--error-400)',
                }} />
              </div>
              <span style={{ fontSize:'var(--text-xs)', fontWeight:700, color:'var(--navy-600)', minWidth:40 }}>
                {report.attemptSummary.completionRate}%
              </span>
            </div>
            <p style={{ fontSize:'var(--text-xs)', color:'var(--navy-400)', marginTop:'var(--space-1)' }}>
              Completion rate — based on questions with a genuine submitted answer.
            </p>
          </div>
        </div>
      )}

      {/* ── Per-question breakdown ── */}
      {report.questions?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--navy-800)' }}>
              🔍 Question-by-Question Breakdown
            </h3>
          </div>
          <div className="card-body" style={{ padding:0 }}>
            {report.questions.map((qa, idx) => {
              const isAnswered = qa.state === 'ANSWERED' || qa.state === 'PARTIALLY_ANSWERED' || qa.state === 'EVALUATED';
              const isSkipped  = qa.state === 'SKIPPED';
              const isNotDone  = qa.state === 'NOT_ATTEMPTED' || qa.state === 'NOT_STARTED' || qa.state === 'TIMED_OUT';
              const badgeStyle = isAnswered ? { background:'var(--success-50)',  color:'var(--success-700)', border:'1px solid var(--success-200)' }
                               : isSkipped  ? { background:'var(--navy-100)',     color:'var(--navy-500)',    border:'1px solid var(--navy-200)' }
                               : isNotDone  ? { background:'var(--error-50)',     color:'var(--error-600)',   border:'1px solid var(--error-200)' }
                               :              { background:'var(--warning-50)',   color:'var(--warning-700)', border:'1px solid var(--warning-200)' };
              return (
                <div key={qa.questionIndex} style={{
                  padding:'var(--space-5) var(--space-6)',
                  borderBottom: idx < report.questions.length - 1 ? 'var(--border-subtle)' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', marginBottom:'var(--space-3)' }}>
                    <span style={{ fontSize:'var(--text-sm)', fontWeight:700, color:'var(--navy-500)', minWidth:28 }}>
                      Q{qa.questionIndex + 1}
                    </span>
                    <span style={{ ...badgeStyle, padding:'2px 8px', borderRadius:'var(--radius-full)', fontSize:11, fontWeight:600 }}>
                      {qa.state?.replace(/_/g, ' ')}
                    </span>
                    {qa.questionType && (
                      <span className={`badge ${qa.questionType === 'technical' ? 'badge-purple' : qa.questionType === 'behavioral' ? 'badge-blue' : 'badge-navy'}`} style={{ fontSize:10 }}>
                        {qa.questionType}
                      </span>
                    )}
                    {qa.scores?.technical != null ? (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 'var(--text-xs)',
                        background: qa.scores.technical >= 85 ? 'var(--success-50)' : qa.scores.technical >= 70 ? 'var(--blue-50)' : 'var(--warning-50)',
                        color: qa.scores.technical >= 85 ? 'var(--success-700)' : qa.scores.technical >= 70 ? 'var(--blue-700)' : 'var(--warning-700)',
                        border: '1px solid currentColor',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 700,
                      }}>
                        🎯 {qa.scores.technical}% Accuracy
                      </span>
                    ) : qa.wordCount > 0 ? (
                      <span style={{ marginLeft:'auto', fontSize:'var(--text-xs)', color:'var(--navy-400)', fontWeight:500 }}>
                        {qa.wordCount} words
                      </span>
                    ) : null}
                  </div>

                  {/* Question text */}
                  {qa.questionText && (
                    <p style={{ fontSize:'var(--text-sm)', color:'var(--navy-700)', fontWeight:600, marginBottom:'var(--space-2)', lineHeight:'var(--leading-relaxed)' }}>
                      {qa.questionText}
                    </p>
                  )}

                  {/* Transcript or status message */}
                  {isAnswered && qa.transcriptVerbatim ? (
                    <div style={{ background:'var(--bg-subtle)', borderRadius:'var(--radius-md)', padding:'var(--space-3) var(--space-4)', marginTop:'var(--space-2)' }}>
                      <p style={{ fontSize:'var(--text-xs)', fontWeight:600, color:'var(--navy-400)', marginBottom:'var(--space-1)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        Your response
                      </p>
                      <p style={{ fontSize:'var(--text-sm)', color:'var(--navy-600)', lineHeight:'var(--leading-relaxed)' }}>
                        {qa.transcriptVerbatim}
                      </p>

                      {/* AI Accuracy & Deductions Analysis */}
                      {qa.aiFeedback && (
                        <div style={{ marginTop:'var(--space-3)', paddingTop:'var(--space-3)', borderTop:'1px dashed var(--border-subtle, #e2e8f0)' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom:'var(--space-3)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
                              <span style={{ fontSize:'var(--text-xs)', fontWeight:800, color:'var(--purple-700)' }}>
                                🧠 Evaluation Verdict:
                              </span>
                              <span style={{ fontSize:'var(--text-xs)', fontWeight:600, color:'var(--navy-700)' }}>
                                {qa.aiFeedback.verdict || qa.aiFeedback.summary}
                              </span>
                            </div>
                            {(qa.aiFeedback.marksLost > 0 || (100 - (qa.scores?.technical ?? 100)) > 0) && (
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--error-600)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                              }}>
                                -{qa.aiFeedback.marksLost ?? (100 - (qa.scores?.technical ?? 0))} pts lost
                              </span>
                            )}
                          </div>

                          {/* Where exactly marks were lost (Deductions) */}
                          {qa.aiFeedback.deductions?.length > 0 && (
                            <div style={{
                              background: 'rgba(239, 68, 68, 0.04)',
                              border: '1px solid rgba(239, 68, 68, 0.18)',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--space-3) var(--space-4)',
                              marginBottom: 'var(--space-3)',
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--error-700)', display: 'block', marginBottom: 6 }}>
                                🛑 WHERE YOU LOST MARKS (DEDUCTIONS):
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {qa.aiFeedback.deductions.map((d, dIdx) => (
                                  <div key={dIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--navy-700)' }}>
                                    <span style={{
                                      flexShrink: 0,
                                      background: 'var(--error-100, #fee2e2)',
                                      color: 'var(--error-700, #b91c1c)',
                                      padding: '1px 6px',
                                      borderRadius: 'var(--radius-sm)',
                                      fontWeight: 700,
                                      fontSize: 10,
                                    }}>
                                      -{d.pointsDeducted} pts
                                    </span>
                                    <span><strong>{d.reason}:</strong> {d.detail}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actionable Feedback: What to include to improve */}
                          {(qa.aiFeedback.howToImprove?.length > 0 || qa.aiFeedback.missing?.length > 0) && (
                            <div style={{
                              background: 'rgba(124, 58, 237, 0.04)',
                              border: '1px solid rgba(124, 58, 237, 0.18)',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--space-3) var(--space-4)',
                              marginBottom: 'var(--space-3)',
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple-700)', display: 'block', marginBottom: 6 }}>
                                💡 WHAT TO INCLUDE TO IMPROVE YOUR SCORE:
                              </span>
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--navy-700)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {(qa.aiFeedback.howToImprove?.length > 0 ? qa.aiFeedback.howToImprove : qa.aiFeedback.missing)
                                  .filter((m) => m !== 'Excellent answer coverage with no major omissions')
                                  .map((item, mIdx) => (
                                    <li key={mIdx}>{item}</li>
                                  ))}
                              </ul>
                            </div>
                          )}

                          {/* Key Concepts Verified */}
                          {qa.aiFeedback.strengths?.length > 0 && qa.aiFeedback.strengths[0] !== 'Attempted response' && (
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-700)' }}>✓ Verified Strengths: </span>
                              <span style={{ fontSize: 12, color: 'var(--navy-600)' }}>
                                {qa.aiFeedback.strengths.join(' · ')}
                              </span>
                            </div>
                          )}

                          {/* Reference Model Answer */}
                          {qa.aiFeedback.modelAnswer && (
                            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success-500)' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-700)', display: 'block', marginBottom: 2 }}>
                                Model Answer (Reference for 100% Score):
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--navy-700)', lineHeight: 1.5 }}>
                                {qa.aiFeedback.modelAnswer}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : isSkipped ? (
                    <p style={{ fontSize:'var(--text-sm)', color:'var(--navy-400)', fontStyle:'italic' }}>
                      Question was skipped — no response recorded.
                    </p>
                  ) : isNotDone ? (
                    <p style={{ fontSize:'var(--text-sm)', color:'var(--error-500)', fontStyle:'italic' }}>
                      Question {qa.state === 'TIMED_OUT' ? 'timed out' : 'was not attempted'} — no candidate response available for evaluation.
                    </p>
                  ) : (
                    <p style={{ fontSize:'var(--text-sm)', color:'var(--navy-400)', fontStyle:'italic' }}>
                      No transcript available (transcript status: {qa.transcriptStatus ?? 'unknown'}).
                    </p>
                  )}

                  {/* Submitted Code Solution (Live Coding Sandbox) */}
                  {qa.codeSolution && (
                    <div style={{
                      marginTop: 'var(--space-3)',
                      background: '#181825',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3) var(--space-4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cdd6f4',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#89b4fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          💻 Candidate Code Solution:
                        </span>
                        {qa.codeResults?.length > 0 && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
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
                        fontSize: 11,
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        background: '#11111b',
                        padding: 8,
                        borderRadius: 4,
                        overflowX: 'auto',
                      }}>
                        {qa.codeSolution}
                      </pre>
                    </div>
                  )}

                  {/* AI Follow-Up Probe Section */}
                  {qa.followUpQuestion && (
                    <div style={{
                      marginTop: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04), rgba(59, 130, 246, 0.04))',
                      border: '1px solid rgba(124, 58, 237, 0.2)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          ⚡ AI Follow-Up Interrogation Probe:
                        </span>
                        {qa.followUpBonus > 0 ? (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--success-700)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-full)',
                          }}>
                            +{qa.followUpBonus} pts bonus recovered
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--navy-400)' }}>
                            {qa.followUpAnswer ? 'No recovery bonus awarded' : 'Follow-up skipped'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--navy-800)', marginBottom: 4 }}>
                        {qa.followUpQuestion}
                      </div>
                      {qa.followUpAnswer ? (
                        <div style={{ fontSize: 11, color: 'var(--navy-600)', background: 'rgba(255, 255, 255, 0.65)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--navy-500)' }}>Your Clarification: </span>
                          &ldquo;{qa.followUpAnswer}&rdquo;
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--navy-400)', fontStyle: 'italic' }}>
                          Follow-up was skipped without clarification.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evaluation limitations notice */}
      {report.attemptSummary && (
        <div style={{ padding:'var(--space-4) var(--space-5)', background:'var(--bg-subtle)', borderRadius:'var(--radius-lg)', borderLeft:'3px solid var(--navy-300)' }}>
          <p style={{ fontSize:'var(--text-xs)', color:'var(--navy-500)', lineHeight:'var(--leading-relaxed)' }}>
            <strong>Evaluation notes:</strong>{' '}
            {!report.attemptSummary.evidenceBased
              ? 'Per-question tracking was not available for this session. Scores are estimated from the total transcript. Complete a new interview for question-level tracking.'
              : `Scores are based on ${report.attemptSummary.totalGenuinelyAnswered} answered question(s) out of ${report.attemptSummary.totalConfigured} configured. Unanswered questions do not contribute to answer-quality scores.`
            }
            {report.attemptSummary.totalAwaitingProcessing > 0 && (
              <> · {report.attemptSummary.totalAwaitingProcessing} answer(s) awaiting AI evaluation.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

