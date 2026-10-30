import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Clock, TrendingUp, Zap, ArrowRight,
  Mic, FileText, Briefcase, Trophy, AlertCircle, RefreshCw,
  Code2, Terminal,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { dashboard as dashboardApi } from '../utils/api';
import { formatDuration, getScoreGrade } from '../utils/helpers';
import './DashboardPage.css';

const QUICK_ACTIONS = [
  { label: 'Upload Resume',       icon: FileText,  to: '/resume',          color: 'blue'   },
  { label: 'Coding Sandbox',      icon: Code2,     to: '/coding',          color: 'purple' },
  { label: 'Pick Job Role',       icon: Briefcase, to: '/role-selection',  color: 'purple' },
  { label: 'Start Interview',     icon: Mic,       to: '/interview/setup', color: 'success'},
  { label: 'View Reports',        icon: BarChart3, to: '/report',          color: 'warning'},
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__label">{label}</span>
      <span className="chart-tooltip__value">{payload[0].value}<span>/100</span></span>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="stat-card stat-card--loading">
      <div className="skeleton skeleton--icon" />
      <div className="skeleton skeleton--label" />
      <div className="skeleton skeleton--value" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats,   setStats]   = useState(null);
  const [trend,   setTrend]   = useState(null);
  const [recent,  setRecent]  = useState(null);
  const [streak,  setStreak]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, trendData, recentData, streakData] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.trend(),
        dashboardApi.recent(5),
        dashboardApi.streak(),
      ]);
      setStats(statsData);
      setTrend(trendData.trend);
      setRecent(recentData.sessions);
      setStreak(streakData);
    } catch (e) {
      setError(e.message || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const currentStreak = streak?.current ?? 0;

  return (
    <div className="dashboard" id="dashboard-page">
      {/* Welcome banner */}
      <section className="dashboard__welcome" aria-label="Welcome">
        <div className="dashboard__welcome-text">
          <h2 className="dashboard__welcome-title">
            {getGreeting()}, {firstName} 👋
          </h2>
          <p className="dashboard__welcome-sub">
            {currentStreak > 0
              ? <>You're on a <strong>{currentStreak}-day</strong> streak. Keep it up!</>
              : <>Complete an interview to start your streak!</>
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={fetchAll}
            id="dashboard-refresh"
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <Link to="/interview/setup" className="btn btn-primary" id="dashboard-start-interview">
            <Mic size={16} /> New Interview <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="live-interview__error-banner" role="alert">
          <AlertCircle size={15} /> {error}
          <button className="btn btn-ghost btn-sm" onClick={fetchAll} style={{ marginLeft: 'auto' }}>Retry</button>
        </div>
      )}

      {/* Stats row */}
      <section className="dashboard__stats" aria-label="Statistics">
        {loading ? (
          [1,2,3,4].map((i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'var(--purple-50)', color: 'var(--purple-600)' }}>
                <Mic size={20} />
              </div>
              <span className="stat-card__label">Total Interviews</span>
              <span className="stat-card__value">{stats?.total ?? 0}</span>
              <span className="stat-card__change up">
                <TrendingUp size={11} /> {stats?.completed ?? 0} completed
              </span>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'var(--blue-50)', color: 'var(--blue-600)' }}>
                <BarChart3 size={20} />
              </div>
              <span className="stat-card__label">Average Score</span>
              <span className="stat-card__value">
                {stats?.averageScore != null ? stats.averageScore : '—'}
              </span>
              {stats?.averageScore != null ? (
                <span className="stat-card__change up" style={{ color: getScoreGrade(stats.averageScore).color }}>
                  {getScoreGrade(stats.averageScore).label}
                </span>
              ) : (
                <span className="stat-card__change" style={{ color: 'var(--navy-300)' }}>No data yet</span>
              )}
            </div>

            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'var(--success-50)', color: 'var(--success-600)' }}>
                <Zap size={20} />
              </div>
              <span className="stat-card__label">Day Streak</span>
              <span className="stat-card__value">{currentStreak}</span>
              <span className="stat-card__change up">
                <TrendingUp size={11} /> Best: {streak?.longest ?? 0} days
              </span>
            </div>

            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'var(--warning-50)', color: 'var(--warning-600)' }}>
                <Trophy size={20} />
              </div>
              <span className="stat-card__label">Best Score</span>
              <span className="stat-card__value">
                {stats?.bestScore != null ? stats.bestScore : '—'}
              </span>
              {stats?.bestScoreRole && (
                <span className="stat-card__change up" style={{ fontSize: 'var(--text-2xs)', color: 'var(--navy-400)' }}>
                  {stats.bestScoreRole}
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {/* Performance trend chart */}
      <section className="dashboard__chart-section" aria-label="Performance trend">
        <div className="dashboard__section-header">
          <h3 className="dashboard__section-title">Performance Trend</h3>
          <span className="badge badge-purple" style={{ fontSize: 'var(--text-xs)' }}>Last 6 months</span>
        </div>
        <div className="card dashboard__chart-card">
          <div className="card-body" style={{ padding: 'var(--space-6)' }}>
            {loading ? (
              <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
            ) : !trend?.length ? (
              <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--navy-300)', gap: 'var(--space-3)' }}>
                <BarChart3 size={36} />
                <p style={{ fontSize: 'var(--text-sm)' }}>No interview data yet. Complete an interview to see your trend.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--purple-500)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="var(--purple-500)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--navy-100)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--navy-400)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 12, fill: 'var(--navy-400)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="var(--purple-500)" strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={{ fill: 'var(--purple-500)', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: 'var(--purple-600)', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="dashboard__quick-actions" aria-label="Quick actions">
        <h3 className="dashboard__section-title">Quick Actions</h3>
        <div className="dashboard__actions-grid">
          {QUICK_ACTIONS.map(({ label, icon: Icon, to, color }) => (
            <Link key={to} to={to} id={`dashboard-action-${color}`}
              className="dashboard__action-card card card-interactive">
              <div className={`dashboard__action-icon dashboard__action-icon--${color}`}><Icon size={20} /></div>
              <span className="dashboard__action-label">{label}</span>
              <ArrowRight size={14} className="dashboard__action-arrow" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Dedicated Live Coding Platform Sector ── */}
      <section className="dashboard__coding-sector" aria-label="Live coding platform" style={{ marginTop: 'var(--space-6)' }}>
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95))',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124, 58, 237, 0.3)', color: '#c4b5fd', padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                <Code2 size={13} /> Live Coding Platform Sector
              </div>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                In-Browser Interactive Coding Sandbox
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                Practice live algorithmic challenges with real-time in-browser code execution (JavaScript, Python 3, TypeScript), automated test cases (Pass/Fail), and Big-O Time &amp; Space complexity analysis.
              </p>

              {/* Highlights pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', padding: '3px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  🧪 Live Test Runner
                </span>
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', padding: '3px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  ⏱️ Big-O Complexity ($O(N)$, $O(\log N)$)
                </span>
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', padding: '3px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  ⚡ Edge-Case &amp; Cleanliness Detector
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
              <Link
                to="/coding"
                id="dashboard-launch-coding-sandbox"
                className="btn btn-primary btn-lg"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
                }}
              >
                <Code2 size={16} /> Launch Coding Sandbox <ArrowRight size={14} />
              </Link>
              <Link
                to="/interview/setup"
                className="btn btn-ghost btn-sm"
                style={{
                  color: '#94a3b8',
                  textAlign: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                Start Coding Mock Round →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent interviews */}
      <section className="dashboard__recent" aria-label="Recent interviews">
        <div className="dashboard__section-header">
          <h3 className="dashboard__section-title">Recent Interviews</h3>
          <Link to="/history" className="btn btn-ghost btn-sm" id="dashboard-view-all">
            View all <ArrowRight size={13} />
          </Link>
        </div>

        <div className="dashboard__interviews-list card">
          {loading ? (
            [1,2,3].map((i) => (
              <div key={i} className="dashboard__interview-row" style={{ padding: 'var(--space-4)' }}>
                <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            ))
          ) : !recent?.length ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--navy-400)' }}>
              <Mic size={32} style={{ marginBottom: 'var(--space-3)', opacity: 0.3 }} />
              <p style={{ fontSize: 'var(--text-sm)' }}>No interviews yet.</p>
              <Link to="/interview/setup" className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-4)' }}>
                Start Your First Interview
              </Link>
            </div>
          ) : (
            recent.map((session) => {
              const g = session.scoreOverall != null ? getScoreGrade(session.scoreOverall) : null;
              const date = new Date(session.startedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <Link key={session.id} to={`/report/${session.id}`}
                  id={`dashboard-interview-${session.id}`} className="dashboard__interview-row">
                  <div className="dashboard__interview-info">
                    <div className="dashboard__interview-role">{session.role ?? 'Interview'}</div>
                    <div className="dashboard__interview-meta">
                      <span><Clock size={11} /> {date}</span>
                      {session.durationSec && <span>{formatDuration(Math.round(session.durationSec / 60))}</span>}
                      {session.difficulty && (
                        <span className="badge" style={{
                          background: session.difficulty === 'Hard' ? 'var(--error-50)' : 'var(--warning-50)',
                          color: session.difficulty === 'Hard' ? 'var(--error-600)' : 'var(--warning-600)',
                        }}>{session.difficulty}</span>
                      )}
                      <span className="badge" style={{
                        background: session.status === 'completed' ? 'var(--success-50)' : 'var(--warning-50)',
                        color: session.status === 'completed' ? 'var(--success-600)' : 'var(--warning-600)',
                      }}>{session.status}</span>
                    </div>
                  </div>
                  <div className="dashboard__interview-score" style={{ color: g?.color ?? 'var(--navy-300)' }}>
                    <span className="dashboard__interview-score-val">
                      {session.scoreOverall != null ? session.scoreOverall : '—'}
                    </span>
                    <span className="dashboard__interview-score-label">{g?.label ?? 'Pending'}</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
