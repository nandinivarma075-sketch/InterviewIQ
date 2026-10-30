/**
 * reports.routes.js — /api/reports
 */
'use strict';

const express = require('express');
const { db }  = require('../models/db');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

function dateRangeFromPeriod(period, from, to) {
  const now      = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const ts  = (d) => Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000);
  const tse = (d) => Math.floor(new Date(d + 'T23:59:59Z').getTime() / 1000);

  const ago = (days) => {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  };

  switch (period) {
    case 'today':      return { fromEpoch: ts(todayStr),  toEpoch: tse(todayStr),  label: 'Today' };
    case '7d':         return { fromEpoch: ts(ago(6)),    toEpoch: tse(todayStr),  label: 'Last 7 days' };
    case '30d':        return { fromEpoch: ts(ago(29)),   toEpoch: tse(todayStr),  label: 'Last 30 days' };
    case 'month': {
      const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-01`;
      return { fromEpoch: ts(start), toEpoch: tse(todayStr), label: 'Current month' };
    }
    case 'prev_month': {
      const pm   = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
      const last = new Date(now.getUTCFullYear(), now.getUTCMonth(), 0);
      return { fromEpoch: ts(pm.toISOString().slice(0,10)), toEpoch: tse(last.toISOString().slice(0,10)), label: 'Previous month' };
    }
    case '6m': {
      const d = new Date(now); d.setUTCMonth(d.getUTCMonth() - 6);
      return { fromEpoch: ts(d.toISOString().slice(0,10)), toEpoch: tse(todayStr), label: 'Last 6 months' };
    }
    case 'custom': {
      if (!from || !to) throw new Error('from and to are required for custom period');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
        throw new Error('from/to must be YYYY-MM-DD');
      return { fromEpoch: ts(from), toEpoch: tse(to), label: `${from} to ${to}` };
    }
    default: return { fromEpoch: ts(ago(29)), toEpoch: tse(todayStr), label: 'Last 30 days' };
  }
}

// GET /api/reports
router.get('/', (req, res) => {
  try {
    const { period = '30d', from, to } = req.query;
    const uid = req.user.id;
    let range;
    try { range = dateRangeFromPeriod(period, from, to); }
    catch (e) { return res.status(400).json({ error: e.message }); }

    const { fromEpoch, toEpoch, label } = range;

    const sessions = db().all(
      'SELECT * FROM sessions WHERE user_id = ? AND started_at >= ? AND started_at <= ? ORDER BY started_at ASC',
      uid, fromEpoch, toEpoch
    );

    if (!sessions.length) {
      return res.json({
        period: label, fromEpoch, toEpoch, isEmpty: true,
        message: 'No data available for the selected period. Complete an interview to generate your first report.',
      });
    }

    const completed   = sessions.filter((s) => s.status === 'completed');
    const interrupted = sessions.filter((s) => s.status === 'interrupted');
    const scored      = completed.filter((s) => s.score_overall != null);
    const avgScore    = scored.length ? Math.round(scored.reduce((a,s)=>a+s.score_overall,0)/scored.length) : null;
    const bestScore   = scored.length ? Math.max(...scored.map((s)=>s.score_overall)) : null;
    const totalDur    = sessions.reduce((a,s)=>a+(s.duration_sec||0),0);

    const dailyMap = {};
    for (const s of sessions) {
      const day = new Date(s.started_at * 1000).toISOString().slice(0,10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, total: 0, completed: 0, scores: [] };
      dailyMap[day].total++;
      if (s.status === 'completed') { dailyMap[day].completed++; if (s.score_overall != null) dailyMap[day].scores.push(s.score_overall); }
    }
    const daily = Object.values(dailyMap).map((d) => ({
      date: d.date, total: d.total, completed: d.completed,
      avgScore: d.scores.length ? Math.round(d.scores.reduce((a,b)=>a+b,0)/d.scores.length) : null,
    })).sort((a,b)=>a.date.localeCompare(b.date));

    const ids = sessions.map((s) => `'${s.id}'`).join(',');
    const gazeSummary    = ids ? db().all(`SELECT gaze as label, COUNT(*) as count FROM observations WHERE session_id IN (${ids}) GROUP BY gaze ORDER BY count DESC`) : [];
    const postureSummary = ids ? db().all(`SELECT posture as label, COUNT(*) as count FROM observations WHERE session_id IN (${ids}) GROUP BY posture ORDER BY count DESC`) : [];
    const gestureSummary = ids ? db().all(`SELECT gesture as label, COUNT(*) as count FROM observations WHERE session_id IN (${ids}) GROUP BY gesture ORDER BY count DESC`) : [];

    const catAvg = (field) => { const v=completed.map(s=>s[field]).filter(v=>v!=null); return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null; };

    return res.json({
      period: label, fromEpoch, toEpoch, isEmpty: false,
      summary: { total: sessions.length, completed: completed.length, interrupted: interrupted.length, averageScore: avgScore, bestScore, totalDurationSec: totalDur },
      scores: { technical: catAvg('score_technical'), problemSolving: catAvg('score_problem_solving'), communication: catAvg('score_communication'), adaptability: catAvg('score_adaptability') },
      daily, gazeSummary, postureSummary, gestureSummary,
      sessions: sessions.map((s)=>({ id:s.id, role:s.role, difficulty:s.difficulty, status:s.status, startedAt:s.started_at, durationSec:s.duration_sec, scoreOverall:s.score_overall })),
    });
  } catch (err) {
    console.error('[GET /reports]', err);
    return res.status(500).json({ error: 'Could not generate report.' });
  }
});

// GET /api/reports/:sessionId
router.get('/:sessionId', (req, res) => {
  try {
    const session = db().get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', req.params.sessionId, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const observations = db().all('SELECT * FROM observations WHERE session_id = ? ORDER BY ts ASC', session.id);
    const count = (arr, field) => arr.reduce((m,o)=>{ m[o[field]]=(m[o[field]]||0)+1; return m; }, {});
    const toArr = (map) => Object.entries(map).map(([label,c])=>({label,count:c}));

    // ── Per-question answers ────────────────────────────────────────────────
    const questionRows = db().all(
      'SELECT * FROM question_answers WHERE session_id = ? ORDER BY question_index ASC',
      session.id
    );

    // Parse ai_feedback JSON safely
    const questions = questionRows.map((r) => ({
      id:                  r.id,
      sessionId:           r.session_id,
      questionIndex:       r.question_index,
      questionId:          r.question_id,
      questionText:        r.question_text,
      questionType:        r.question_type,
      questionDifficulty:  r.question_difficulty,
      state:               r.state,
      presentedAt:         r.presented_at,
      answerStartedAt:     r.answer_started_at,
      answerEndedAt:       r.answer_ended_at,
      answerDurationSec:   r.answer_duration_sec,
      transcriptVerbatim:  r.transcript_verbatim,
      transcriptReadable:  r.transcript_readable,
      wordCount:           r.word_count,
      transcriptStatus:    r.transcript_status,
      scores: {
        technical:     r.score_technical,
        relevance:     r.score_relevance,
        reasoning:     r.score_reasoning,
        communication: r.score_communication,
        examples:      r.score_examples,
        question:      r.score_question,
      },
      aiFeedback:         r.ai_feedback ? (() => { try { return JSON.parse(r.ai_feedback); } catch { return null; } })() : null,
      followUpQuestion:   r.follow_up_question ?? null,
      followUpAnswer:     r.follow_up_answer ?? null,
      followUpBonus:      r.follow_up_bonus ?? 0,
      codeSolution:       r.code_solution ?? null,
      codeResults:        r.code_results ? (() => { try { return JSON.parse(r.code_results); } catch { return r.code_results; } })() : null,
      evaluationStatus:   r.evaluation_status,
      rubricVersion:      r.rubric_version,
    }));

    // ── Attempt summary ────────────────────────────────────────────────────
    const ANSWERABLE = new Set(['ANSWERED', 'PARTIALLY_ANSWERED', 'EVALUATED']);
    const PRESENTED_SET = new Set([
      'PRESENTED','ANSWERING','ANSWERED','PARTIALLY_ANSWERED',
      'SKIPPED','TIMED_OUT','INTERRUPTED','NOT_ATTEMPTED','EVALUATED','EVALUATION_FAILED',
    ]);
    // FIX: read questions_total from session record (was hardcoded 4)
    const total = session.questions_total ?? 4;
    const attemptSummary = {
      totalConfigured:       total,
      totalPresented:        questionRows.filter((r) => PRESENTED_SET.has(r.state)).length,
      totalGenuinelyAnswered:questionRows.filter((r) => ANSWERABLE.has(r.state)).length,
      totalEvaluable:        questionRows.filter((r) => r.state === 'EVALUATED').length,
      totalPartiallyAnswered:questionRows.filter((r) => r.state === 'PARTIALLY_ANSWERED').length,
      totalSkipped:          questionRows.filter((r) => r.state === 'SKIPPED').length,
      totalTimedOut:         questionRows.filter((r) => r.state === 'TIMED_OUT').length,
      totalNotAttempted:     Math.max(0, total - questionRows.filter((r) => PRESENTED_SET.has(r.state)).length),
      totalAwaitingProcessing: questionRows.filter((r) => r.evaluation_status === 'PENDING' && ANSWERABLE.has(r.state)).length,
      totalEvaluationFailed: questionRows.filter((r) => r.state === 'EVALUATION_FAILED').length,
      completionRate:        questionRows.length > 0
        ? Math.round((questionRows.filter((r) => ANSWERABLE.has(r.state)).length / total) * 100)
        : (session.questions_asked > 0 ? Math.round((session.questions_asked / total) * 100) : 0),
      evidenceBased:         questionRows.length > 0,
    };

    return res.json({
      session: {
        id: session.id, role: session.role, difficulty: session.difficulty,
        interviewType: session.interview_type ?? 'mixed',
        questionsTotal: session.questions_total ?? 4,
        status: session.status,
        startedAt: session.started_at, endedAt: session.ended_at, durationSec: session.duration_sec,
        questionsAsked: session.questions_asked,
        questionsAnswered: session.questions_answered ?? null,
        transcript: session.transcript, aiSummary: session.ai_summary,
        scores: {
          overall: session.score_overall, technical: session.score_technical,
          problemSolving: session.score_problem_solving,
          communication: session.score_communication, adaptability: session.score_adaptability,
        },
      },
      observations: {
        total: observations.length,
        gaze:    toArr(count(observations, 'gaze')),
        posture: toArr(count(observations, 'posture')),
        gesture: toArr(count(observations, 'gesture')),
      },
      questions,
      attemptSummary,
    });
  } catch (err) {
    console.error('[GET /reports/:id]', err);
    return res.status(500).json({ error: 'Could not retrieve session report.' });
  }
});

module.exports = router;

