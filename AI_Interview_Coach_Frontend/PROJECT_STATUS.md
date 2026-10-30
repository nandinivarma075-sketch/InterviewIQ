# PROJECT_STATUS.md — InterviewIQ

**Last updated:** 2026-10-26
**Stack:** React 19 + Vite 8 (frontend) · Node.js + Express + sql.js / SQLite (backend)

---

## Architecture Overview

| Layer | Technology | URL |
|-------|-----------|-----|
| Frontend | React 19, Vite 8, React Router v7, Recharts 3 | http://localhost:5173 |
| Backend  | Node.js, Express 5, sql.js (SQLite WASM), JWT auth | http://localhost:4000 |
| Database | SQLite file at `backend/data/interviewiq.db` | — |

---

## Features — Status Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | COMPLETE | GSAP animations, hero, CTA |
| Auth (Register / Login) | COMPLETE | bcrypt, JWT 7-day tokens |
| Dashboard | COMPLETE | Stats, charts, streak, recent sessions |
| Resume Upload UI | COMPLETE | Drag-and-drop, stored in context |
| Role Selection | COMPLETE | 8 roles, tags, stored in context |
| Interview Setup | COMPLETE | Type, difficulty, question count, duration |
| Dynamic Question Generation | COMPLETE | Role-specific bank 200+ questions, category mix by interview type |
| Per-question state tracking | COMPLETE | NOT_STARTED to ANSWERED / SKIPPED / NOT_ATTEMPTED |
| Live Interview (Speech) | COMPLETE | Web Speech API, interim text, textarea fallback |
| Camera / CV Analysis | COMPLETE | MediaPipe local, gaze/posture/gesture, flushed to backend |
| Evidence-based scoring | COMPLETE | Score derived from actual answers only, 0 for no answers |
| Interview Completed Page | COMPLETE | Dynamic question count from session, correct coverage grid |
| Full Report Page | COMPLETE | Per-question breakdown, attempt summary, transcripts |
| History Page | COMPLETE | Filter by role/difficulty/score, sort |
| Profile Page | COMPLETE | Stats, radar chart, account info |
| Dark Mode | COMPLETE | Full CSS variable override, persisted |
| HR Interview Type | COMPLETE | Added to frontend; backend already supported it |

---

## Bug Fixes Applied (2026-10-26)

### Bug 1 — CRITICAL: Hardcoded TOTAL_QUESTIONS = 4 in InterviewCompletedPage

**File:** src/pages/InterviewCompletedPage.jsx
**Root cause:** const TOTAL_QUESTIONS = 4 was used for the coverage grid length (always 4 bubbles),
the "X of Y total" text, and qRemaining. Wrong for any non-4-question session.
**Fix:** Removed constant. Added resolvedTotal derived from attemptSummary.totalConfigured,
then session.questionsTotal, then questionRecords.length, then fallback 4.

### Bug 2 — CRITICAL: "48/100 with zero answers" default score

**File:** backend/src/routes/sessions.routes.js (autoScore)
**Root cause:** wordQuality started at 48, so even 0 words produced ~48 overall.
**Fix:** wordQuality = 0 when wordsPerQ === 0. Zero-answer sessions return all-zero scores.

### Bug 3 — MEDIUM: Question generation fallback fill-loop never ran

**File:** backend/src/routes/sessions.routes.js (generateQuestions)
**Root cause:** Break condition `selected.length >= selected.length + (n - got)` was always false.
**Fix:** Replaced with `filled / needed` counter.

### Bug 4 — MEDIUM: Double-submit race condition on skip

**File:** src/pages/LiveInterviewPage.jsx
**Root cause:** handleSkipQuestion called handleNextQuestion which re-called submitCurrentAnswer.
**Fix:** Extracted goToQuestion() helper. Skip now calls submitCurrentAnswer then goToQuestion directly.

### Bug 5 — LOW: Missing HR interview type in frontend

**File:** src/context/InterviewContext.jsx
**Root cause:** INTERVIEW_TYPES array lacked 'hr' despite backend supporting it.
**Fix:** Added hr entry with correct description.

---

## Question Generation Strategy

| Interview Type | Resume | Technical | Scenario | Behavioral |
|----------------|--------|-----------|----------|------------|
| mixed          | 25%    | 35%       | 20%      | 20%        |
| technical      | 10%    | 55%       | 20%      | 15%        |
| behavioral     | 10%    | 15%       | 15%      | 60%        |
| hr             | 5%     | 10%       | 15%      | 70%        |
| resume         | 50%    | 20%       | 15%      | 15%        |
| scenario       | 10%    | 20%       | 50%      | 20%        |
| coding         | 5%     | 65%       | 20%      | 10%        |

Deduplication: previously used question IDs tracked across last 3 sessions per user.
Idempotency: questions stored at session creation; refresh returns same set.

---

## Scoring Methodology

Zero-answer guarantee: if questionsAnswered === 0, ALL scores return 0.
Score based on: word quality (0-93), completion bonus (0-10), duration factor, camera bonus, difficulty multiplier.
Unanswered questions do not contribute to answer-quality scores.

---

## Tests Executed (2026-10-26)

All automated tests passed:
- 4-question session: 2 answered, 1 skipped, 1 not-attempted. Score=53, not 48.
- Zero-answer session: overall=0, technical=0, communication=0.
- Session variety: 0 question overlap between two sessions for same role.
- Idempotency: second generate-questions call returns identical question set.

---

## Known Remaining Limitations

- No LLM integration: questions from static bank only; resume not parsed for personalized questions.
- No per-question AI evaluation: evaluation_status stays PENDING.
- Resume file not uploaded to backend: resume-based questions use generic templates.
- History date-range filter not implemented.
- Forgot password is a placeholder.

---

## Running the Application

  Terminal 1 (Backend):
    cd d:\pp\backend
    npm install
    npm start

  Terminal 2 (Frontend):
    cd d:\pp\AI_Interview_Coach_Frontend
    npm install
    npm run dev
