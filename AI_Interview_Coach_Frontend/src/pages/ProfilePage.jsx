import { useState, useEffect, useCallback } from 'react';
import { Edit3, Mail, Briefcase, Calendar, Award, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { dashboard as dashboardApi } from '../utils/api';
import { formatDate, getInitials } from '../utils/helpers';
import './PlaceholderPage.css';
import './ProfilePage.css';

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__label">{payload[0].payload.skill}</span>
      <span className="chart-tooltip__value">{payload[0].value}<span>/100</span></span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const [stats,   setStats]   = useState(null);
  const [streak,  setStreak]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, st] = await Promise.all([dashboardApi.stats(), dashboardApi.streak()]);
      setStats(s);
      setStreak(st);
    } catch (e) {
      setError(e.message || 'Could not load profile data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build radar chart data from category averages across all sessions
  const radarData = stats ? [
    { skill: 'Technical',         score: null },
    { skill: 'Problem Solving',   score: null },
    { skill: 'Communication',     score: null },
    { skill: 'Adaptability',      score: null },
  ] : [];
  // Note: category averages aren't in stats yet — we'll show what we have
  // For now show overall stats; a future /api/profile endpoint could add this

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt * 1000).toISOString()
    : null;

  return (
    <div className="placeholder-page profile-page" id="profile-page">
      <div className="placeholder-page__header">
        <h2 className="placeholder-page__title">Profile</h2>
        <p className="placeholder-page__subtitle">Manage your account and track your progress</p>
      </div>

      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', padding:'var(--space-3) var(--space-4)', background:'var(--error-50)', color:'var(--error-600)', borderRadius:'var(--radius-lg)', fontSize:'var(--text-sm)' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="profile-grid">
        {/* Avatar card */}
        <div className="card profile-avatar-card">
          <div className="card-body profile-avatar-card__body">
            <div className="profile-avatar">{getInitials(user?.name ?? '')}</div>
            <div>
              <h3 className="profile-name">{user?.name ?? '—'}</h3>
              <p className="profile-role">InterviewIQ Member</p>
            </div>
            <button className="btn btn-secondary btn-sm" id="profile-edit-btn" disabled>
              <Edit3 size={13} /> Edit Profile
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--navy-800)' }}>Account Info</h3>
          </div>
          <div className="card-body profile-info-list">
            <div className="profile-info-row">
              <Mail size={15} className="profile-info-icon" />
              <div>
                <p className="profile-info-label">Email</p>
                <p className="profile-info-value">{user?.email ?? '—'}</p>
              </div>
            </div>
            <div className="profile-info-row">
              <Briefcase size={15} className="profile-info-icon" />
              <div>
                <p className="profile-info-label">Account Role</p>
                <p className="profile-info-value" style={{ textTransform:'capitalize' }}>{user?.role ?? 'user'}</p>
              </div>
            </div>
            {joinedDate && (
              <div className="profile-info-row">
                <Calendar size={15} className="profile-info-icon" />
                <div>
                  <p className="profile-info-label">Member Since</p>
                  <p className="profile-info-value">{formatDate(joinedDate)}</p>
                </div>
              </div>
            )}
            <div className="profile-info-row">
              <Zap size={15} className="profile-info-icon" />
              <div>
                <p className="profile-info-label">Current Streak</p>
                <p className="profile-info-value">{streak?.current ?? 0} day{streak?.current !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--navy-800)' }}>
              <Award size={16} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
              Interview Statistics
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={fetchData} disabled={loading} title="Refresh">
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          <div className="card-body profile-stats-grid">
            {loading ? (
              [1,2,3,4].map((i) => (
                <div key={i} className="profile-stat">
                  <div className="skeleton" style={{ height:28, width:50, marginBottom:6 }} />
                  <div className="skeleton" style={{ height:12, width:80 }} />
                </div>
              ))
            ) : (
              <>
                <div className="profile-stat">
                  <span className="profile-stat__value">{stats?.total ?? 0}</span>
                  <span className="profile-stat__label">Total Sessions</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__value">{stats?.completed ?? 0}</span>
                  <span className="profile-stat__label">Completed</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__value">
                    {stats?.averageScore != null ? stats.averageScore : '—'}
                  </span>
                  <span className="profile-stat__label">Avg. Score</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__value">
                    {stats?.bestScore != null ? stats.bestScore : '—'}
                  </span>
                  <span className="profile-stat__label">Best Score</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__value">{streak?.current ?? 0}</span>
                  <span className="profile-stat__label">Day Streak</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat__value">{streak?.longest ?? 0}</span>
                  <span className="profile-stat__label">Longest Streak</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Empty state when no CV observations yet */}
        {!loading && stats?.total === 0 && (
          <div className="card" style={{ gridColumn:'1 / -1', padding:'var(--space-8)', textAlign:'center', color:'var(--navy-400)' }}>
            <p style={{ marginBottom:'var(--space-2)', fontWeight:600 }}>No interviews completed yet.</p>
            <p style={{ fontSize:'var(--text-sm)' }}>Complete interviews to see skill breakdowns and radar charts.</p>
          </div>
        )}

        {/* Danger zone */}
        <div className="card" style={{ gridColumn:'1 / -1', borderColor:'var(--error-200)' }}>
          <div className="card-header">
            <h3 style={{ fontSize:'var(--text-base)', fontWeight:600, color:'var(--error-600)' }}>Account</h3>
          </div>
          <div className="card-body" style={{ display:'flex', gap:'var(--space-3)' }}>
            <button className="btn btn-danger btn-sm" id="profile-logout-btn" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
