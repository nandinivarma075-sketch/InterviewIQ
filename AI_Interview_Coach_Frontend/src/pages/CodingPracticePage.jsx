import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Code2, Play, Terminal, Cpu, HardDrive, Sparkles,
  ArrowRight, CheckCircle2, ChevronRight, Mic, Shuffle,
  Briefcase, Building2, FileText, RefreshCw, Zap,
} from 'lucide-react';
import CodingSandbox from '../components/CodingSandbox';
import { CODING_PROBLEMS_CATALOG, getDynamicProblems } from '../data/codingProblems';
import { useInterview } from '../context/InterviewContext';
import './PlaceholderPage.css';

const ROLES = [
  { id: 'all', label: 'All Tech Roles' },
  { id: 'be', label: 'Backend Engineer (Java / Python / C#)' },
  { id: 'systems', label: 'Systems & Embedded (C / Low-Level)' },
  { id: 'fs', label: 'Full Stack Engineer' },
  { id: 'fe', label: 'Frontend Engineer' },
  { id: 'cloud', label: 'Cloud & Distributed Systems' },
  { id: 'fintech', label: 'Fintech & Quant Engineering' },
];

const COMPANIES = [
  { id: 'all', label: 'All Companies / Standard' },
  { id: 'Google', label: 'Google (Algorithms & Deep DP)' },
  { id: 'Amazon', label: 'Amazon (Intervals & Scale)' },
  { id: 'Microsoft', label: 'Microsoft (Enterprise & OOP)' },
  { id: 'Meta', label: 'Meta (Two-Pointers & Trees)' },
  { id: 'Apple', label: 'Apple (Bitwise & Systems)' },
  { id: 'Fintech', label: 'Fintech / Hedge Funds (Low Latency)' },
];

export default function CodingPracticePage() {
  const { parsedResume } = useInterview();

  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [useResumeSkills, setUseResumeSkills] = useState(false);
  const [randomSeed, setRandomSeed] = useState(0);

  // Resume skills array if available
  const resumeSkills = useMemo(() => {
    if (!parsedResume) return [];
    const skills = [];
    if (Array.isArray(parsedResume.skills)) skills.push(...parsedResume.skills);
    if (Array.isArray(parsedResume.techStack)) skills.push(...parsedResume.techStack);
    return skills;
  }, [parsedResume]);

  // Dynamically generated problem set
  const currentProblems = useMemo(() => {
    return getDynamicProblems({
      role: selectedRole,
      company: selectedCompany,
      resumeSkills: useResumeSkills ? resumeSkills : [],
      count: 5,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, selectedCompany, useResumeSkills, resumeSkills, randomSeed]);

  const [selectedProblem, setSelectedProblem] = useState(currentProblems[0] || CODING_PROBLEMS_CATALOG[0]);

  // Sync selected problem when problems list changes
  useEffect(() => {
    if (currentProblems.length > 0) {
      setSelectedProblem(currentProblems[0]);
    }
  }, [currentProblems]);

  const handleShuffle = () => {
    setRandomSeed(prev => prev + 1);
  };

  const handleToggleResume = () => {
    setUseResumeSkills(prev => !prev);
  };

  return (
    <div className="placeholder-page" id="coding-practice-page" style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div className="placeholder-page__header" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124, 58, 237, 0.1)', color: 'var(--purple-700)', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              <Code2 size={14} /> DYNAMIC LIVE CODING PLATFORM
            </div>
            <h2 className="placeholder-page__title" style={{ margin: 0 }}>
              Adaptive Coding Sandbox
            </h2>
            <p className="placeholder-page__subtitle" style={{ margin: '4px 0 0 0' }}>
              Coding challenges tailored dynamically by <strong>Job Role</strong>, <strong>Target Company</strong>, or <strong>Your Resume Tech Stack</strong>. Multi-language runner for Java, Python, C, C#, and JavaScript.
            </p>
          </div>

          <Link
            to="/interview/setup"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 'var(--radius-lg)' }}
          >
            <Mic size={16} /> Start Full Mock Interview <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Dynamic Filter Controls Strip */}
      <div className="card" style={{
        padding: '14px 18px',
        marginBottom: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        background: '#fff',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        {/* Role & Company Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* Role selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Briefcase size={14} style={{ color: 'var(--purple-600)' }} />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle, #cbd5e1)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--navy-800)',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Company selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} style={{ color: 'var(--purple-600)' }} />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle, #cbd5e1)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--navy-800)',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              {COMPANIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Resume Tailor toggle button */}
          <button
            type="button"
            className={`btn btn-sm ${useResumeSkills ? 'btn-primary' : 'btn-outline'}`}
            onClick={handleToggleResume}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              borderRadius: 6,
              background: useResumeSkills ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : undefined,
              borderColor: useResumeSkills ? 'transparent' : undefined,
            }}
          >
            <FileText size={13} /> {useResumeSkills ? '✓ Tailored to Resume' : '⚡ Tailor to My Resume'}
          </button>
        </div>

        {/* Shuffle / Randomize Button */}
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleShuffle}
            title="Generate a fresh randomized set of matching questions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--purple-700)',
              background: 'rgba(124, 58, 237, 0.08)',
              borderRadius: 6,
              padding: '6px 12px',
            }}
          >
            <Shuffle size={13} /> 🎲 Shuffle / Randomize Questions
          </button>
        </div>
      </div>

      {/* Tailoring Context Banner */}
      <div style={{
        padding: '8px 16px',
        marginBottom: 'var(--space-4)',
        background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.06), rgba(59, 130, 246, 0.06))',
        borderLeft: '3px solid var(--purple-600)',
        borderRadius: '0 8px 8px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        color: 'var(--navy-700)',
      }}>
        <span>
          <strong>Active Problem Suite:</strong> {selectedRole === 'all' ? 'Universal CS & Algorithms' : ROLES.find(r => r.id === selectedRole)?.label}
          {selectedCompany !== 'all' && ` · Target: ${selectedCompany}`}
          {useResumeSkills && resumeSkills.length > 0 && ` · Boosted by Resume Stack (${resumeSkills.slice(0, 3).join(', ')})`}
        </span>
        <span style={{ fontSize: 11, color: 'var(--navy-400)', fontWeight: 600 }}>
          {currentProblems.length} dynamic challenges loaded
        </span>
      </div>

      {/* Problem Selector Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}>
        {currentProblems.map((prob) => {
          const isSelected = selectedProblem.id === prob.id;
          return (
            <div
              key={prob.id}
              onClick={() => setSelectedProblem(prob)}
              style={{
                cursor: 'pointer',
                padding: 'var(--space-3) var(--space-4)',
                background: isSelected ? 'rgba(124, 58, 237, 0.08)' : '#fff',
                border: isSelected ? '2px solid var(--purple-500)' : '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: isSelected ? '0 4px 14px rgba(124, 58, 237, 0.15)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className={`badge ${prob.difficulty === 'Easy' ? 'badge-success' : prob.difficulty === 'Hard' ? 'badge-danger' : 'badge-purple'}`} style={{ fontSize: 10 }}>
                  {prob.difficulty}
                </span>
                <span style={{ fontSize: 10, color: 'var(--navy-400)', fontWeight: 600 }}>{prob.category}</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: isSelected ? 'var(--purple-700)' : 'var(--navy-800)', lineHeight: 1.3 }}>
                {prob.title}
              </div>
              {prob.companies && prob.companies.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--navy-500)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {prob.companies.slice(0, 2).map((comp) => (
                    <span key={comp} style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
                      {comp}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Problem Description Card */}
      <div className="card" style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--purple-600)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--navy-900)' }}>
            {selectedProblem.title}
          </div>
          <span style={{ fontSize: 11, color: 'var(--navy-400)' }}>
            Function name: <code>{selectedProblem.fnName || 'solution'}</code>
          </span>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-600)', margin: 0, lineHeight: 1.5 }}>
          {selectedProblem.prompt}
        </p>
      </div>

      {/* The Live Interactive Sandbox with Multi-Language Support */}
      <CodingSandbox
        key={selectedProblem.id}
        problemData={selectedProblem}
        questionText={selectedProblem.prompt}
      />
    </div>
  );
}
