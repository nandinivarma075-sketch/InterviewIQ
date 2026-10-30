/**
 * api.js — Centralised API client for InterviewIQ
 *
 * All communication with the backend goes through this module.
 * Token is stored in localStorage and attached automatically.
 */

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');

/** Get stored auth token */
function getToken() {
  try { return localStorage.getItem('interviewiq_token'); } catch { return null; }
}

/** Store auth token */
export function setToken(token) {
  try { localStorage.setItem('interviewiq_token', token); } catch {}
}

/** Clear auth token */
export function clearToken() {
  try { localStorage.removeItem('interviewiq_token'); } catch {}
}

/** Check if user appears to be authenticated */
export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Core fetch wrapper — attaches Bearer token, parses JSON,
 * and throws a descriptive Error on non-2xx responses.
 */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // No body on 204
  if (resp.status === 204) return null;

  const data = await resp.json();
  if (!resp.ok) {
    const msg = data?.error || `Request failed (${resp.status})`;
    throw new Error(msg);
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  register: (name, email, password) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => apiFetch('/auth/me'),

  health: () => apiFetch('/health'),
};

// ── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = {
  create: (role, difficulty, interviewType = 'mixed', questionsTotal = 4) =>
    apiFetch('/sessions', { method: 'POST', body: JSON.stringify({ role, difficulty, interviewType, questionsTotal }) }),

  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/sessions${q ? '?' + q : ''}`);
  },

  get: (id) => apiFetch(`/sessions/${id}`),

  end: (id, payload) =>
    apiFetch(`/sessions/${id}/end`, { method: 'PATCH', body: JSON.stringify(payload) }),

  interrupt: (id) =>
    apiFetch(`/sessions/${id}/interrupt`, { method: 'PATCH', body: JSON.stringify({}) }),

  addObservations: (sessionId, observations) =>
    apiFetch(`/sessions/${sessionId}/observations`, {
      method: 'POST',
      body: JSON.stringify(observations),
    }),

  getObservations: (sessionId) =>
    apiFetch(`/sessions/${sessionId}/observations`),

  // ── Dynamic question generation ──────────────────────────────────────────────

  /**
   * Generate dynamic role-specific questions for a session.
   * Idempotent: returns existing questions if already generated.
   * @param {string} sessionId
   * @param {{ role, difficulty, interviewType, count }} options
   */
  generateQuestions: (sessionId, options = {}) =>
    apiFetch(`/sessions/${sessionId}/generate-questions`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),

  // ── Per-question state tracking ─────────────────────────────────────────────

  /**
   * Mark a question as PRESENTED (called when the question is shown on-screen).
   * Idempotent: safe to call multiple times for the same question index.
   */
  presentQuestion: (sessionId, questionIndex, questionMeta = {}) =>
    apiFetch(`/sessions/${sessionId}/questions/${questionIndex}`, {
      method: 'POST',
      body: JSON.stringify(questionMeta),
    }),

  /**
   * Submit or update the state and transcript for one question.
   */
  submitAnswer: (sessionId, questionIndex, payload) =>
    apiFetch(`/sessions/${sessionId}/questions/${questionIndex}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /** Retrieve all question_answer records for a session. */
  getQuestions: (sessionId) =>
    apiFetch(`/sessions/${sessionId}/questions`),
};


// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboard = {
  stats:  () => apiFetch('/dashboard/stats'),
  trend:  () => apiFetch('/dashboard/trend'),
  recent: (limit = 5) => apiFetch(`/dashboard/recent?limit=${limit}`),
  streak: () => apiFetch('/dashboard/streak'),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reports = {
  get: (period = '30d', from, to) => {
    const params = new URLSearchParams({ period });
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    return apiFetch(`/reports?${params.toString()}`);
  },
  getSession: (sessionId) => apiFetch(`/reports/${sessionId}`),
};

// ── Resume ────────────────────────────────────────────────────────────────────
export const resume = {
  parse: (resumeText) =>
    apiFetch('/resume/parse', {
      method: 'POST',
      body: JSON.stringify({ resumeText }),
    }),
  get: () => apiFetch('/resume'),
};

