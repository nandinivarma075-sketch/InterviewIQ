'use strict';

/**
 * resume.service.js
 * Intelligent resume parser & project deep-dive question generator
 */

// Common tech keywords for extraction
const TECH_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'golang', 'go', 'rust', 'ruby', 'php',
  'react', 'react.js', 'vue', 'vue.js', 'angular', 'next.js', 'svelte', 'redux', 'tailwind',
  'node.js', 'nodejs', 'express', 'nestjs', 'fastapi', 'flask', 'django', 'spring boot', 'graphql',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'cassandra', 'dynamodb', 'elasticsearch', 'sqlite',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ci/cd', 'github actions',
  'websockets', 'kafka', 'rabbitmq', 'microservices', 'rest api', 'grpc', 'oauth', 'jwt'
];

/**
 * Parse plain text resume to extract candidate profile, technologies, and projects
 */
function parseResumeText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      name: 'Candidate',
      seniority: 'Mid-Level',
      skills: ['JavaScript', 'React', 'Node.js'],
      projects: [
        {
          name: 'Full-Stack Web Application',
          tech: ['React', 'Node.js', 'PostgreSQL'],
          details: 'Developed end-to-end features, optimized database queries, and implemented REST APIs.',
        }
      ],
      summary: 'Experienced software engineer with full-stack development experience.',
    };
  }

  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Extract Technologies & Skills
  const extractedSkills = new Set();
  TECH_KEYWORDS.forEach((kw) => {
    // Regex matching word boundary
    const regex = new RegExp(`\\b${kw.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(text)) {
      // Normalize casing
      const formatted = kw.length <= 3 ? kw.toUpperCase() : kw.charAt(0).toUpperCase() + kw.slice(1);
      extractedSkills.add(formatted);
    }
  });

  if (extractedSkills.size === 0) {
    extractedSkills.add('JavaScript');
    extractedSkills.add('React');
    extractedSkills.add('Node.js');
  }

  // 2. Extract Seniority
  let seniority = 'Mid-Level';
  if (/senior|lead|architect|principal|staff|head of|director/i.test(lower)) {
    seniority = 'Senior';
  } else if (/junior|intern|fresher|graduate|entry[- ]level/i.test(lower)) {
    seniority = 'Junior';
  }

  // 3. Extract Projects & Key Accomplishments
  const projects = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let currentProject = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect project or experience headers
    const isProjectHeader =
      /^(project[s]?|experience|work history|key projects|employment)/i.test(line) ||
      (/project|system|platform|application|pipeline|dashboard|service|api/i.test(line) && line.length < 60 && !line.includes('.'));

    if (isProjectHeader && line.length < 50 && !/^(project[s]?|experience)$/i.test(line)) {
      if (currentProject && currentProject.details.length > 0) {
        projects.push(currentProject);
      }
      currentProject = {
        name: line.replace(/[:\-–—#*]/g, '').trim(),
        tech: [],
        details: '',
      };
    } else if (currentProject) {
      if (currentProject.details.length < 300) {
        currentProject.details += (currentProject.details ? ' ' : '') + line;
      }
      // Check tech in this line
      TECH_KEYWORDS.forEach((kw) => {
        if (new RegExp(`\\b${kw.replace('.', '\\.')}\\b`, 'i').test(line)) {
          const formatted = kw.length <= 3 ? kw.toUpperCase() : kw.charAt(0).toUpperCase() + kw.slice(1);
          if (!currentProject.tech.includes(formatted)) currentProject.tech.push(formatted);
        }
      });
      if (projects.length >= 4) break;
    }
  }

  if (currentProject && currentProject.details.length > 0) {
    projects.push(currentProject);
  }

  // Fallback projects if none parsed cleanly
  if (projects.length === 0) {
    const skillsArr = Array.from(extractedSkills);
    const techA = skillsArr.slice(0, 3);
    const techB = skillsArr.slice(2, 5);

    if (lower.includes('chat') || lower.includes('socket') || lower.includes('real-time')) {
      projects.push({
        name: 'Real-Time Communication Platform',
        tech: ['WebSockets', 'Node.js', 'Redis'],
        details: 'Engineered real-time bidirectional messaging, presence tracking, and state persistence with low latency.',
      });
    } else if (lower.includes('e-commerce') || lower.includes('payment') || lower.includes('cart')) {
      projects.push({
        name: 'E-Commerce Checkout & Payment Engine',
        tech: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
        details: 'Architected high-throughput checkout pipeline with transactional integrity and inventory locking.',
      });
    } else {
      projects.push({
        name: 'Distributed Cloud Architecture & API Service',
        tech: techA.length ? techA : ['React', 'Node.js', 'PostgreSQL'],
        details: 'Built scalable microservices and client-facing interfaces with automated deployment pipelines.',
      });
      if (techB.length) {
        projects.push({
          name: 'Interactive Analytics & Monitoring Dashboard',
          tech: techB,
          details: 'Designed data visualization dashboards and caching layer to handle high read volumes.',
        });
      }
    }
  }

  return {
    seniority,
    skills: Array.from(extractedSkills).slice(0, 15),
    projects: projects.slice(0, 4),
    summary: `${seniority} engineer with practical expertise in ${Array.from(extractedSkills).slice(0, 5).join(', ')}.`,
  };
}

/**
 * Generate deep-dive tailored interview questions based on parsed resume
 */
function generateResumeTailoredQuestions(parsedResume, role = 'Software Engineer', count = 2) {
  const { projects = [], skills = [], seniority = 'Mid-Level' } = parsedResume || {};
  const questions = [];

  const templates = [
    {
      type: 'resume',
      category: 'architecture',
      build: (p, s) => ({
        id: `res-proj-${Math.random().toString(36).substring(2, 7)}`,
        text: `In your resume, you highlighted building "${p.name}" using ${p.tech.length ? p.tech.join(', ') : s.slice(0, 3).join(', ')}. Can you walk me through the high-level architecture, and describe the most difficult technical bottleneck you resolved?`,
        type: 'resume',
        category: 'architecture',
        difficulty: seniority === 'Senior' ? 'Hard' : 'Medium',
        projectName: p.name,
      }),
    },
    {
      type: 'resume',
      category: 'tradeoffs',
      build: (p, s) => ({
        id: `res-tradeoff-${Math.random().toString(36).substring(2, 7)}`,
        text: `Regarding your work on "${p.name}": What engineering trade-offs did you make between execution speed, system scalability, and technical debt? If you were to rebuild it today at 10x the scale, what would you change?`,
        type: 'resume',
        category: 'tradeoffs',
        difficulty: 'Hard',
        projectName: p.name,
      }),
    },
    {
      type: 'resume',
      category: 'reliability',
      build: (p, s) => ({
        id: `res-fail-${Math.random().toString(36).substring(2, 7)}`,
        text: `You mentioned using ${p.tech.length ? p.tech[0] : s[0] || 'your core stack'} in "${p.name}". How did you handle edge cases such as network partitions, service timeouts, or data corruption in production?`,
        type: 'resume',
        category: 'reliability',
        difficulty: 'Medium',
        projectName: p.name,
      }),
    },
  ];

  projects.forEach((proj, idx) => {
    if (questions.length >= count) return;
    const template = templates[idx % templates.length];
    questions.push(template.build(proj, skills));
  });

  // If we still need more, build from skills
  if (questions.length < count && skills.length >= 2) {
    questions.push({
      id: `res-skill-${Math.random().toString(36).substring(2, 7)}`,
      text: `Your resume lists extensive experience with ${skills.slice(0, 2).join(' and ')}. How have you leveraged these technologies together in production, and what common anti-patterns do you actively guard against?`,
      type: 'resume',
      category: 'experience',
      difficulty: 'Medium',
      projectName: 'Core Stack Competency',
    });
  }

  return questions.slice(0, count);
}

module.exports = {
  parseResumeText,
  generateResumeTailoredQuestions,
};
