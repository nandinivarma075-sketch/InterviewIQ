/**
 * server.js — InterviewIQ backend entry point
 */
'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { initDb } = require('./models/db');

const authRoutes      = require('./routes/auth.routes');
const sessionsRoutes  = require('./routes/sessions.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportsRoutes   = require('./routes/reports.routes');
const resumeRoutes    = require('./routes/resume.routes');

const app  = express();
const PORT = process.env.PORT || 4000;

const allowedFrontendUrl = process.env.FRONTEND_URL;
app.use(cors({
  origin: allowedFrontendUrl
    ? [allowedFrontendUrl, 'http://localhost:5173', 'http://localhost:4000']
    : true,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth',      authRoutes);
app.use('/api/sessions',  sessionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports',   reportsRoutes);
app.use('/api/resume',    resumeRoutes);

// Fallback for unmatched API routes
app.all('/api/*', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Serve frontend build if dist folder exists
const possibleDistPaths = [
  process.env.CLIENT_DIST_PATH,
  path.resolve(__dirname, '../../AI_Interview_Coach_Frontend/dist'),
  path.resolve(__dirname, '../public'),
  path.resolve(process.cwd(), 'AI_Interview_Coach_Frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
].filter(Boolean);

const clientDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  console.log(`[InterviewIQ] Serving frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// Initialise DB first, then start listening
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[InterviewIQ] Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[InterviewIQ] Failed to initialise database:', err);
    process.exit(1);
  });
