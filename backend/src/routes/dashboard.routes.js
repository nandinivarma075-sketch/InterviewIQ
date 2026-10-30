/**
 * dashboard.routes.js — /api/dashboard
 */
'use strict';

const express = require('express');
const { db }  = require('../models/db');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  try {
    const uid = req.user.id;

    // Clean up empty ghost sessions (in_progress with 0 answers)
    db().run(`DELETE FROM sessions WHERE user_id = ? AND status = 'in_progress' AND (questions_answered = 0 OR questions_answered IS NULL)`, uid);

    const completed   = db().get(`SELECT COUNT(*) as c FROM sessions WHERE user_id = ? AND status = 'completed'`, uid).c;
    const total       = completed;
    const interrupted = db().get(`SELECT COUNT(*) as c FROM sessions WHERE user_id = ? AND status = 'interrupted'`, uid).c;
    const avgRow      = db().get(`SELECT AVG(score_overall) as avg FROM sessions WHERE user_id = ? AND status = 'completed' AND score_overall IS NOT NULL`, uid);
    const bestRow     = db().get(`SELECT MAX(score_overall) as best, role FROM sessions WHERE user_id = ? AND status = 'completed' AND score_overall IS NOT NULL`, uid);
    const durRow      = db().get(`SELECT SUM(duration_sec) as total FROM sessions WHERE user_id = ? AND duration_sec IS NOT NULL AND status = 'completed'`, uid);

    const gazeSummary    = db().all(`SELECT gaze as label, COUNT(*) as count FROM observations WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ? AND status = 'completed') GROUP BY gaze ORDER BY count DESC`, uid);
    const postureSummary = db().all(`SELECT posture as label, COUNT(*) as count FROM observations WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ? AND status = 'completed') GROUP BY posture ORDER BY count DESC`, uid);
    const gestureSummary = db().all(`SELECT gesture as label, COUNT(*) as count FROM observations WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ? AND status = 'completed') GROUP BY gesture ORDER BY count DESC`, uid);

    return res.json({
      total, completed, interrupted,
      averageScore:     avgRow?.avg != null ? Math.round(avgRow.avg) : null,
      bestScore:        bestRow?.best ?? null,
      bestScoreRole:    bestRow?.role ?? null,
      totalDurationSec: durRow?.total ?? 0,
      gazeSummary, postureSummary, gestureSummary,
    });
  } catch (err) {
    console.error('[GET /dashboard/stats]', err);
    return res.status(500).json({ error: 'Could not retrieve stats.' });
  }
});

// GET /api/dashboard/trend — monthly avg score, last 6 months, real data only
router.get('/trend', (req, res) => {
  try {
    const uid  = req.user.id;
    const rows = db().all(`
      SELECT
        strftime('%Y-%m', datetime(started_at, 'unixepoch')) as month,
        ROUND(AVG(score_overall)) as avg_score,
        COUNT(*) as count
      FROM sessions
      WHERE user_id = ? AND status = 'completed' AND score_overall IS NOT NULL
        AND started_at >= strftime('%s', 'now', '-6 months')
      GROUP BY month ORDER BY month ASC
    `, uid);

    const trend = rows.map((r) => {
      const [year, mon] = r.month.split('-');
      const label = new Date(Number(year), Number(mon) - 1, 1)
        .toLocaleString('en-US', { month: 'short' });
      return { month: label, yearMonth: r.month, score: r.avg_score, count: r.count };
    });

    return res.json({ trend });
  } catch (err) {
    console.error('[GET /dashboard/trend]', err);
    return res.status(500).json({ error: 'Could not retrieve trend.' });
  }
});

// GET /api/dashboard/recent
router.get('/recent', (req, res) => {
  try {
    const uid   = req.user.id;
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const rows  = db().all(`SELECT * FROM sessions WHERE user_id = ? AND status = 'completed' ORDER BY started_at DESC LIMIT ?`, uid, limit);
    const sessions = rows.map((r) => ({
      id: r.id, role: r.role, difficulty: r.difficulty, status: r.status,
      startedAt: r.started_at, endedAt: r.ended_at, durationSec: r.duration_sec,
      questionsAsked: r.questions_asked, scoreOverall: r.score_overall,
    }));
    return res.json({ sessions });
  } catch (err) {
    console.error('[GET /dashboard/recent]', err);
    return res.status(500).json({ error: 'Could not retrieve recent sessions.' });
  }
});

// GET /api/dashboard/streak — real streak from activity table only
router.get('/streak', (req, res) => {
  try {
    const uid   = req.user.id;
    const dates = db().all('SELECT event_date FROM activity WHERE user_id = ? ORDER BY event_date DESC', uid)
                      .map((r) => r.event_date);

    if (!dates.length) return res.json({ current: 0, longest: 0, lastActivity: null });

    const todayStr     = new Date().toISOString().slice(0, 10);
    const yd = new Date(); yd.setUTCDate(yd.getUTCDate() - 1);
    const yesterdayStr = yd.toISOString().slice(0, 10);

    let current = 0;
    if (dates[0] === todayStr || dates[0] === yesterdayStr) {
      let check = new Date(dates[0] + 'T00:00:00Z');
      for (const d of dates) {
        if (d === check.toISOString().slice(0, 10)) {
          current++;
          check.setUTCDate(check.getUTCDate() - 1);
        } else break;
      }
    }

    const asc = [...dates].reverse();
    let longest = 0, run = 1;
    for (let i = 1; i < asc.length; i++) {
      const diff = (new Date(asc[i] + 'T00:00:00Z') - new Date(asc[i-1] + 'T00:00:00Z')) / 86400000;
      if (diff === 1) run++;
      else { longest = Math.max(longest, run); run = 1; }
    }
    longest = Math.max(longest, run, current);

    return res.json({ current, longest, lastActivity: dates[0] });
  } catch (err) {
    console.error('[GET /dashboard/streak]', err);
    return res.status(500).json({ error: 'Could not calculate streak.' });
  }
});

module.exports = router;
