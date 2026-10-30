/**
 * InterviewContext – shared state for the interview flow
 *
 * Holds: selectedRole, difficulty, duration, interviewType, questionCount, uploadedFile
 * Persisted to sessionStorage so selections survive HMR / soft refreshes.
 */

import { createContext, useContext, useState } from 'react';

const InterviewContext = createContext(null);

const SESSION_KEY = 'interviewiq_flow';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSession(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export const INTERVIEW_TYPES = [
  { id: 'mixed',    label: 'Mixed (Recommended)',    description: 'Technical, behavioral, scenario, resume questions' },
  { id: 'technical',label: 'Technical Deep Dive',    description: 'Heavy focus on coding, algorithms, system design' },
  { id: 'behavioral',label: 'Behavioral / HR',       description: 'Situational, competency-based questions' },
  { id: 'hr',       label: 'HR Interview',           description: 'People, culture, motivation, and career-focused questions' },
  { id: 'resume',   label: 'Resume Based',           description: 'Questions derived from your resume and experience' },
  { id: 'scenario', label: 'Scenario Based',         description: 'Realistic workplace problem-solving situations' },
  { id: 'coding',   label: 'Coding Focused',         description: 'Algorithms, data structures, system design' },
];


export const QUESTION_COUNT_OPTIONS = [4, 6, 8, 10, 12];

export function InterviewProvider({ children }) {
  const saved = loadSession();

  // Migration guard: old code stored role.label (e.g. "Frontend Engineer").
  // New code stores role.id (e.g. "fe"). If the stored value contains a space
  // or isn't a short ID, it's stale — reset to null so the user re-selects.
  const VALID_ROLE_IDS = new Set(['fe','be','fs','ds','de','ml','pm','ui']);
  const storedRole = saved.selectedRole;
  const sanitizedRole = storedRole && VALID_ROLE_IDS.has(storedRole) ? storedRole : null;

  const [selectedRole,   setSelectedRole]   = useState(sanitizedRole);
  const [difficulty,     setDifficulty]     = useState(saved.difficulty     ?? 'Medium');
  const [duration,       setDuration]       = useState(saved.duration       ?? 30);
  const [interviewType,  setInterviewType]  = useState(saved.interviewType  ?? 'mixed');
  const [questionCount,  setQuestionCount]  = useState(saved.questionCount  ?? 4);
  const [uploadedFile,   setUploadedFile]   = useState(saved.uploadedFile   ?? null);
  const [parsedResume,   setParsedResume]   = useState(saved.parsedResume   ?? null);


  /** Wrap setters to also persist to sessionStorage */
  const updateRole = (role) => {
    setSelectedRole(role);
    saveSession({ ...loadSession(), selectedRole: role });
  };

  const updateDifficulty = (d) => {
    setDifficulty(d);
    saveSession({ ...loadSession(), difficulty: d });
  };

  const updateDuration = (d) => {
    setDuration(d);
    saveSession({ ...loadSession(), duration: d });
  };

  const updateInterviewType = (t) => {
    setInterviewType(t);
    saveSession({ ...loadSession(), interviewType: t });
  };

  const updateQuestionCount = (n) => {
    setQuestionCount(n);
    saveSession({ ...loadSession(), questionCount: n });
  };

  const updateFile = (f) => {
    // Store only serializable metadata (not the File object itself)
    const meta = f ? { name: f.name, size: f.size, type: f.type } : null;
    setUploadedFile(f);
    saveSession({ ...loadSession(), uploadedFile: meta });
  };

  const updateParsedResume = (data) => {
    setParsedResume(data);
    saveSession({ ...loadSession(), parsedResume: data });
  };

  const resetFlow = () => {
    setSelectedRole(null);
    setDifficulty('Medium');
    setDuration(30);
    setInterviewType('mixed');
    setQuestionCount(4);
    setUploadedFile(null);
    setParsedResume(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <InterviewContext.Provider value={{
      selectedRole,   updateRole,
      difficulty,     updateDifficulty,
      duration,       updateDuration,
      interviewType,  updateInterviewType,
      questionCount,  updateQuestionCount,
      uploadedFile,   updateFile,
      parsedResume,   updateParsedResume,
      resetFlow,
    }}>
      {children}
    </InterviewContext.Provider>
  );
}

/** Convenience hook */
export function useInterview() {
  const ctx = useContext(InterviewContext);
  if (!ctx) throw new Error('useInterview must be used inside InterviewProvider');
  return ctx;
}
