// Mock user data
export const mockUser = {
  id: 'user-001',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  avatar: null,
  initials: 'AJ',
  role: 'Software Engineer',
  joinedDate: '2024-01-15',
  totalInterviews: 12,
  averageScore: 82,
  streak: 5,
};

// Mock interview sessions
export const mockInterviews = [
  {
    id: 'int-001',
    role: 'Senior Frontend Engineer',
    company: 'TechCorp',
    date: '2025-09-28',
    duration: 42,
    status: 'completed',
    overallScore: 88,
    scores: {
      technical: 85,
      problemSolving: 90,
      communication: 92,
      resumeUnderstanding: 84,
      adaptability: 88,
    },
    questionsAsked: 12,
    difficulty: 'Hard',
  },
  {
    id: 'int-002',
    role: 'React Developer',
    company: 'StartupXYZ',
    date: '2025-09-20',
    duration: 35,
    status: 'completed',
    overallScore: 76,
    scores: {
      technical: 72,
      problemSolving: 78,
      communication: 80,
      resumeUnderstanding: 75,
      adaptability: 74,
    },
    questionsAsked: 10,
    difficulty: 'Medium',
  },
  {
    id: 'int-003',
    role: 'Full Stack Developer',
    company: 'MegaFinance',
    date: '2025-09-12',
    duration: 50,
    status: 'completed',
    overallScore: 91,
    scores: {
      technical: 94,
      problemSolving: 88,
      communication: 90,
      resumeUnderstanding: 93,
      adaptability: 91,
    },
    questionsAsked: 14,
    difficulty: 'Hard',
  },
  {
    id: 'int-004',
    role: 'JavaScript Engineer',
    company: 'InnovateTech',
    date: '2025-08-30',
    duration: 28,
    status: 'completed',
    overallScore: 70,
    scores: {
      technical: 65,
      problemSolving: 72,
      communication: 75,
      resumeUnderstanding: 70,
      adaptability: 68,
    },
    questionsAsked: 8,
    difficulty: 'Medium',
  },
];

// Job roles list
export const jobRoles = [
  { id: 'fe', label: 'Frontend Engineer', icon: 'Monitor', tags: ['React', 'Vue', 'CSS'] },
  { id: 'be', label: 'Backend Engineer', icon: 'Server', tags: ['Node.js', 'Python', 'SQL'] },
  { id: 'fs', label: 'Full Stack Developer', icon: 'Layers', tags: ['React', 'Node.js', 'DB'] },
  { id: 'ds', label: 'Data Scientist', icon: 'BarChart2', tags: ['Python', 'ML', 'Stats'] },
  { id: 'de', label: 'DevOps Engineer', icon: 'GitBranch', tags: ['Docker', 'K8s', 'CI/CD'] },
  { id: 'ml', label: 'ML Engineer', icon: 'Cpu', tags: ['TensorFlow', 'PyTorch', 'Python'] },
  { id: 'pm', label: 'Product Manager', icon: 'Briefcase', tags: ['Roadmaps', 'OKRs', 'Analytics'] },
  { id: 'ui', label: 'UI/UX Designer', icon: 'Figma', tags: ['Figma', 'Research', 'Prototyping'] },
];

// Sample interview questions
export const sampleQuestions = [
  {
    id: 'q-001',
    type: 'technical',
    text: 'Can you explain the difference between `let`, `const`, and `var` in JavaScript?',
    followUps: [
      'What are the scoping rules for each?',
      'Can you give an example where using `var` would cause unexpected behavior?',
    ],
  },
  {
    id: 'q-002',
    type: 'behavioral',
    text: 'Tell me about a time when you had to debug a complex production issue. How did you approach it?',
    followUps: [
      'What tools did you use to trace the issue?',
      'What would you do differently next time?',
    ],
  },
  {
    id: 'q-003',
    type: 'technical',
    text: 'How does the React reconciliation algorithm (Virtual DOM diffing) work?',
    followUps: [
      'What is the role of `key` props in lists?',
      'How does React Fiber improve on the previous algorithm?',
    ],
  },
  {
    id: 'q-004',
    type: 'problem-solving',
    text: 'Design a caching layer for a high-traffic web application. What data structures would you use?',
    followUps: [
      'How would you handle cache invalidation?',
      'What are the tradeoffs between LRU and LFU eviction policies?',
    ],
  },
];

// Performance data for charts
export const performanceHistory = [
  { month: 'May', score: 65 },
  { month: 'Jun', score: 72 },
  { month: 'Jul', score: 68 },
  { month: 'Aug', score: 78 },
  { month: 'Sep', score: 82 },
  { month: 'Oct', score: 88 },
];

// Skill breakdown for radar chart
export const skillBreakdown = [
  { skill: 'Technical', score: 85 },
  { skill: 'Problem Solving', score: 78 },
  { skill: 'Communication', score: 92 },
  { skill: 'Resume Understanding', score: 80 },
  { skill: 'Adaptability', score: 74 },
];

// AI feedback samples
export const mockFeedback = [
  {
    category: 'Technical Knowledge',
    score: 85,
    summary: 'Demonstrated solid understanding of JavaScript fundamentals and React internals. Could improve on advanced async patterns.',
    highlights: ['Strong on closures and scope', 'Good React hooks knowledge', 'Needs improvement on Promises & async/await edge cases'],
    grade: 'B+',
  },
  {
    category: 'Problem Solving',
    score: 90,
    summary: 'Excellent analytical approach. Broke down complex problems systematically and considered edge cases proactively.',
    highlights: ['Systematic decomposition', 'Good time complexity awareness', 'Proactively identified edge cases'],
    grade: 'A-',
  },
  {
    category: 'Communication',
    score: 92,
    summary: 'Outstanding communication. Articulated ideas clearly, asked clarifying questions, and structured answers well.',
    highlights: ['Clear articulation', 'Active listening', 'Structured responses using STAR method'],
    grade: 'A',
  },
  {
    category: 'Resume Understanding',
    score: 80,
    summary: 'Good alignment between stated experience and interview responses. Some projects could be elaborated further.',
    highlights: ['Consistent with CV', 'Strong project ownership narrative', 'Could quantify impact more'],
    grade: 'B',
  },
  {
    category: 'Adaptability',
    score: 78,
    summary: 'Handled follow-up questions reasonably well. Showed willingness to adjust approach when challenged.',
    highlights: ['Receptive to hints', 'Pivots approach when challenged', 'Could be more confident under pressure'],
    grade: 'B-',
  },
];
