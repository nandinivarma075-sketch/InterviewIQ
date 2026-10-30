'use strict';

const express = require('express');
const { db } = require('../models/db');
const { requireAuth } = require('../middleware/auth.middleware');
const { parseResumeText, generateResumeTailoredQuestions } = require('../services/resume.service');

const router = express.Router();
router.use(requireAuth);

/**
 * POST /api/resume/parse
 * Parse resume text, extract skills, projects, seniority, and generate tailored questions
 */
router.post('/parse', (req, res) => {
  try {
    const { resumeText = '' } = req.body ?? {};

    const parsed = parseResumeText(resumeText);
    const sampleQuestions = generateResumeTailoredQuestions(parsed, 'Software Engineer', 3);

    // Save to user profile in db if resume data is valid
    try {
      db().run(
        'UPDATE users SET resume_data = ? WHERE id = ?',
        JSON.stringify(parsed),
        req.user.id
      );
    } catch (e) {
      console.warn('[ResumeRoutes] Failed to persist resume_data:', e.message);
    }

    res.json({
      parsed,
      sampleQuestions,
      message: 'Resume parsed and project deep-dive questions generated successfully',
    });
  } catch (err) {
    console.error('[POST /api/resume/parse]', err);
    res.status(500).json({ error: 'Failed to parse resume.' });
  }
});

/**
 * GET /api/resume
 * Retrieve stored resume for authenticated user
 */
router.get('/', (req, res) => {
  try {
    const row = db().get('SELECT resume_data FROM users WHERE id = ?', req.user.id);
    let parsed = null;
    if (row?.resume_data) {
      try { parsed = JSON.parse(row.resume_data); } catch {}
    }
    res.json({ resume: parsed });
  } catch (err) {
    console.error('[GET /api/resume]', err);
    res.status(500).json({ error: 'Failed to retrieve resume.' });
  }
});

module.exports = router;
