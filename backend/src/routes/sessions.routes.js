/**
 * sessions.routes.js — /api/sessions
 *
 * Key endpoints:
 *  - POST /sessions              — create a session
 *  - POST /sessions/:id/generate-questions — generate dynamic questions for this session
 *  - GET  /sessions/:id/questions          — get questions (already generated)
 *  - POST /sessions/:id/questions/:index   — present a question (PRESENTED state)
 *  - PATCH /sessions/:id/questions/:index  — submit an answer
 *  - PATCH /sessions/:id/end              — end session, compute evidence-based scores
 *  - PATCH /sessions/:id/interrupt        — interrupt session
 *  - POST  /sessions/:id/observations     — save camera observations
 *
 * Scoring Fix:
 *  - wordQuality = 0 when wordsPerQ === 0 (was: 48)
 *  - clamp minimum = 0 (was: 48)
 *  - If no answers: overall = 0, all categories = 0
 *  - TOTAL_QUESTIONS now reads from session.questions_total (not hardcoded 4)
 *
 * Question Generation:
 *  - Role-specific question bank with 400+ questions across 8 roles
 *  - Mix: 25% resume-based, 35% technical, 20% scenario, 20% behavioral
 *  - Deduplication within session and across recent sessions
 *  - Questions stored in question_answers at generation time (stable on refresh)
 */
'use strict';

const express = require('express');
const crypto  = require('crypto');
const { db } = require('../models/db');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  evaluateAnswer,
  generateFollowUpQuestion,
  evaluateFollowUpAnswer,
} = require('../services/evaluation.service');
const { generateResumeTailoredQuestions } = require('../services/resume.service');

const router = express.Router();
router.use(requireAuth);

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_Q_STATES = new Set([
  'NOT_STARTED', 'PRESENTED', 'ANSWERING', 'ANSWERED',
  'PARTIALLY_ANSWERED', 'SKIPPED', 'TIMED_OUT',
  'INTERRUPTED', 'NOT_ATTEMPTED', 'EVALUATED', 'EVALUATION_FAILED',
]);

const VALID_TX_STATUSES = new Set([
  'NONE', 'AVAILABLE', 'PROCESSING', 'FAILED', 'EMPTY', 'SILENT',
]);

// States that count as a genuine candidate answer for scoring purposes
const ANSWERABLE_STATES = new Set(['ANSWERED', 'PARTIALLY_ANSWERED', 'EVALUATED']);

// States that count toward questions presented to the candidate
const PRESENTED_STATES = new Set([
  'PRESENTED', 'ANSWERING', 'ANSWERED', 'PARTIALLY_ANSWERED',
  'SKIPPED', 'TIMED_OUT', 'INTERRUPTED', 'NOT_ATTEMPTED', 'EVALUATED', 'EVALUATION_FAILED',
]);

const VALID_INTERVIEW_TYPES = new Set([
  'mixed', 'technical', 'behavioral', 'resume', 'scenario', 'coding', 'hr',
]);

// ── Question Bank ─────────────────────────────────────────────────────────────
// Large role-specific question bank used when no LLM is available.
// Categories: technical, behavioral, scenario, resume
// Each question has: id, text, type, category, difficulty, roles[]

const QUESTION_BANK = [
  // ─── LIVE CODING CHALLENGES (JAVA, PYTHON, C, C#, JAVASCRIPT) ─────────────
  { id: 'code-001', text: "Live Coding Challenge: Two Sum — Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target. Write the optimal O(N) solution in Java, Python, C, C#, or JavaScript in the live sandbox.", type: 'coding', category: 'algorithms', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'ds', 'ml', 'de'] },
  { id: 'code-002', text: "Live Coding Challenge: Valid Palindrome — Determine if a string is a palindrome, considering only alphanumeric characters and ignoring case sensitivity. Optimize for O(N) time and O(1) space.", type: 'coding', category: 'algorithms', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'ds', 'ml', 'de'] },
  { id: 'code-003', text: "Live Coding Challenge: Binary Search — Given an array of integers `nums` which is sorted in ascending order, write a function to search `target` in `nums`. Your algorithm must run in O(log n) runtime complexity.", type: 'coding', category: 'algorithms', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'ds', 'ml', 'de'] },
  { id: 'code-004', text: "Live Coding Challenge: Maximum Subarray (Kadane's Algorithm) — Given an integer array nums, find the contiguous subarray with the largest sum and return its sum in optimal O(N) linear time.", type: 'coding', category: 'algorithms', difficulty: 'Medium', roles: ['be', 'fs', 'ds', 'de'] },
  { id: 'code-005', text: "Live Coding Challenge: Valid Parentheses — Given a string containing brackets '()[]{}', determine if the input string is valid using a LIFO Stack. Solve in Java, Python, C, or C#.", type: 'coding', category: 'algorithms', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de'] },
  { id: 'code-006', text: "Live Coding Challenge: Merge Intervals — Given an array of intervals [start, end], merge all overlapping intervals and return an array of non-overlapping intervals in O(N log N) time.", type: 'coding', category: 'algorithms', difficulty: 'Medium', roles: ['be', 'fs', 'de'] },
  { id: 'code-007', text: "Live Coding Challenge: Number of 1 Bits (Systems & C) — Write a function that takes an unsigned integer and returns the count of set bits (1s) using bitwise operators in C, C++, or Java.", type: 'coding', category: 'systems', difficulty: 'Easy', roles: ['be', 'fs', 'de'] },
  { id: 'code-008', text: "Live Coding Challenge: LRU Cache Design — Design a data structure for a Least Recently Used (LRU) Cache supporting get(key) and put(key, value) in O(1) average time complexity.", type: 'coding', category: 'design', difficulty: 'Hard', roles: ['be', 'fs', 'de'] },

  // ─── JAVASCRIPT / FRONTEND ───────────────────────────────────────────────
  { id: 'fe-t-001', text: "Explain the difference between `let`, `const`, and `var` in JavaScript.", type: 'technical', category: 'javascript', difficulty: 'Easy', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-002', text: "How does the JavaScript event loop work? Describe the call stack, task queue, and microtask queue.", type: 'technical', category: 'javascript', difficulty: 'Medium', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-003', text: "What is a closure in JavaScript? Give a practical use case.", type: 'technical', category: 'javascript', difficulty: 'Medium', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-004', text: "Explain Promises and async/await. How do you handle errors in an async function?", type: 'technical', category: 'javascript', difficulty: 'Medium', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-005', text: "What is the difference between `==` and `===` in JavaScript?", type: 'technical', category: 'javascript', difficulty: 'Easy', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-006', text: "Explain prototypal inheritance in JavaScript.", type: 'technical', category: 'javascript', difficulty: 'Hard', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-007', text: "What are higher-order functions? Give examples of map, filter, and reduce.", type: 'technical', category: 'javascript', difficulty: 'Easy', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-008', text: "How does `this` keyword behave differently in arrow functions vs regular functions?", type: 'technical', category: 'javascript', difficulty: 'Medium', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-009', text: "Describe the module system in JavaScript (CommonJS vs ES Modules). When would you use each?", type: 'technical', category: 'javascript', difficulty: 'Medium', roles: ['fe', 'fs', 'js'] },
  { id: 'fe-t-010', text: "What are WeakMap and WeakSet? Why are they useful?", type: 'technical', category: 'javascript', difficulty: 'Hard', roles: ['fe', 'fs', 'js'] },

  // React
  { id: 'fe-r-001', text: "How does the React reconciliation algorithm (Virtual DOM diffing) work?", type: 'technical', category: 'react', difficulty: 'Medium', roles: ['fe', 'fs'] },
  { id: 'fe-r-002', text: "Explain the difference between controlled and uncontrolled components in React.", type: 'technical', category: 'react', difficulty: 'Easy', roles: ['fe', 'fs'] },
  { id: 'fe-r-003', text: "When and why would you use useCallback and useMemo hooks?", type: 'technical', category: 'react', difficulty: 'Medium', roles: ['fe', 'fs'] },
  { id: 'fe-r-004', text: "Explain the React component lifecycle and its hooks equivalents (useEffect).", type: 'technical', category: 'react', difficulty: 'Medium', roles: ['fe', 'fs'] },
  { id: 'fe-r-005', text: "What is React Context? When would you prefer it over Redux or Zustand?", type: 'technical', category: 'react', difficulty: 'Medium', roles: ['fe', 'fs'] },
  { id: 'fe-r-006', text: "How does React Fiber improve on the previous reconciliation algorithm?", type: 'technical', category: 'react', difficulty: 'Hard', roles: ['fe', 'fs'] },
  { id: 'fe-r-007', text: "What are React Server Components and how do they differ from client components?", type: 'technical', category: 'react', difficulty: 'Hard', roles: ['fe', 'fs'] },
  { id: 'fe-r-008', text: "Describe the role of `key` props in lists. What happens when keys are missing or incorrect?", type: 'technical', category: 'react', difficulty: 'Easy', roles: ['fe', 'fs'] },
  { id: 'fe-r-009', text: "How would you optimize a React application that has performance issues?", type: 'technical', category: 'react', difficulty: 'Hard', roles: ['fe', 'fs'] },
  { id: 'fe-r-010', text: "Explain custom hooks in React. How do they promote code reuse?", type: 'technical', category: 'react', difficulty: 'Medium', roles: ['fe', 'fs'] },

  // CSS / Web
  { id: 'fe-c-001', text: "Explain the CSS box model and the difference between `content-box` and `border-box`.", type: 'technical', category: 'css', difficulty: 'Easy', roles: ['fe', 'ui'] },
  { id: 'fe-c-002', text: "How does CSS Flexbox differ from CSS Grid? When would you use each?", type: 'technical', category: 'css', difficulty: 'Medium', roles: ['fe', 'ui'] },
  { id: 'fe-c-003', text: "What are CSS custom properties (variables) and how do they enable theming?", type: 'technical', category: 'css', difficulty: 'Easy', roles: ['fe', 'ui'] },
  { id: 'fe-c-004', text: "Explain the difference between `position: absolute`, `relative`, `fixed`, and `sticky`.", type: 'technical', category: 'css', difficulty: 'Easy', roles: ['fe', 'ui'] },
  { id: 'fe-c-005', text: "What is the CSS cascade and specificity? How do you resolve specificity conflicts?", type: 'technical', category: 'css', difficulty: 'Medium', roles: ['fe', 'ui'] },

  // Performance / Web
  { id: 'fe-p-001', text: "How would you design a caching layer for a high-traffic web application?", type: 'technical', category: 'architecture', difficulty: 'Hard', roles: ['fe', 'fs', 'be'] },
  { id: 'fe-p-002', text: "Explain Core Web Vitals (LCP, FID, CLS). How do you measure and improve them?", type: 'technical', category: 'performance', difficulty: 'Medium', roles: ['fe', 'fs'] },
  { id: 'fe-p-003', text: "What is code splitting and lazy loading? How do you implement them in React?", type: 'technical', category: 'performance', difficulty: 'Medium', roles: ['fe', 'fs'] },
  { id: 'fe-p-004', text: "Describe how you would implement infinite scroll vs pagination. What are the trade-offs?", type: 'technical', category: 'ui', difficulty: 'Medium', roles: ['fe', 'fs'] },
  { id: 'fe-p-005', text: "What is debouncing and throttling? Give a real use case for each.", type: 'technical', category: 'javascript', difficulty: 'Medium', roles: ['fe', 'fs', 'js'] },

  // ─── BACKEND / NODE ───────────────────────────────────────────────────────
  { id: 'be-t-001', text: "What is Node.js's non-blocking I/O model and how does it differ from multi-threading?", type: 'technical', category: 'nodejs', difficulty: 'Medium', roles: ['be', 'fs', 'de'] },
  { id: 'be-t-002', text: "Explain the difference between synchronous and asynchronous code in Node.js.", type: 'technical', category: 'nodejs', difficulty: 'Easy', roles: ['be', 'fs'] },
  { id: 'be-t-003', text: "How would you design a RESTful API? What principles do you follow?", type: 'technical', category: 'api', difficulty: 'Medium', roles: ['be', 'fs'] },
  { id: 'be-t-004', text: "Explain JWT authentication. What are its advantages and security considerations?", type: 'technical', category: 'security', difficulty: 'Medium', roles: ['be', 'fs'] },
  { id: 'be-t-005', text: "What is middleware in Express.js? How would you write custom middleware for request logging?", type: 'technical', category: 'nodejs', difficulty: 'Easy', roles: ['be', 'fs'] },
  { id: 'be-t-006', text: "How do you handle database transactions? Why are they important?", type: 'technical', category: 'database', difficulty: 'Medium', roles: ['be', 'fs', 'de'] },
  { id: 'be-t-007', text: "What is the difference between SQL and NoSQL databases? When would you choose each?", type: 'technical', category: 'database', difficulty: 'Medium', roles: ['be', 'fs', 'ds'] },
  { id: 'be-t-008', text: "Explain database indexing. How does it work and what are its trade-offs?", type: 'technical', category: 'database', difficulty: 'Medium', roles: ['be', 'fs'] },
  { id: 'be-t-009', text: "How would you implement rate limiting on an API endpoint?", type: 'technical', category: 'api', difficulty: 'Medium', roles: ['be', 'fs'] },
  { id: 'be-t-010', text: "Describe the N+1 query problem and how to solve it.", type: 'technical', category: 'database', difficulty: 'Hard', roles: ['be', 'fs'] },
  { id: 'be-t-011', text: "What is a message queue? How does it help decouple services?", type: 'technical', category: 'architecture', difficulty: 'Medium', roles: ['be', 'fs', 'de'] },
  { id: 'be-t-012', text: "Explain the differences between REST, GraphQL, and gRPC APIs.", type: 'technical', category: 'api', difficulty: 'Hard', roles: ['be', 'fs'] },
  { id: 'be-t-013', text: "How do you handle secrets and environment variables securely in a Node.js application?", type: 'technical', category: 'security', difficulty: 'Easy', roles: ['be', 'fs', 'de'] },
  { id: 'be-t-014', text: "What is CORS and how do you configure it properly?", type: 'technical', category: 'security', difficulty: 'Easy', roles: ['be', 'fs'] },
  { id: 'be-t-015', text: "Describe the database connection pooling concept and why it matters in high-traffic apps.", type: 'technical', category: 'database', difficulty: 'Medium', roles: ['be', 'fs'] },

  // ─── FULL STACK / ARCHITECTURE ────────────────────────────────────────────
  { id: 'fs-t-001', text: "Explain the difference between server-side rendering (SSR), client-side rendering (CSR), and static site generation (SSG).", type: 'technical', category: 'architecture', difficulty: 'Medium', roles: ['fs', 'fe', 'be'] },
  { id: 'fs-t-002', text: "How would you design a system to handle 1 million concurrent WebSocket connections?", type: 'technical', category: 'architecture', difficulty: 'Hard', roles: ['fs', 'be', 'de'] },
  { id: 'fs-t-003', text: "Describe how you would implement real-time notifications in a web application.", type: 'technical', category: 'architecture', difficulty: 'Medium', roles: ['fs', 'be', 'fe'] },
  { id: 'fs-t-004', text: "What is micro-frontend architecture? When does it make sense to use it?", type: 'technical', category: 'architecture', difficulty: 'Hard', roles: ['fs', 'fe'] },
  { id: 'fs-t-005', text: "How would you implement user authentication with OAuth2/OpenID Connect?", type: 'technical', category: 'security', difficulty: 'Hard', roles: ['fs', 'be'] },

  // Algorithms / CS
  { id: 'cs-t-001', text: "Explain the time and space complexity of binary search. When would you use it?", type: 'technical', category: 'algorithms', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'ds', 'ml'] },
  { id: 'cs-t-002', text: "Describe the difference between BFS and DFS. Give a use case for each.", type: 'technical', category: 'algorithms', difficulty: 'Medium', roles: ['be', 'fs', 'ds'] },
  { id: 'cs-t-003', text: "What is a hash table? How does it handle collisions?", type: 'technical', category: 'data-structures', difficulty: 'Medium', roles: ['fe', 'be', 'fs'] },
  { id: 'cs-t-004', text: "Explain dynamic programming. Give an example problem and walk through your solution.", type: 'technical', category: 'algorithms', difficulty: 'Hard', roles: ['be', 'fs', 'ds', 'ml'] },
  { id: 'cs-t-005', text: "When would you use a queue vs a stack? Give examples from real applications.", type: 'technical', category: 'data-structures', difficulty: 'Easy', roles: ['fe', 'be', 'fs'] },

  // ─── DEVOPS / INFRASTRUCTURE ──────────────────────────────────────────────
  { id: 'de-t-001', text: "Explain the difference between Docker containers and virtual machines.", type: 'technical', category: 'docker', difficulty: 'Easy', roles: ['de', 'be', 'fs'] },
  { id: 'de-t-002', text: "How would you set up a CI/CD pipeline for a Node.js application?", type: 'technical', category: 'cicd', difficulty: 'Medium', roles: ['de', 'be', 'fs'] },
  { id: 'de-t-003', text: "What is Kubernetes? Describe pods, services, and deployments.", type: 'technical', category: 'kubernetes', difficulty: 'Hard', roles: ['de'] },
  { id: 'de-t-004', text: "Explain blue-green deployment vs canary releases. What are the trade-offs?", type: 'technical', category: 'deployment', difficulty: 'Hard', roles: ['de', 'be'] },
  { id: 'de-t-005', text: "How do you monitor a distributed system? What metrics and alerting strategies do you use?", type: 'technical', category: 'monitoring', difficulty: 'Medium', roles: ['de', 'be', 'fs'] },
  { id: 'de-t-006', text: "What is Infrastructure as Code (IaC)? Describe your experience with Terraform or similar tools.", type: 'technical', category: 'iac', difficulty: 'Medium', roles: ['de'] },

  // ─── DATA SCIENCE / ML ────────────────────────────────────────────────────
  { id: 'ds-t-001', text: "Explain the bias-variance trade-off in machine learning.", type: 'technical', category: 'ml', difficulty: 'Medium', roles: ['ds', 'ml'] },
  { id: 'ds-t-002', text: "What is cross-validation? Why do you use it instead of a single train-test split?", type: 'technical', category: 'ml', difficulty: 'Medium', roles: ['ds', 'ml'] },
  { id: 'ds-t-003', text: "Explain gradient descent and its variants (SGD, Adam, RMSProp).", type: 'technical', category: 'ml', difficulty: 'Hard', roles: ['ds', 'ml'] },
  { id: 'ds-t-004', text: "How would you handle class imbalance in a classification problem?", type: 'technical', category: 'ml', difficulty: 'Medium', roles: ['ds', 'ml'] },
  { id: 'ds-t-005', text: "What are the key differences between supervised, unsupervised, and reinforcement learning?", type: 'technical', category: 'ml', difficulty: 'Easy', roles: ['ds', 'ml'] },
  { id: 'ds-t-006', text: "Explain the attention mechanism in transformer models.", type: 'technical', category: 'deep-learning', difficulty: 'Hard', roles: ['ml'] },
  { id: 'ds-t-007', text: "How do you evaluate a regression model? What metrics do you use?", type: 'technical', category: 'ml', difficulty: 'Easy', roles: ['ds', 'ml'] },

  // ─── BEHAVIORAL / HR ──────────────────────────────────────────────────────
  { id: 'beh-001', text: "Tell me about a time you had to debug a complex production issue under pressure. How did you approach it?", type: 'behavioral', category: 'problem-solving', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-002', text: "Describe a situation where you disagreed with a technical decision made by your team. What did you do?", type: 'behavioral', category: 'conflict', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-003', text: "Tell me about a project where you had to learn a new technology quickly. How did you approach it?", type: 'behavioral', category: 'learning', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-004', text: "Describe your approach to code reviews — both giving and receiving feedback.", type: 'behavioral', category: 'teamwork', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml'] },
  { id: 'beh-005', text: "Tell me about a time you made a significant mistake at work. How did you handle it?", type: 'behavioral', category: 'accountability', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-006', text: "How do you prioritize when you have multiple urgent tasks or conflicting deadlines?", type: 'behavioral', category: 'prioritization', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-007', text: "Give an example of a time you improved a process or introduced a best practice in your team.", type: 'behavioral', category: 'initiative', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-008', text: "How do you communicate complex technical concepts to non-technical stakeholders?", type: 'behavioral', category: 'communication', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-009', text: "Describe a time you worked in a cross-functional team. What was your role and what challenges did you face?", type: 'behavioral', category: 'teamwork', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-010', text: "Tell me about the most technically challenging project you've worked on.", type: 'behavioral', category: 'technical-depth', difficulty: 'Hard', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml'] },
  { id: 'beh-011', text: "How do you stay current with new technologies and industry trends?", type: 'behavioral', category: 'learning', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-012', text: "Tell me about a time you received critical feedback. How did you respond to it?", type: 'behavioral', category: 'growth', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-013', text: "Describe a situation where you had to advocate for a technical decision that was unpopular with management.", type: 'behavioral', category: 'leadership', difficulty: 'Hard', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm'] },
  { id: 'beh-014', text: "How do you handle working with unclear or frequently changing requirements?", type: 'behavioral', category: 'adaptability', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-015', text: "Give an example of a time you mentored or helped a junior team member grow.", type: 'behavioral', category: 'mentoring', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm'] },
  { id: 'beh-016', text: "What is your approach to estimating time for tasks? How do you handle unexpected blockers?", type: 'behavioral', category: 'planning', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm'] },
  { id: 'beh-017', text: "Describe a time when you had to deliver difficult news to your team or manager.", type: 'behavioral', category: 'communication', difficulty: 'Hard', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'beh-018', text: "What does ownership mean to you in the context of software development?", type: 'behavioral', category: 'ownership', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm'] },

  // ─── SCENARIOS ────────────────────────────────────────────────────────────
  { id: 'scen-001', text: "Your application is experiencing 10x normal traffic suddenly. Walk me through how you would triage and respond.", type: 'scenario', category: 'incident', difficulty: 'Hard', roles: ['be', 'fs', 'de'] },
  { id: 'scen-002', text: "A user reports that data they entered yesterday has disappeared. How do you investigate?", type: 'scenario', category: 'debugging', difficulty: 'Medium', roles: ['be', 'fs', 'fe'] },
  { id: 'scen-003', text: "You are asked to add a feature with a one-week deadline, but your estimate is three weeks. What do you do?", type: 'scenario', category: 'planning', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm'] },
  { id: 'scen-004', text: "Your team disagrees on which database to use for a new service. How do you facilitate the decision?", type: 'scenario', category: 'decision-making', difficulty: 'Medium', roles: ['be', 'fs', 'de', 'pm'] },
  { id: 'scen-005', text: "You discover a security vulnerability in production code. What steps do you take?", type: 'scenario', category: 'security', difficulty: 'Hard', roles: ['be', 'fs', 'fe', 'de'] },
  { id: 'scen-006', text: "An API you depend on suddenly breaks with no prior notice. How do you handle this in production?", type: 'scenario', category: 'incident', difficulty: 'Hard', roles: ['be', 'fs', 'fe', 'de'] },
  { id: 'scen-007', text: "You are refactoring a legacy codebase with no tests. How do you approach this safely?", type: 'scenario', category: 'refactoring', difficulty: 'Hard', roles: ['fe', 'be', 'fs'] },
  { id: 'scen-008', text: "A key team member leaves mid-project. How do you handle knowledge transfer and continuity?", type: 'scenario', category: 'team', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'pm'] },
  { id: 'scen-009', text: "Your CI/CD pipeline has started failing inconsistently. How do you diagnose and fix it?", type: 'scenario', category: 'debugging', difficulty: 'Medium', roles: ['be', 'fs', 'de'] },
  { id: 'scen-010', text: "You notice that your application's response time has increased by 300% after a recent deployment. What do you do?", type: 'scenario', category: 'performance', difficulty: 'Hard', roles: ['be', 'fs', 'fe', 'de'] },
  { id: 'scen-011', text: "You have two candidate approaches for a feature: a simple quick fix vs a more robust but complex solution. How do you choose?", type: 'scenario', category: 'decision-making', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml'] },
  { id: 'scen-012', text: "A product manager asks you to skip testing to meet a deadline. How do you respond?", type: 'scenario', category: 'communication', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de'] },
  { id: 'scen-013', text: "You are onboarding to a new codebase with poor documentation. What is your approach?", type: 'scenario', category: 'onboarding', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml'] },
  { id: 'scen-014', text: "Two senior engineers on your team have opposing views on an architectural decision. You are the lead. How do you resolve it?", type: 'scenario', category: 'leadership', difficulty: 'Hard', roles: ['be', 'fs', 'de', 'pm'] },
  { id: 'scen-015', text: "Your database is at 95% disk capacity in production. What do you do right now?", type: 'scenario', category: 'incident', difficulty: 'Hard', roles: ['be', 'fs', 'de'] },

  // ─── RESUME-BASED TEMPLATES ──────────────────────────────────────────────
  // These are general templates that reference resume content; filled at generation time
  { id: 'res-t-001', text: "Walk me through your most significant project. What was your specific contribution and what technical challenges did you overcome?", type: 'resume', category: 'projects', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'res-t-002', text: "Looking at your experience, what technology or framework have you used most extensively? What are its strengths and limitations?", type: 'resume', category: 'skills', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'res-t-003', text: "What motivated you to transition from your previous role or project to your current focus area?", type: 'resume', category: 'career', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'res-t-004', text: "Describe a technical decision you made in a recent project that you are most proud of. What was the context and outcome?", type: 'resume', category: 'projects', difficulty: 'Hard', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml'] },
  { id: 'res-t-005', text: "What is the most complex bug or issue you have ever debugged? How did you find and fix it?", type: 'resume', category: 'debugging', difficulty: 'Hard', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml'] },
  { id: 'res-t-006', text: "How have you ensured the quality and reliability of your code in past projects? Describe your testing approach.", type: 'resume', category: 'quality', difficulty: 'Medium', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml'] },
  { id: 'res-t-007', text: "What is a skill or technology on your resume that you feel is underutilized and you want to grow more in?", type: 'resume', category: 'growth', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },
  { id: 'res-t-008', text: "Describe how you collaborated with teammates on your most recent team project. What was your role and how did you coordinate?", type: 'resume', category: 'teamwork', difficulty: 'Easy', roles: ['fe', 'be', 'fs', 'de', 'ds', 'ml', 'pm', 'ui'] },

  // ─── PRODUCT MANAGER ─────────────────────────────────────────────────────
  { id: 'pm-t-001', text: "How do you prioritize features when you have limited engineering capacity?", type: 'technical', category: 'product', difficulty: 'Medium', roles: ['pm'] },
  { id: 'pm-t-002', text: "Describe how you write a product requirements document (PRD). What key sections do you include?", type: 'technical', category: 'product', difficulty: 'Easy', roles: ['pm'] },
  { id: 'pm-t-003', text: "How do you measure the success of a product feature after launch?", type: 'technical', category: 'product', difficulty: 'Medium', roles: ['pm'] },
  { id: 'pm-t-004', text: "Walk me through how you would conduct user research for a new feature.", type: 'technical', category: 'research', difficulty: 'Medium', roles: ['pm', 'ui'] },
  { id: 'pm-t-005', text: "How do you balance technical debt reduction with new feature development?", type: 'scenario', category: 'planning', difficulty: 'Hard', roles: ['pm', 'be', 'fs'] },

  // ─── UI/UX ───────────────────────────────────────────────────────────────
  { id: 'ui-t-001', text: "Describe your design process from discovery to delivery.", type: 'technical', category: 'design', difficulty: 'Easy', roles: ['ui'] },
  { id: 'ui-t-002', text: "How do you ensure your designs are accessible to users with disabilities?", type: 'technical', category: 'accessibility', difficulty: 'Medium', roles: ['ui', 'fe'] },
  { id: 'ui-t-003', text: "How do you conduct usability testing and incorporate findings into your design?", type: 'technical', category: 'research', difficulty: 'Medium', roles: ['ui'] },
  { id: 'ui-t-004', text: "Describe a design decision you made that was data-driven. What metrics influenced it?", type: 'behavioral', category: 'design', difficulty: 'Medium', roles: ['ui', 'pm'] },
];

// Map roles to primary question pools
const ROLE_POOLS = {
  fe:  ['fe', 'fs', 'js', 'ui'],
  be:  ['be', 'fs', 'js'],
  fs:  ['fe', 'be', 'fs', 'js'],
  de:  ['de', 'be', 'fs'],
  ds:  ['ds', 'ml'],
  ml:  ['ml', 'ds'],
  pm:  ['pm'],
  ui:  ['ui', 'fe'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function nowEpoch() { return Math.floor(Date.now() / 1000); }

function utcDateStr(epochSec) {
  return new Date(epochSec * 1000).toISOString().slice(0, 10);
}

function recordActivity(userId, sessionId) {
  const today = utcDateStr(nowEpoch());
  db().run(
    `INSERT OR IGNORE INTO activity (user_id, session_id, event_date) VALUES (?, ?, ?)`,
    userId, sessionId, today
  );
}

function computeOverallScore(scores) {
  if (!scores) return null;
  const tech = typeof scores.technical === 'number' ? scores.technical : 0;
  const ps   = typeof scores.problemSolving === 'number' ? scores.problemSolving : tech;
  const comm = typeof scores.communication === 'number' ? scores.communication : tech;

  // Strict: If technical accuracy is 0, overall score is strictly 0
  if (tech === 0) return 0;

  // Strict weighting: Technical correctness (60%), Problem Solving (25%), Communication (15%)
  const weighted = Math.round(tech * 0.60 + ps * 0.25 + comm * 0.15);
  // Cap overall score to technical accuracy + 5 so eloquent wrong answers cannot pass
  return Math.min(100, Math.min(tech + 5, weighted));
}

/**
 * Accuracy & Correctness based autoScore
 * Evaluates candidate responses directly on factual correctness,
 * technical precision, and concept coverage — NOT on word count.
 */
function autoScore(params) {
  const {
    transcript     = '',
    questionsAsked = 1,
    durationSec    = 0,
    sessionId      = '',
    difficulty     = 'Medium',
    gazeRatio      = 0.5,
    postureRatio   = 0.5,
    questionRows   = null,
    totalConfigured = 4,
  } = params;

  const TOTAL_QUESTIONS = totalConfigured;

  let qAnswered = 0;
  let completionPct = 0;
  let answeredRows = [];

  if (questionRows && questionRows.length > 0) {
    answeredRows = questionRows.filter((r) => ANSWERABLE_STATES.has(r.state));
    qAnswered = answeredRows.length;
    completionPct = qAnswered / TOTAL_QUESTIONS;
  } else {
    qAnswered = Math.max(0, Math.min(questionsAsked, TOTAL_QUESTIONS));
    completionPct = qAnswered / TOTAL_QUESTIONS;
  }

  // If NO questions answered, return zero
  if (qAnswered === 0) {
    return {
      technical:      0,
      problemSolving: 0,
      communication:  0,
      adaptability:   0,
      breakdown: {
        accuracyScore: 0,
        relevanceScore: 0,
        reasoningScore: 0,
        communicationScore: 0,
        completionBonus: 0,
        completionPct: 0,
        durationSec,
        cvBonus: 0,
        difficulty,
        diffMult: 1,
        questionsAnswered: 0,
        totalQuestions: TOTAL_QUESTIONS,
        questionsRemaining: TOTAL_QUESTIONS,
        evidenceBased: questionRows !== null && questionRows.length > 0,
        noAnswers: true,
      },
    };
  }

  // Calculate actual accuracy and correctness scores from answered questions
  let accuracyScore = 0;
  let relevanceScore = 0;
  let reasoningScore = 0;
  let commScore = 0;

  if (answeredRows.length > 0) {
    let accSum = 0;
    let relSum = 0;
    let reasSum = 0;
    let commSum = 0;

    for (const r of answeredRows) {
      let qAcc = r.score_technical;
      let qRel = r.score_relevance;
      let qReas = r.score_reasoning;
      let qComm = r.score_communication;

      if (qAcc == null) {
        const evalRes = evaluateAnswer({
          questionText: r.question_text,
          questionType: r.question_type,
          transcript: r.transcript_verbatim || r.transcript_readable,
        });
        qAcc = evalRes.accuracyScore;
        qRel = evalRes.relevanceScore;
        qReas = evalRes.reasoningScore;
        qComm = evalRes.communicationScore;
      }

      accSum += qAcc;
      relSum += qRel;
      reasSum += qReas;
      commSum += qComm;
    }

    accuracyScore = Math.round(accSum / answeredRows.length);
    relevanceScore = Math.round(relSum / answeredRows.length);
    reasoningScore = Math.round(reasSum / answeredRows.length);
    commScore      = Math.round(commSum / answeredRows.length);
  } else {
    // Fallback evaluating transcript string directly
    const evalRes = evaluateAnswer({
      questionText: 'Technical interview questions',
      questionType: 'technical',
      transcript,
    });
    accuracyScore = evalRes.accuracyScore;
    relevanceScore = evalRes.relevanceScore;
    reasoningScore = evalRes.reasoningScore;
    commScore      = evalRes.communicationScore;
  }

  // Camera presence bonus (0 → +5)
  const cvBonus = (gazeRatio * 3) + (postureRatio * 2);

  // Difficulty multiplier
  const diffMult = difficulty === 'Hard' ? 0.96 : difficulty === 'Easy' ? 1.04 : 1.0;

  // Completion bonus (0 → 5)
  const completionBonus = completionPct >= 1.0 ? 5 : completionPct >= 0.75 ? 3 : 0;

  const clamp = (v) => Math.min(100, Math.max(0, Math.round(v)));

  // Strict Evaluation: Problem Solving and Communication cannot inflate an inaccurate technical response
  const scores = {
    technical:      clamp(accuracyScore),
    problemSolving: clamp(accuracyScore === 0 ? 0 : Math.min(accuracyScore + 5, reasoningScore)),
    communication:  clamp(accuracyScore === 0 ? 0 : commScore),
    adaptability:   clamp(accuracyScore === 0 ? 0 : accuracyScore),
  };

  scores.breakdown = {
    accuracyScore,
    relevanceScore,
    reasoningScore,
    communicationScore: commScore,
    completionBonus,
    completionPct:      Math.round(completionPct * 100),
    durationSec,
    cvBonus:            Math.round(cvBonus * 10) / 10,
    difficulty,
    diffMult,
    questionsAnswered:  qAnswered,
    totalQuestions:     TOTAL_QUESTIONS,
    questionsRemaining: TOTAL_QUESTIONS - qAnswered,
    evidenceBased:      questionRows !== null && questionRows.length > 0,
  };

  return scores;
}

function buildSummary(scores, role, difficulty, breakdown, questionsTotal) {
  const overall = computeOverallScore(scores);
  if (overall === null) return null;

  if (breakdown?.noAnswers) {
    return `${role ?? 'Interview'} (${difficulty}) — No answers were recorded. Score: 0/100. Complete the interview by answering questions to receive a meaningful score.`;
  }

  const grade = overall >= 90 ? 'Excellent' : overall >= 80 ? 'Good' : overall >= 70 ? 'Fair' : 'Needs Improvement';

  if (!breakdown) {
    return `${role ?? 'Interview'} (${difficulty}) — Overall ${overall}/100 (${grade}). Technical Accuracy: ${scores.technical}/100, Problem Solving: ${scores.problemSolving}/100.`;
  }

  const {
    questionsAnswered, totalQuestions, questionsRemaining,
    accuracyScore,
  } = breakdown;

  const accuracyVerdict =
    accuracyScore >= 90 ? 'Exceptional accuracy & conceptual mastery' :
    accuracyScore >= 80 ? 'High accuracy with solid technical understanding' :
    accuracyScore >= 70 ? 'Good conceptual accuracy' :
    accuracyScore >= 55 ? 'Moderate accuracy with some missing nuances' :
    'Limited technical precision';

  return [
    `${role ?? 'Interview'} (${difficulty}) — Overall Score: ${overall}/100 (${grade}).`,
    `You answered ${questionsAnswered} of ${totalQuestions} questions with ${accuracyScore}% average technical accuracy (${accuracyVerdict}).`,
    `Evaluation is measured by technical correctness, concept coverage, and reasoning clarity rather than word count.`,
    `Score breakdown — Technical Accuracy: ${scores.technical}/100, Problem Solving: ${scores.problemSolving}/100, Communication: ${scores.communication}/100, Adaptability: ${scores.adaptability}/100.`,
  ].filter(Boolean).join(' ');
}

// ── Shape helpers ─────────────────────────────────────────────────────────────

function sessionShape(row) {
  if (!row) return null;
  return {
    id: row.id, userId: row.user_id, role: row.role, difficulty: row.difficulty,
    interviewType: row.interview_type ?? 'mixed',
    questionsTotal: row.questions_total ?? 4,
    status: row.status, startedAt: row.started_at, endedAt: row.ended_at,
    durationSec: row.duration_sec, questionsAsked: row.questions_asked,
    questionsAnswered: row.questions_answered ?? null,
    transcript: row.transcript,
    scores: {
      overall: row.score_overall, technical: row.score_technical,
      problemSolving: row.score_problem_solving,
      communication: row.score_communication, adaptability: row.score_adaptability,
    },
    aiSummary: row.ai_summary, createdAt: row.created_at,
  };
}

function qaShape(row) {
  if (!row) return null;
  return {
    id:                row.id,
    sessionId:         row.session_id,
    questionIndex:     row.question_index,
    questionId:        row.question_id,
    questionText:      row.question_text,
    questionType:      row.question_type,
    questionDifficulty:row.question_difficulty,
    state:             row.state,
    presentedAt:       row.presented_at,
    answerStartedAt:   row.answer_started_at,
    answerEndedAt:     row.answer_ended_at,
    answerDurationSec: row.answer_duration_sec,
    transcriptVerbatim:row.transcript_verbatim,
    transcriptReadable:row.transcript_readable,
    wordCount:         row.word_count,
    transcriptStatus:  row.transcript_status,
    scores: {
      technical:    row.score_technical,
      relevance:    row.score_relevance,
      reasoning:    row.score_reasoning,
      communication:row.score_communication,
      examples:     row.score_examples,
      question:     row.score_question,
    },
    aiFeedback:        row.ai_feedback ? (() => { try { return JSON.parse(row.ai_feedback); } catch { return null; } })() : null,
    followUpQuestion:  row.follow_up_question ?? null,
    followUpAnswer:    row.follow_up_answer ?? null,
    followUpBonus:     row.follow_up_bonus ?? 0,
    codeSolution:      row.code_solution ?? null,
    codeResults:       row.code_results ? (() => { try { return JSON.parse(row.code_results); } catch { return row.code_results; } })() : null,
    evaluationStatus:  row.evaluation_status,
    rubricVersion:     row.rubric_version,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

/**
 * Build an attempt summary for a session from its question_answer rows.
 * FIX: totalConfigured comes from session.questions_total (not hardcoded 4)
 */
function buildAttemptSummary(qaRows, totalConfigured) {
  const total = totalConfigured;
  const presented         = qaRows.filter((r) => PRESENTED_STATES.has(r.state)).length;
  const genuinelyAnswered = qaRows.filter((r) => ANSWERABLE_STATES.has(r.state)).length;
  const evaluable         = qaRows.filter((r) => r.state === 'EVALUATED').length;
  const partiallyAnswered = qaRows.filter((r) => r.state === 'PARTIALLY_ANSWERED').length;
  const skipped           = qaRows.filter((r) => r.state === 'SKIPPED').length;
  const timedOut          = qaRows.filter((r) => r.state === 'TIMED_OUT').length;
  const notAttempted      = qaRows.filter((r) =>
    r.state === 'NOT_ATTEMPTED' || r.state === 'NOT_STARTED').length;
  const awaitingProcessing= qaRows.filter((r) => r.evaluation_status === 'PENDING' && ANSWERABLE_STATES.has(r.state)).length;
  const evalFailed        = qaRows.filter((r) => r.state === 'EVALUATION_FAILED').length;
  const interrupted       = qaRows.filter((r) => r.state === 'INTERRUPTED').length;

  const notTracked = Math.max(0, total - qaRows.length);

  return {
    totalConfigured:      total,
    totalPresented:       presented,
    totalGenuinelyAnswered: genuinelyAnswered,
    totalEvaluable:       evaluable,
    totalPartiallyAnswered: partiallyAnswered,
    totalSkipped:         skipped,
    totalTimedOut:        timedOut,
    totalNotAttempted:    notAttempted + notTracked,
    totalAwaitingProcessing: awaitingProcessing,
    totalEvaluationFailed: evalFailed,
    totalInterrupted:     interrupted,
    completionRate:       total > 0 ? Math.round((genuinelyAnswered / total) * 100) : 0,
    consistent: (
      genuinelyAnswered + partiallyAnswered + skipped + timedOut +
      notAttempted + notTracked + interrupted + evalFailed
    ) === total || qaRows.length === 0,
  };
}

// ── Question Generation ───────────────────────────────────────────────────────

/**
 * Select questions for a session.
 *
 * Strategy:
 *  1. Filter bank to role-relevant questions
 *  2. Filter by difficulty (allow 1 tier up/down from selected)
 *  3. Get recently used question IDs for this user to avoid repeats
 *  4. Mix by interview type:
 *     - mixed:     25% resume, 35% technical, 20% scenario, 20% behavioral
 *     - technical: 10% resume, 55% technical, 20% scenario, 15% behavioral
 *     - behavioral/hr: 10% resume, 15% technical, 15% scenario, 60% behavioral
 *     - resume:    50% resume, 20% technical, 15% scenario, 15% behavioral
 *     - scenario:  10% resume, 20% technical, 50% scenario, 20% behavioral
 *  5. Shuffle within each category
 *  6. Fall back to any role-relevant question if a category is short
 */
function generateQuestions({ role, difficulty, interviewType, count, userId }) {
  const normalRole = role?.toLowerCase() ?? 'fs';
  const difficultyMap = { Easy: ['Easy'], Medium: ['Easy', 'Medium', 'Hard'], Hard: ['Medium', 'Hard'] };
  const allowedDiffs  = difficultyMap[difficulty] ?? ['Easy', 'Medium', 'Hard'];

  // Roles this question should match
  const rolePool = ROLE_POOLS[normalRole] ?? ['fs', 'fe', 'be'];

  // Get recently used question IDs (last 3 sessions for this user)
  const recentSessions = db().all(
    `SELECT id FROM sessions WHERE user_id = ? AND status IN ('completed','interrupted') ORDER BY started_at DESC LIMIT 3`,
    userId
  );
  const recentSessionIds = recentSessions.map((s) => s.id);
  const recentQIds = new Set();
  for (const sid of recentSessionIds) {
    const rows = db().all('SELECT question_id FROM question_answers WHERE session_id = ? AND question_id IS NOT NULL', sid);
    rows.forEach((r) => recentQIds.add(r.question_id));
  }

  // Filter pool to role-relevant, difficulty-allowed questions
  let pool = QUESTION_BANK.filter((q) =>
    q.roles.some((r) => rolePool.includes(r)) &&
    allowedDiffs.includes(q.difficulty)
  );

  // Prefer questions not recently used
  const freshPool = pool.filter((q) => !recentQIds.has(q.id));
  const stalePool  = pool.filter((q) =>  recentQIds.has(q.id));

  // Determine category mix based on interview type
  const mixes = {
    mixed:    { resume: 0.25, technical: 0.35, scenario: 0.20, behavioral: 0.20 },
    technical:{ resume: 0.10, technical: 0.55, scenario: 0.20, behavioral: 0.15 },
    behavioral:{resume: 0.10, technical: 0.15, scenario: 0.15, behavioral: 0.60 },
    hr:       { resume: 0.05, technical: 0.10, scenario: 0.15, behavioral: 0.70 },
    resume:   { resume: 0.50, technical: 0.20, scenario: 0.15, behavioral: 0.15 },
    scenario: { resume: 0.10, technical: 0.20, scenario: 0.50, behavioral: 0.20 },
    coding:   { resume: 0.05, technical: 0.65, scenario: 0.20, behavioral: 0.10 },
  };
  const mix = mixes[interviewType] ?? mixes.mixed;

  // Calculate how many from each type
  const targetCounts = {
    resume:    Math.round(count * mix.resume),
    technical: Math.round(count * mix.technical),
    scenario:  Math.round(count * mix.scenario),
    behavioral:Math.round(count * mix.behavioral),
  };

  // Adjust to hit exact count
  let total = Object.values(targetCounts).reduce((a, b) => a + b, 0);
  while (total < count) { targetCounts.technical++; total++; }
  while (total > count) {
    const biggest = Object.entries(targetCounts).sort((a, b) => b[1] - a[1])[0][0];
    targetCounts[biggest]--;
    total--;
  }

  // Helper: pick N items from array without repetition, prefer fresh
  function pick(arr, n, typeFilter) {
    const freshMatches = arr.filter((q) => !recentQIds.has(q.id) && q.type === typeFilter);
    const staleMatches = arr.filter((q) =>  recentQIds.has(q.id) && q.type === typeFilter);
    const combined = [...shuffle(freshMatches), ...shuffle(staleMatches)];
    return combined.slice(0, n);
  }

  const selected = [];
  const usedIds  = new Set();

  function addPicked(arr, n, typeFilter) {
    const candidates = arr.filter((q) => !usedIds.has(q.id));
    const fresh  = shuffle(candidates.filter((q) => !recentQIds.has(q.id) && q.type === typeFilter));
    const stale  = shuffle(candidates.filter((q) =>  recentQIds.has(q.id) && q.type === typeFilter));
    const combined = [...fresh, ...stale];
    let added = 0;
    for (const q of combined) {
      if (added >= n) break;
      if (!usedIds.has(q.id)) {
        selected.push(q);
        usedIds.add(q.id);
        added++;
      }
    }
    return added;
  }

  // Fill by type
  for (const [type, n] of Object.entries(targetCounts)) {
    if (n <= 0) continue;
    const got = addPicked(pool, n, type);
    // If not enough of this type, fill from any role-relevant question
    if (got < n) {
      const needed   = n - got;
      let   filled   = 0;
      const fallback = shuffle(pool.filter((q) => !usedIds.has(q.id)));
      for (const q of fallback) {
        if (filled >= needed) break;
        if (!usedIds.has(q.id)) {
          selected.push(q);
          usedIds.add(q.id);
          filled++;
        }
      }
    }
  }

  // If still under count, fill from anything
  if (selected.length < count) {
    const remaining = pool.filter((q) => !usedIds.has(q.id));
    for (const q of shuffle(remaining)) {
      if (selected.length >= count) break;
      selected.push(q);
      usedIds.add(q.id);
    }
  }

  return selected.slice(0, count);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/sessions
router.post('/', (req, res) => {
  try {
    const {
      role,
      difficulty    = 'Medium',
      interviewType = 'mixed',
      questionsTotal = 4,
    } = req.body ?? {};

    const id    = crypto.randomUUID();
    const qTotal = Math.min(Math.max(Number(questionsTotal) || 4, 1), 20);
    const iType  = VALID_INTERVIEW_TYPES.has(interviewType) ? interviewType : 'mixed';

    // Clean up empty abandoned in_progress sessions before starting a new one
    db().run(
      `DELETE FROM sessions WHERE user_id = ? AND status = 'in_progress' AND (questions_answered = 0 OR questions_answered IS NULL)`,
      req.user.id
    );

    db().run(
      `INSERT INTO sessions (id, user_id, role, difficulty, interview_type, questions_total, status, started_at)
       VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?)`,
      id, req.user.id,
      role ?? null,
      difficulty ?? 'Medium',
      iType,
      qTotal,
      nowEpoch()
    );
    const session = db().get('SELECT * FROM sessions WHERE id = ?', id);
    return res.status(201).json({ session: sessionShape(session) });
  } catch (err) {
    console.error('[POST /sessions]', err);
    return res.status(500).json({ error: 'Could not create session.' });
  }
});

// GET /api/sessions
router.get('/', (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query   = 'SELECT * FROM sessions WHERE user_id = ?';
    const params = [req.user.id];
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const rows  = db().all(query, ...params);
    const total = db().get(
      'SELECT COUNT(*) as c FROM sessions WHERE user_id = ?' + (status ? ' AND status = ?' : ''),
      ...(status ? [req.user.id, status] : [req.user.id])
    ).c;

    return res.json({ sessions: rows.map(sessionShape), total });
  } catch (err) {
    console.error('[GET /sessions]', err);
    return res.status(500).json({ error: 'Could not retrieve sessions.' });
  }
});

// GET /api/sessions/:id
router.get('/:id', (req, res) => {
  try {
    const row = db().get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Session not found.' });
    return res.json({ session: sessionShape(row) });
  } catch (err) {
    console.error('[GET /sessions/:id]', err);
    return res.status(500).json({ error: 'Could not retrieve session.' });
  }
});

// ── Per-question answer routes ─────────────────────────────────────────────────

/**
 * GET /api/sessions/:id/questions
 * Returns all question_answer rows for this session, sorted by question_index.
 */
router.get('/:id/questions', (req, res) => {
  try {
    const session = db().get('SELECT id, user_id FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    const rows = db().all(
      'SELECT * FROM question_answers WHERE session_id = ? ORDER BY question_index ASC', session.id
    );
    return res.json({ questions: rows.map(qaShape) });
  } catch (err) {
    console.error('[GET /sessions/:id/questions]', err);
    return res.status(500).json({ error: 'Could not retrieve question answers.' });
  }
});

/**
 * POST /api/sessions/:id/generate-questions
 *
 * Generate a role-specific, varied question set for this session.
 * Questions are stored in question_answers with state=NOT_STARTED.
 * Idempotent: if questions already exist, returns them without regenerating.
 *
 * Body: (all optional — falls back to session settings)
 *   { role, difficulty, interviewType, count }
 */
router.post('/:id/generate-questions', (req, res) => {
  try {
    const session = db().get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.status !== 'in_progress')
      return res.status(409).json({ error: `Session is already ${session.status}.` });

    // Check if questions already generated for this session (idempotent)
    const existing = db().all(
      'SELECT * FROM question_answers WHERE session_id = ? ORDER BY question_index ASC', session.id
    );
    if (existing.length > 0) {
      return res.json({
        questions: existing.map(qaShape),
        generated: false,
        message: 'Questions already generated for this session.',
      });
    }

    const role         = req.body?.role ?? session.role ?? 'fs';
    const difficulty   = req.body?.difficulty ?? session.difficulty ?? 'Medium';
    const interviewType= req.body?.interviewType ?? session.interview_type ?? 'mixed';
    const count        = Math.min(Math.max(Number(req.body?.count ?? session.questions_total ?? 4), 1), 20);

    let questions = generateQuestions({
      role, difficulty, interviewType, count,
      userId: req.user.id,
    });

    // Deep Resume-to-Question Tailoring
    let resumeData = req.body?.resumeData ?? null;
    if (!resumeData) {
      const userRow = db().get('SELECT resume_data FROM users WHERE id = ?', req.user.id);
      if (userRow?.resume_data) {
        try { resumeData = JSON.parse(userRow.resume_data); } catch {}
      }
    }

    if (resumeData && (interviewType === 'resume' || interviewType === 'mixed' || req.body?.resumeData)) {
      const tailoredCount = interviewType === 'resume'
        ? Math.min(count, Math.max(2, Math.floor(count * 0.6)))
        : Math.min(2, Math.max(1, Math.floor(count * 0.4)));
      const tailored = generateResumeTailoredQuestions(resumeData, role, tailoredCount);
      if (tailored && tailored.length > 0) {
        questions = [...tailored, ...questions.slice(tailored.length)];
      }
    }

    const now = nowEpoch();

    // Insert all questions as NOT_STARTED
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        db().run(
          `INSERT INTO question_answers
             (session_id, question_index, question_id, question_text, question_type,
              question_difficulty, state, transcript_status, evaluation_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'NOT_STARTED', 'NONE', 'PENDING', ?, ?)`,
          session.id, i,
          q.id,
          q.text,
          q.type,
          q.difficulty ?? session.difficulty ?? 'Medium',
          now, now
        );
      } catch (e) {
        console.error(`[generate-questions] Error inserting Q${i}:`, e.message);
      }
    }

    // Update questions_total on session if it changed
    if (questions.length !== session.questions_total) {
      db().run('UPDATE sessions SET questions_total = ? WHERE id = ?', questions.length, session.id);
    }

    const inserted = db().all(
      'SELECT * FROM question_answers WHERE session_id = ? ORDER BY question_index ASC', session.id
    );

    return res.status(201).json({
      questions: inserted.map(qaShape),
      generated: true,
      count: inserted.length,
    });
  } catch (err) {
    console.error('[POST /sessions/:id/generate-questions]', err);
    return res.status(500).json({ error: 'Could not generate questions.' });
  }
});

/**
 * POST /api/sessions/:id/questions/:index
 * Initialize or upsert a question_answer record with PRESENTED state.
 * Called when the frontend shows a question to the candidate.
 */
router.post('/:id/questions/:index', (req, res) => {
  try {
    const session = db().get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.status !== 'in_progress')
      return res.status(409).json({ error: `Session is already ${session.status}.` });

    const qIndex = parseInt(req.params.index, 10);
    if (isNaN(qIndex) || qIndex < 0)
      return res.status(400).json({ error: 'Invalid question index.' });

    const { questionId, questionText, questionType, questionDifficulty } = req.body ?? {};
    const now = nowEpoch();

    // When Q0 is presented (interview started), update started_at to match frontend timer start
    if (qIndex === 0) {
      db().run('UPDATE sessions SET started_at = ? WHERE id = ?', now, session.id);
    }

    // Check for existing record
    const existing = db().get(
      'SELECT * FROM question_answers WHERE session_id = ? AND question_index = ?',
      session.id, qIndex
    );

    if (existing) {
      // If already past NOT_STARTED, just update state to PRESENTED if it was NOT_STARTED
      if (existing.state === 'NOT_STARTED') {
        db().run(
          `UPDATE question_answers SET state = 'PRESENTED', presented_at = ?, updated_at = ?
           WHERE session_id = ? AND question_index = ?`,
          now, now, session.id, qIndex
        );
        const updated = db().get('SELECT * FROM question_answers WHERE session_id = ? AND question_index = ?', session.id, qIndex);
        return res.status(200).json({ question: qaShape(updated), created: false });
      }
      // Already presented — return current row
      return res.status(200).json({ question: qaShape(existing), created: false });
    }

    db().run(
      `INSERT INTO question_answers
         (session_id, question_index, question_id, question_text, question_type,
          question_difficulty, state, presented_at, transcript_status, evaluation_status)
       VALUES (?, ?, ?, ?, ?, ?, 'PRESENTED', ?, 'NONE', 'PENDING')`,
      session.id, qIndex,
      questionId   ?? null,
      questionText ?? null,
      questionType ?? null,
      questionDifficulty ?? session.difficulty ?? null,
      now
    );

    const row = db().get(
      'SELECT * FROM question_answers WHERE session_id = ? AND question_index = ?',
      session.id, qIndex
    );
    return res.status(201).json({ question: qaShape(row), created: true });
  } catch (err) {
    console.error('[POST /sessions/:id/questions/:index]', err);
    return res.status(500).json({ error: 'Could not initialize question.' });
  }
});

/**
 * PATCH /api/sessions/:id/questions/:index
 * Update a question_answer record's state and/or transcript.
 */
router.patch('/:id/questions/:index', (req, res) => {
  try {
    const session = db().get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const qIndex = parseInt(req.params.index, 10);
    if (isNaN(qIndex) || qIndex < 0)
      return res.status(400).json({ error: 'Invalid question index.' });

    const existing = db().get(
      'SELECT * FROM question_answers WHERE session_id = ? AND question_index = ?',
      session.id, qIndex
    );
    if (!existing)
      return res.status(404).json({ error: 'Question not found. Call POST first to present it.' });

    const {
      state,
      transcriptVerbatim,
      transcriptReadable,
      answerStartedAt,
      answerEndedAt,
      followUpAnswer,
      skipFollowUp,
      codeSolution,
      codeResults,
    } = req.body ?? {};

    const newState = state ?? existing.state;
    if (!VALID_Q_STATES.has(newState))
      return res.status(400).json({ error: `Invalid state: ${newState}. Valid: ${[...VALID_Q_STATES].join(', ')}` });

    const verbatim = typeof transcriptVerbatim === 'string' ? transcriptVerbatim.trim() : existing.transcript_verbatim;
    const readable = typeof transcriptReadable === 'string' ? transcriptReadable.trim() : existing.transcript_readable;

    const hasText  = Boolean(verbatim && verbatim.trim().length > 0);
    const words    = verbatim ? verbatim.split(/\s+/).filter(Boolean).length : 0;

    let txStatus = existing.transcript_status;
    if (verbatim != null) {
      txStatus = hasText ? 'AVAILABLE' : 'EMPTY';
    }

    const now          = nowEpoch();
    const startedAt    = answerStartedAt ?? existing.answer_started_at;
    const endedAt      = answerEndedAt
      ?? (['ANSWERED','PARTIALLY_ANSWERED','SKIPPED','TIMED_OUT','INTERRUPTED'].includes(newState) ? now : existing.answer_ended_at);
    const durationSec  = (startedAt && endedAt) ? Math.max(0, endedAt - startedAt) : existing.answer_duration_sec;

    let finalState = newState;
    if (finalState === 'ANSWERED' && !hasText) {
      finalState = 'NOT_ATTEMPTED';
    }

    let evalStatus = existing.evaluation_status;
    let evalResult = null;
    let followUpQ  = existing.follow_up_question;
    let followUpAns = existing.follow_up_answer;
    let followUpBonus = existing.follow_up_bonus || 0;

    if (finalState === 'SKIPPED' || finalState === 'NOT_ATTEMPTED' || finalState === 'NOT_STARTED') {
      evalStatus = 'SKIPPED_UNANSWERED';
    } else if (ANSWERABLE_STATES.has(finalState)) {
      evalResult = evaluateAnswer({
        questionText: existing.question_text,
        questionType: existing.question_type,
        transcript: verbatim || readable || '',
      });
      evalStatus = 'EVALUATED';

      // ── Dynamic Follow-Up Generation ───────────────────────────────────────
      if (!followUpQ && !skipFollowUp && hasText) {
        followUpQ = generateFollowUpQuestion({
          questionText: existing.question_text,
          questionType: existing.question_type,
          transcript: verbatim || readable || '',
          evaluationResult: evalResult,
        });
      }

      // ── Evaluate Follow-up Response if submitted ───────────────────────────
      if (typeof followUpAnswer === 'string' && followUpAnswer.trim().length > 0) {
        followUpAns = followUpAnswer.trim();
        const fEval = evaluateFollowUpAnswer({
          followUpQuestion: followUpQ,
          followUpAnswer: followUpAns,
          originalEvaluation: evalResult,
        });
        followUpBonus = fEval.bonusPoints;

        // Apply bonus recovery score
        evalResult.accuracyScore = Math.min(100, evalResult.accuracyScore + followUpBonus);
        evalResult.overallQuestionScore = Math.min(100, evalResult.overallQuestionScore + followUpBonus);
        evalResult.followUp = {
          question: followUpQ,
          answer: followUpAns,
          bonusPoints: followUpBonus,
          feedback: fEval.followUpFeedback,
        };
      }
    }

    db().run(
      `UPDATE question_answers SET
         state = ?, transcript_verbatim = ?, transcript_readable = ?,
         word_count = ?, transcript_status = ?,
         score_technical = ?, score_relevance = ?, score_reasoning = ?,
         score_communication = ?, score_question = ?, ai_feedback = ?,
         follow_up_question = ?, follow_up_answer = ?, follow_up_bonus = ?,
         code_solution = ?, code_results = ?,
         answer_started_at = ?, answer_ended_at = ?, answer_duration_sec = ?,
         evaluation_status = ?, updated_at = ?
       WHERE session_id = ? AND question_index = ?`,
      finalState,
      verbatim ?? existing.transcript_verbatim,
      readable ?? existing.transcript_readable,
      words,
      txStatus,
      evalResult?.accuracyScore ?? existing.score_technical,
      evalResult?.relevanceScore ?? existing.score_relevance,
      evalResult?.reasoningScore ?? existing.score_reasoning,
      evalResult?.communicationScore ?? existing.score_communication,
      evalResult?.overallQuestionScore ?? existing.score_question,
      evalResult ? JSON.stringify(evalResult) : existing.ai_feedback,
      followUpQ ?? null,
      followUpAns ?? null,
      followUpBonus,
      codeSolution ?? existing.code_solution ?? null,
      codeResults ? (typeof codeResults === 'object' ? JSON.stringify(codeResults) : codeResults) : (existing.code_results ?? null),
      startedAt ?? null,
      endedAt ?? null,
      durationSec ?? null,
      evalStatus,
      now,
      session.id, qIndex
    );

    const updated = db().get(
      'SELECT * FROM question_answers WHERE session_id = ? AND question_index = ?',
      session.id, qIndex
    );
    return res.json({
      question: qaShape(updated),
      followUpQuestion: followUpQ,
    });
  } catch (err) {
    console.error('[PATCH /sessions/:id/questions/:index]', err);
    return res.status(500).json({ error: 'Could not update question answer.' });
  }
});

// ── Session lifecycle routes ───────────────────────────────────────────────────

/**
 * PATCH /api/sessions/:id/end
 *
 * FIX: questionsAnswered derived from question_answers rows.
 * FIX: totalConfigured reads from session.questions_total (not hardcoded 4).
 * FIX: scores = 0 when no answers recorded (not 48).
 */
router.patch('/:id/end', (req, res) => {
  try {
    const row = db().get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Session not found.' });
    if (row.status !== 'in_progress')
      return res.status(409).json({ error: `Session is already ${row.status}.` });

    const { questionsAsked, transcript, technical, problemSolving, communication, adaptability } = req.body ?? {};
    const endedAt     = nowEpoch();
    const durationSec = endedAt - row.started_at;

    // FIX: Read questions_total from session record
    const totalConfigured = row.questions_total ?? 4;

    // ── 1. Load per-question records ────────────────────────────────────────
    const questionRows = db().all(
      'SELECT * FROM question_answers WHERE session_id = ? ORDER BY question_index ASC',
      row.id
    );

    // Ensure all answered questions have accuracy evaluation computed
    for (const qr of questionRows) {
      if (ANSWERABLE_STATES.has(qr.state) && (qr.score_technical == null || qr.evaluation_status !== 'EVALUATED')) {
        const evalRes = evaluateAnswer({
          questionText: qr.question_text,
          questionType: qr.question_type,
          transcript: qr.transcript_verbatim || qr.transcript_readable || '',
        });
        db().run(
          `UPDATE question_answers SET
             score_technical = ?, score_relevance = ?, score_reasoning = ?,
             score_communication = ?, score_question = ?, ai_feedback = ?,
             evaluation_status = 'EVALUATED', updated_at = ?
           WHERE id = ?`,
          evalRes.accuracyScore, evalRes.relevanceScore, evalRes.reasoningScore,
          evalRes.communicationScore, evalRes.overallQuestionScore,
          JSON.stringify(evalRes), nowEpoch(), qr.id
        );
        qr.score_technical = evalRes.accuracyScore;
        qr.score_relevance = evalRes.relevanceScore;
        qr.score_reasoning = evalRes.reasoningScore;
        qr.score_communication = evalRes.communicationScore;
        qr.score_question = evalRes.overallQuestionScore;
        qr.ai_feedback = JSON.stringify(evalRes);
        qr.evaluation_status = 'EVALUATED';
      }
    }

    // ── 2. Determine ACTUAL answered count (authoritative source) ───────────
    const actuallyAnswered = questionRows.filter((r) => ANSWERABLE_STATES.has(r.state));
    const qAnswered = actuallyAnswered.length > 0
      ? actuallyAnswered.length
      : (typeof questionsAsked === 'number' ? questionsAsked : (row.questions_asked || 0));

    const txText = questionRows.length > 0
      ? questionRows
          .filter((r) => ANSWERABLE_STATES.has(r.state) && r.transcript_verbatim)
          .map((r) => r.transcript_verbatim)
          .join('\n\n')
      : (typeof transcript === 'string' ? transcript : (row.transcript || ''));

    const clamp = (v) => (typeof v === 'number' ? Math.min(100, Math.max(0, Math.round(v))) : null);

    // ── 3. Compute scores ────────────────────────────────────────────────────
    const hasExplicitScores = [technical, problemSolving, communication, adaptability]
      .some((v) => typeof v === 'number');

    let scores;
    if (hasExplicitScores) {
      scores = {
        technical:      clamp(technical),
        problemSolving: clamp(problemSolving),
        communication:  clamp(communication),
        adaptability:   clamp(adaptability),
      };
    } else {
      const obsRows    = db().all('SELECT gaze, posture FROM observations WHERE session_id = ?', row.id);
      const totalObs   = obsRows.length || 1;
      const gazeOk     = obsRows.filter((o) => o.gaze === 'facing_camera').length;
      const postureOk  = obsRows.filter((o) => o.posture === 'upright').length;

      scores = autoScore({
        transcript:      txText,
        questionsAsked:  qAnswered,
        durationSec,
        sessionId:       row.id,
        difficulty:      row.difficulty || 'Medium',
        gazeRatio:       gazeOk  / totalObs,
        postureRatio:    postureOk / totalObs,
        questionRows:    questionRows.length > 0 ? questionRows : null,
        totalConfigured,
      });
    }

    const overall   = computeOverallScore(scores);
    const breakdown = scores.breakdown ?? null;
    const summary   = buildSummary(scores, row.role, row.difficulty, breakdown, totalConfigured);

    // ── 4. Persist session update ────────────────────────────────────────────
    db().run(
      `UPDATE sessions SET
         status = 'completed', ended_at = ?, duration_sec = ?,
         questions_asked = ?, questions_answered = ?, transcript = ?,
         score_overall = ?, score_technical = ?,
         score_problem_solving = ?, score_communication = ?,
         score_adaptability = ?, ai_summary = ?
       WHERE id = ?`,
      endedAt, durationSec,
      questionRows.length > 0 ? questionRows.filter((r) => PRESENTED_STATES.has(r.state)).length : (qAnswered || questionsAsked || 0),
      qAnswered,
      txText,
      overall, scores.technical, scores.problemSolving, scores.communication, scores.adaptability,
      summary, row.id
    );

    // ── 5. Mark PRESENTED/ANSWERING/NOT_STARTED questions as NOT_ATTEMPTED ──
    if (questionRows.length > 0) {
      const incompleteStates = ['NOT_STARTED', 'PRESENTED', 'ANSWERING'];
      for (const qr of questionRows) {
        if (incompleteStates.includes(qr.state)) {
          db().run(
            `UPDATE question_answers SET state = 'NOT_ATTEMPTED', evaluation_status = 'SKIPPED_UNANSWERED', updated_at = ?
             WHERE session_id = ? AND question_index = ?`,
            nowEpoch(), row.id, qr.question_index
          );
        }
      }
    }

    recordActivity(req.user.id, row.id);

    const updated  = db().get('SELECT * FROM sessions WHERE id = ?', row.id);
    const finalQAs = db().all('SELECT * FROM question_answers WHERE session_id = ? ORDER BY question_index ASC', row.id);
    const attemptSummary = buildAttemptSummary(finalQAs, totalConfigured);

    return res.json({
      session: sessionShape(updated),
      breakdown,
      attemptSummary,
      questions: finalQAs.map(qaShape),
    });
  } catch (err) {
    console.error('[PATCH /sessions/:id/end]', err);
    return res.status(500).json({ error: 'Could not end session.' });
  }
});

// PATCH /api/sessions/:id/interrupt
router.patch('/:id/interrupt', (req, res) => {
  try {
    const row = db().get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Session not found.' });
    if (row.status !== 'in_progress')
      return res.status(409).json({ error: `Session is already ${row.status}.` });

    const endedAt = nowEpoch();
    db().run(
      `UPDATE sessions SET status = 'interrupted', ended_at = ?, duration_sec = ? WHERE id = ?`,
      endedAt, endedAt - row.started_at, row.id
    );

    db().run(
      `UPDATE question_answers
         SET state = 'INTERRUPTED', evaluation_status = 'SKIPPED_UNANSWERED', updated_at = ?
       WHERE session_id = ? AND state IN ('PRESENTED', 'ANSWERING', 'NOT_STARTED')`,
      nowEpoch(), row.id
    );

    const updated = db().get('SELECT * FROM sessions WHERE id = ?', row.id);
    return res.json({ session: sessionShape(updated) });
  } catch (err) {
    console.error('[PATCH /sessions/:id/interrupt]', err);
    return res.status(500).json({ error: 'Could not interrupt session.' });
  }
});

// POST /api/sessions/:id/observations
router.post('/:id/observations', (req, res) => {
  try {
    const session = db().get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.status !== 'in_progress')
      return res.status(409).json({ error: 'Cannot add observations to a finished session.' });

    const obs  = req.body;
    const list = Array.isArray(obs) ? obs : [obs];

    const VALID_GAZE    = ['facing_camera', 'looking_side', 'looking_down', 'unknown'];
    const VALID_POSTURE = ['upright', 'leaning_forward', 'leaning_back', 'slouching', 'insufficient_visibility', 'unknown'];
    const VALID_GESTURE = ['none', 'one_hand_raised', 'both_hands_raised', 'unknown'];

    const insertFn = db().transaction((items) => {
      for (const item of items) {
        db().run(
          `INSERT INTO observations (session_id, ts, gaze, posture, gesture, face_detected, pose_detected)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          session.id,
          typeof item.ts === 'number' ? item.ts : Math.floor(Date.now() / 1000),
          VALID_GAZE.includes(item.gaze)      ? item.gaze    : 'unknown',
          VALID_POSTURE.includes(item.posture) ? item.posture : 'unknown',
          VALID_GESTURE.includes(item.gesture) ? item.gesture : 'unknown',
          item.faceDetected ? 1 : 0,
          item.poseDetected ? 1 : 0
        );
      }
    });
    insertFn(list);
    return res.status(201).json({ inserted: list.length });
  } catch (err) {
    console.error('[POST /sessions/:id/observations]', err);
    return res.status(500).json({ error: 'Could not save observations.' });
  }
});

// GET /api/sessions/:id/observations
router.get('/:id/observations', (req, res) => {
  try {
    const session = db().get('SELECT id, user_id FROM sessions WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    const rows = db().all('SELECT * FROM observations WHERE session_id = ? ORDER BY ts ASC', session.id);
    return res.json({ observations: rows });
  } catch (err) {
    console.error('[GET /sessions/:id/observations]', err);
    return res.status(500).json({ error: 'Could not retrieve observations.' });
  }
});

module.exports = router;
