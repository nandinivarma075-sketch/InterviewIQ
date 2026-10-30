import { useNavigate } from 'react-router-dom';
import { Mic, Clock, ArrowRight, Sliders, Hash, Briefcase } from 'lucide-react';
import { jobRoles } from '../data/mockData';
import { useInterview, INTERVIEW_TYPES, QUESTION_COUNT_OPTIONS } from '../context/InterviewContext';
import './PlaceholderPage.css';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DURATIONS    = [15, 30, 45, 60];

export default function InterviewSetupPage() {
  const navigate = useNavigate();
  const {
    selectedRole,
    difficulty,     updateDifficulty,
    duration,       updateDuration,
    interviewType,  updateInterviewType,
    questionCount,  updateQuestionCount,
  } = useInterview();

  // Resolve role label from the stored role id
  const roleLabel = jobRoles.find(r => r.id === selectedRole)?.label ?? 'Not selected';
  const selectedTypeLabel = INTERVIEW_TYPES.find(t => t.id === interviewType)?.label ?? 'Mixed';

  return (
    <div className="placeholder-page" id="interview-setup-page">
      <div className="placeholder-page__header">
        <h2 className="placeholder-page__title">Interview Setup</h2>
        <p className="placeholder-page__subtitle">
          Configure your interview preferences before starting.
        </p>
      </div>

      <div className="setup-grid">
        {/* Interview Type */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--navy-700)' }}>
              <Briefcase size={18} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Interview Type</h3>
            </div>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            {INTERVIEW_TYPES.map((t) => (
              <button
                key={t.id}
                id={`setup-type-${t.id}`}
                onClick={() => updateInterviewType(t.id)}
                style={{
                  textAlign: 'left',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  border: interviewType === t.id
                    ? '2px solid var(--purple-500)'
                    : '2px solid var(--navy-100)',
                  background: interviewType === t.id ? 'var(--purple-50)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <p style={{
                  fontSize: 'var(--text-sm)', fontWeight: 600,
                  color: interviewType === t.id ? 'var(--purple-700)' : 'var(--navy-700)',
                  marginBottom: 4,
                }}>
                  {t.label}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-400)', lineHeight: 1.4 }}>
                  {t.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--navy-700)' }}>
              <Sliders size={18} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Difficulty Level</h3>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                id={`setup-difficulty-${d.toLowerCase()}`}
                className={`btn ${difficulty === d ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Questions */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--navy-700)' }}>
              <Hash size={18} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Number of Questions</h3>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {QUESTION_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                id={`setup-questions-${n}`}
                className={`btn ${questionCount === n ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateQuestionCount(n)}
              >
                {n} Q
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--navy-700)' }}>
              <Clock size={18} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Duration</h3>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {DURATIONS.map((d) => (
              <button
                key={d}
                id={`setup-duration-${d}`}
                className={`btn ${duration === d ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateDuration(d)}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-400)', marginBottom: 2 }}>Role</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy-800)' }}>{roleLabel}</p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-400)', marginBottom: 2 }}>Type</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy-800)' }}>{selectedTypeLabel}</p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-400)', marginBottom: 2 }}>Difficulty</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy-800)' }}>{difficulty}</p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-400)', marginBottom: 2 }}>Questions</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy-800)' }}>{questionCount}</p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-400)', marginBottom: 2 }}>Duration</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--navy-800)' }}>{duration} minutes</p>
                </div>
              </div>
              <button
                id="setup-start-btn"
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/interview/live')}
              >
                <Mic size={16} /> Start Interview <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
