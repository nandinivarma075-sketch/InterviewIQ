import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, BarChart3, ArrowRight, Filter, X, ChevronDown, RefreshCw, AlertCircle, Mic, Calendar } from 'lucide-react';
import { sessions as sessionsApi } from '../utils/api';
import { formatDate, formatDuration, getScoreGrade } from '../utils/helpers';
import './PlaceholderPage.css';
import './HistoryPage.css';

const ALL_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SCORE_RANGES = [
  { label: 'All',      min: 0,  max: 100 },
  { label: '90–100',   min: 90, max: 100 },
  { label: '75–89',    min: 75, max: 89  },
  { label: '60–74',    min: 60, max: 74  },
  { label: 'Below 60', min: 0,  max: 59  },
];
const SORT_OPTIONS = [
  { label: 'Newest first',  value: 'date_desc'  },
  { label: 'Oldest first',  value: 'date_asc'   },
  { label: 'Highest score', value: 'score_desc' },
  { label: 'Lowest score',  value: 'score_asc'  },
];

/** Returns a toISOString date string (YYYY-MM-DD) for N days ago */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const DATE_PRESETS = [
  { label: 'All time',     from: '',             to: '' },
  { label: 'Today',        from: daysAgo(0),     to: daysAgo(0) },
  { label: 'Last 7 days',  from: daysAgo(7),     to: daysAgo(0) },
  { label: 'Last 30 days', from: daysAgo(30),    to: daysAgo(0) },
  { label: 'Last 3 months',from: daysAgo(90),    to: daysAgo(0) },
];

function Chip({ label, onRemove }) {
  return (
    <span className="filter-chip">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`}><X size={11} /></button>
    </span>
  );
}

function RowSkeleton() {
  return (
    <div className="history-row" style={{ cursor: 'default', gap: 'var(--space-4)' }}>
      <div className="skeleton" style={{ height: 16, width: '45%', margin: '4px 0' }} />
      <div className="skeleton" style={{ height: 12, width: '30%' }} />
    </div>
  );
}

export default function HistoryPage() {
  const [allSessions, setAllSessions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const [panelOpen,  setPanelOpen]  = useState(false);
  const [difficulty, setDifficulty] = useState('');
  const [scoreRange, setScoreRange] = useState(SCORE_RANGES[0]);
  const [sortBy,     setSortBy]     = useState('date_desc');
  const [roleFilter, setRoleFilter] = useState('');
  // Date range: ISO date strings 'YYYY-MM-DD' or '' for no bound
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [datePreset, setDatePreset] = useState('All time');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await sessionsApi.list({ limit: 100 });
      setAllSessions(data.sessions || []);
    } catch (e) {
      setError(e.message || 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Compute available roles from actual data
  const allRoles = useMemo(() => [...new Set(allSessions.map((s) => s.role).filter(Boolean))], [allSessions]);

  // Helpers for applying date presets
  const applyPreset = useCallback((preset) => {
    setDatePreset(preset.label);
    setDateFrom(preset.from);
    setDateTo(preset.to);
  }, []);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...allSessions];
    if (difficulty) list = list.filter((s) => s.difficulty === difficulty);
    if (roleFilter) list = list.filter((s) => s.role === roleFilter);
    list = list.filter((s) =>
      s.scores?.overall == null
        ? scoreRange.min === 0
        : s.scores.overall >= scoreRange.min && s.scores.overall <= scoreRange.max
    );
    // Date range filter — compare YYYY-MM-DD string of session date
    if (dateFrom || dateTo) {
      list = list.filter((s) => {
        if (!s.startedAt) return true;
        const sDate = new Date(s.startedAt * 1000).toISOString().slice(0, 10);
        if (dateFrom && sDate < dateFrom) return false;
        if (dateTo   && sDate > dateTo)   return false;
        return true;
      });
    }
    list.sort((a, b) => {
      if (sortBy === 'date_desc')  return (b.startedAt ?? 0) - (a.startedAt ?? 0);
      if (sortBy === 'date_asc')   return (a.startedAt ?? 0) - (b.startedAt ?? 0);
      if (sortBy === 'score_desc') return (b.scores?.overall ?? -1) - (a.scores?.overall ?? -1);
      if (sortBy === 'score_asc')  return (a.scores?.overall ?? 999) - (b.scores?.overall ?? 999);
      return 0;
    });
    return list;
  }, [allSessions, difficulty, roleFilter, scoreRange, sortBy, dateFrom, dateTo]);

  const clearDateRange = useCallback(() => {
    setDateFrom(''); setDateTo(''); setDatePreset('All time');
  }, []);

  const hasDateFilter = dateFrom !== '' || dateTo !== '';
  const dateLabelShort = hasDateFilter
    ? (datePreset !== 'All time' && datePreset !== ''
        ? datePreset
        : `${dateFrom || '…'} → ${dateTo || '…'}`)
    : null;

  const activeFilters = [
    difficulty && { key: 'diff',  label: difficulty,             clear: () => setDifficulty('') },
    roleFilter && { key: 'role',  label: roleFilter,             clear: () => setRoleFilter('') },
    (scoreRange.min !== 0 || scoreRange.max !== 100) && {
      key: 'score', label: `Score: ${scoreRange.label}`,
      clear: () => setScoreRange(SCORE_RANGES[0]),
    },
    hasDateFilter && {
      key: 'date', label: `📅 ${dateLabelShort}`,
      clear: clearDateRange,
    },
  ].filter(Boolean);

  const clearAll = () => {
    setDifficulty('');
    setRoleFilter('');
    setScoreRange(SCORE_RANGES[0]);
    setSortBy('date_desc');
    clearDateRange();
  };

  return (
    <div className="placeholder-page history-page" id="history-page">
      {/* Header */}
      <div className="placeholder-page__header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h2 className="placeholder-page__title">Interview History</h2>
            <p className="placeholder-page__subtitle">
              {loading ? 'Loading…' : `${filtered.length} of ${allSessions.length} sessions`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchHistory} disabled={loading}
              title="Refresh" id="history-refresh">
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <div className="history-sort">
              <select id="history-sort-select" className="history-sort__select"
                value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort interviews">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={14} className="history-sort__icon" />
            </div>
            <button className={`btn btn-secondary btn-sm ${panelOpen ? 'btn-active' : ''}`}
              id="history-filter-btn" onClick={() => setPanelOpen((p) => !p)}
              aria-expanded={panelOpen} aria-controls="history-filter-panel">
              <Filter size={14} /> Filter
              {activeFilters.length > 0 && <span className="filter-count-badge">{activeFilters.length}</span>}
            </button>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="filter-chips" role="list" aria-label="Active filters">
            {activeFilters.map((f) => <Chip key={f.key} label={f.label} onRemove={f.clear} />)}
            <button className="filter-clear-all btn btn-ghost btn-sm" onClick={clearAll}>Clear all</button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', padding:'var(--space-3) var(--space-4)', background:'var(--error-50)', color:'var(--error-600)', borderRadius:'var(--radius-lg)', fontSize:'var(--text-sm)' }}>
          <AlertCircle size={15} /> {error}
          <button className="btn btn-ghost btn-sm" onClick={fetchHistory} style={{ marginLeft:'auto' }}>Retry</button>
        </div>
      )}

      {/* Filter panel */}
      {panelOpen && (
        <div className="filter-panel card" id="history-filter-panel" role="region" aria-label="Filter options">
          {/* Top row: Role / Difficulty / Score */}
          <div className="filter-panel__grid">
            {/* Role */}
            <div className="filter-panel__group">
              <p className="filter-panel__label">Role</p>
              <div className="filter-panel__options">
                <button className={`filter-option-btn ${roleFilter === '' ? 'filter-option-btn--active' : ''}`}
                  id="filter-role-all" onClick={() => setRoleFilter('')}>All</button>
                {allRoles.map((r) => (
                  <button key={r} id={`filter-role-${r.replace(/\s+/g,'-').toLowerCase()}`}
                    className={`filter-option-btn ${roleFilter === r ? 'filter-option-btn--active' : ''}`}
                    onClick={() => setRoleFilter(r === roleFilter ? '' : r)}>{r}</button>
                ))}
              </div>
            </div>
            {/* Difficulty */}
            <div className="filter-panel__group">
              <p className="filter-panel__label">Difficulty</p>
              <div className="filter-panel__options">
                <button className={`filter-option-btn ${difficulty === '' ? 'filter-option-btn--active' : ''}`}
                  id="filter-diff-all" onClick={() => setDifficulty('')}>All</button>
                {ALL_DIFFICULTIES.map((d) => (
                  <button key={d} id={`filter-diff-${d.toLowerCase()}`}
                    className={`filter-option-btn ${difficulty === d ? 'filter-option-btn--active' : ''}`}
                    onClick={() => setDifficulty(d === difficulty ? '' : d)}>{d}</button>
                ))}
              </div>
            </div>
            {/* Score */}
            <div className="filter-panel__group">
              <p className="filter-panel__label">Score Range</p>
              <div className="filter-panel__options">
                {SCORE_RANGES.map((r) => (
                  <button key={r.label}
                    id={`filter-score-${r.label.replace(/\s+/g,'-').toLowerCase()}`}
                    className={`filter-option-btn ${scoreRange.label === r.label ? 'filter-option-btn--active' : ''}`}
                    onClick={() => setScoreRange(r)}>{r.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Range — full-width section */}
          <div className="filter-panel__date-row">
            <div className="filter-panel__group filter-panel__group--date">
              <p className="filter-panel__label"><Calendar size={11} style={{ marginRight: 4 }} />Date Range</p>
              {/* Preset quick-picks */}
              <div className="filter-panel__options" style={{ marginBottom: 'var(--space-3)' }}>
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    id={`filter-date-${p.label.replace(/\s+/g, '-').toLowerCase()}`}
                    className={`filter-option-btn ${datePreset === p.label ? 'filter-option-btn--active' : ''}`}
                    onClick={() => applyPreset(p)}
                  >{p.label}</button>
                ))}
              </div>
              {/* Custom range inputs */}
              <div className="date-range-inputs">
                <div className="date-range-input-group">
                  <label htmlFor="filter-date-from" className="date-range-input-label">From</label>
                  <input
                    id="filter-date-from"
                    type="date"
                    className="date-range-input"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => { setDateFrom(e.target.value); setDatePreset('Custom'); }}
                  />
                </div>
                <span className="date-range-sep">→</span>
                <div className="date-range-input-group">
                  <label htmlFor="filter-date-to" className="date-range-input-label">To</label>
                  <input
                    id="filter-date-to"
                    type="date"
                    className="date-range-input"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => { setDateTo(e.target.value); setDatePreset('Custom'); }}
                  />
                </div>
                {hasDateFilter && (
                  <button className="date-range-clear" onClick={clearDateRange} title="Clear date range" id="filter-date-clear">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="filter-panel__footer">
            <button className="btn btn-ghost btn-sm" onClick={clearAll} id="filter-clear-btn">Reset</button>
            <button className="btn btn-primary btn-sm" onClick={() => setPanelOpen(false)} id="filter-apply-btn">
              Apply ({filtered.length} results)
            </button>
          </div>
        </div>
      )}


      {/* List */}
      {loading ? (
        <div className="history-list card">
          {[1,2,3].map((i) => <RowSkeleton key={i} />)}
        </div>
      ) : !allSessions.length ? (
        <div className="card history-empty" style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--navy-400)' }}>
          <Mic size={40} style={{ opacity: 0.25, marginBottom: 'var(--space-4)' }} />
          <p style={{ marginBottom: 'var(--space-2)', fontWeight: 600 }}>No interview history yet.</p>
          <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
            Complete your first interview to see it listed here.
          </p>
          <Link to="/interview/setup" className="btn btn-primary btn-sm" id="history-start-first">
            <Mic size={14} /> Start Interview
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card history-empty">
          <p>No interviews match your filters.</p>
          <button className="btn btn-secondary btn-sm" onClick={clearAll}>Clear filters</button>
        </div>
      ) : (
        <div className="history-list card">
          {filtered.map((session) => {
            const score = session.scores?.overall;
            const g = score != null ? getScoreGrade(score) : null;
            const date = session.startedAt
              ? formatDate(new Date(session.startedAt * 1000).toISOString())
              : '—';
            return (
              <Link key={session.id} to={`/report/${session.id}`}
                id={`history-interview-${session.id}`} className="history-row">
                <div className="history-row__info">
                  <h3 className="history-row__role">{session.role ?? 'Interview'}</h3>
                  <div className="history-row__meta">
                    <span><Clock size={11} /> {date}</span>
                    {session.durationSec && <span>{formatDuration(Math.round(session.durationSec / 60))}</span>}
                    {session.questionsAsked > 0 && <span>{session.questionsAsked} questions</span>}
                    {session.difficulty && (
                      <span className="badge" style={{
                        background: session.difficulty === 'Hard' ? 'var(--error-50)' : 'var(--warning-50)',
                        color: session.difficulty === 'Hard' ? 'var(--error-600)' : 'var(--warning-600)',
                      }}>{session.difficulty}</span>
                    )}
                    <span className="badge" style={{
                      background: session.status === 'completed' ? 'var(--success-50)' : 'var(--navy-100)',
                      color: session.status === 'completed' ? 'var(--success-600)' : 'var(--navy-500)',
                    }}>{session.status}</span>
                  </div>
                </div>
                <div className="history-row__right">
                  <div className="history-row__score" style={{ color: g?.color ?? 'var(--navy-300)' }}>
                    <span className="history-row__score-val">{score ?? '—'}</span>
                    <span className="history-row__score-grade">{g?.label ?? 'Pending'}</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" id={`history-report-${session.id}`}
                    onClick={(e) => e.preventDefault()}>
                    <BarChart3 size={13} /> Report <ArrowRight size={12} />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
