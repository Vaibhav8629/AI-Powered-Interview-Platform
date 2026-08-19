const Interview = require("../models/Interview");
const User = require("../models/User");
const Question = require("../models/Question");
const { GoogleGenAI } = require("@google/genai");
const {
  calculateInterviewCost,
  resetMonthlyCreditsIfNeeded,
  hasEnoughCredits,
  deductCredits,
} = require("../services/creditService");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// LeetCode question bank — used when topics includes "DSA"
// ─────────────────────────────────────────────────────────────────────────────

const getLeetCodeQuestions = async ({ difficulty, numberOfQuestions }) => {
  // Count available questions for this difficulty to give a useful error
  const availableCount = await Question.countDocuments({
    source: "leetcode",
    difficulty,
  });

  if (availableCount < numberOfQuestions) {
    const err = new Error(
      `Not enough LeetCode questions available for difficulty "${difficulty}". ` +
        `Requested ${numberOfQuestions}, found ${availableCount}.`
    );
    err.statusCode = 422;
    throw err;
  }

  // Fetch a larger pool, then shuffle in-process for true randomness without
  // relying on $sample's behaviour across very large collections.
  const pool = await Question.find({ source: "leetcode", difficulty })
    .select("title description examples constraints codeSnippets leetcodeUrl difficulty topics")
    .lean();

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, numberOfQuestions).map((q) => ({
    question: q.title,
    description: q.description || null,
    examples: Array.isArray(q.examples) ? q.examples : [],
    constraints: Array.isArray(q.constraints) ? q.constraints : [],
    leetcodeUrl: q.leetcodeUrl || null,
    answer: "",
    feedback: "",
    score: null,
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Non-DSA question generation via Gemini
// ─────────────────────────────────────────────────────────────────────────────

// ── Canonical topic list (used for validation normalisation) ─────────────────
const KNOWN_TOPICS = [
  "JavaScript", "React", "Node.js", "Express", "MongoDB", "SQL", "DBMS",
  "Operating Systems", "Computer Networks", "System Design", "APIs", "Git", "OOPs",
  "My Projects",
];

// ── Topic-specific keyword allowlists ────────────────────────────────────────
// IMPORTANT: Keywords are a SECONDARY safety net only.
// Primary validation is the `topic` tag Gemini returns with each question.
// Do NOT treat a keyword match as proof of topic relevance.
const TOPIC_KEYWORDS = {
  JavaScript: [
    "javascript", "closure", "promise", "async", "await", "event loop", "hoisting",
    "prototype", "scope", "callback", "es6", "spread", "destructuring",
    "arrow function", "this keyword", "generator", "weakmap", "weakset",
    "proxy", "reflect", "debounce", "throttle", "memoize", "temporal dead zone",
    "iife", "currying", "higher-order function",
  ],
  React: [
    "react", "hook", "usestate", "useeffect", "usememo", "usecallback", "useref",
    "component", "lifecycle", "props", "reconciliation", "virtual dom",
    "re-render", "controlled", "uncontrolled", "error boundary", "suspense",
    "context api", "redux", "render prop", "hoc", "memo", "forwardref",
    "hydration", "concurrent mode",
  ],
  "Node.js": [
    "node.js", "node", "event loop", "libuv", "stream", "buffer", "cluster",
    "worker thread", "child process", "event emitter", "non-blocking",
    "commonjs", "esm", "process.env", "npm", "package.json", "require(",
  ],
  Express: [
    "express", "middleware", "router", "app.use", "app.get", "app.post",
    "error handler", "body-parser", "cors", "express.static",
    "request lifecycle", "rate limiting", "authentication middleware",
    "authorization middleware", "helmet", "express validator",
  ],
  MongoDB: [
    "mongodb", "mongoose", "aggregation", "pipeline", "embedding", "referencing",
    "populate", "lookup", "objectid", "bson", "atlas", "compass", "collection",
    "document", "schema design", "index", "replication", "sharding",
  ],
  SQL: [
    "sql", "join", "inner join", "outer join", "left join", "right join",
    "subquery", "normalization", "isolation level", "group by", "having",
    "window function", "cte", "stored procedure", "trigger", "primary key",
    "foreign key", "explain plan", "query plan", "index scan", "full scan",
  ],
  DBMS: [
    "dbms", "database management", "normalization", "1nf", "2nf", "3nf", "bcnf",
    "acid", "concurrency", "deadlock", "locking", "isolation",
    "b-tree", "hash index", "query processing", "relational model",
    "er diagram", "functional dependency", "data integrity",
  ],
  "Operating Systems": [
    "operating system", "process", "thread", "scheduling", "cpu scheduling",
    "deadlock", "semaphore", "mutex", "synchronization", "virtual memory",
    "paging", "segmentation", "context switch", "system call", "ipc",
    "inter-process communication", "memory management", "thrashing",
    "file system", "page fault", "demand paging",
  ],
  "Computer Networks": [
    "tcp", "udp", "http", "https", "dns", "osi model", "tcp/ip",
    "socket", "three-way handshake", "congestion control", "routing",
    "nat", "ssl", "tls", "cdn", "latency", "bandwidth",
    "arp", "icmp", "websocket", "network layer", "transport layer",
  ],
  "System Design": [
    "system design", "scalability", "load balancer", "caching", "sharding",
    "replication", "message queue", "rate limiting", "cap theorem",
    "distributed system", "microservice", "api gateway", "consistency",
    "availability", "partition tolerance", "fault tolerance", "high availability",
    "design a ", "design the ", "architect a",
  ],
  APIs: [
    "api", "rest", "restful", "http method", "idempotent", "status code",
    "jwt", "oauth", "api versioning", "pagination", "rate limiting",
    "webhook", "graphql", "openapi", "swagger", "api security",
    "api design", "endpoint", "payload",
  ],
  Git: [
    "git", "branch", "merge", "rebase", "cherry-pick", "stash", "commit",
    "reset", "revert", "conflict", "pull request", "gitflow",
    "trunk-based", "bisect", "reflog", "detached head", "fast-forward",
  ],
  OOPs: [
    "oop", "object-oriented", "inheritance", "polymorphism",
    "abstraction", "encapsulation", "interface", "abstract class", "solid",
    "single responsibility", "open closed", "liskov", "dependency injection",
    "composition", "method overriding", "method overloading",
    "design pattern", "factory pattern", "singleton", "observer pattern",
  ],
};

// ── Per-topic guidance for the Gemini prompt ─────────────────────────────────
const TOPIC_GUIDANCE = {
  JavaScript:
    `Generate questions whose PRIMARY subject is JavaScript language mechanics and behaviour — not React, Node.js, or any other framework. Focus on: closures, prototype chain, this binding, execution context, event loop, micro/macro task queue, hoisting, scope, ES6+ features (Proxy, WeakMap, generators, async iterators), memory leaks, practical debugging scenarios. NEVER generate "What is JavaScript?". Every question must require a multi-sentence answer.`,

  React:
    `Generate questions whose PRIMARY subject is React. Focus on: rendering pipeline and reconciliation, hooks (useState, useEffect, useMemo, useCallback, useRef, custom hooks), component lifecycle, context vs state management libraries, performance optimisation (memoisation, lazy loading, code splitting), controlled vs uncontrolled components, error boundaries, concurrent features, practical debugging of re-render problems. NEVER generate "What is React?".`,

  "Node.js":
    `Generate questions whose PRIMARY subject is the Node.js runtime. Focus on: event loop phases (timers, I/O, poll, check), libuv, non-blocking I/O, streams and backpressure, worker threads vs child processes vs cluster, EventEmitter, error handling in async code, memory management, production debugging (heap snapshots, CPU profiling). NEVER generate "What is Node.js?".`,

  Express:
    `Generate questions whose PRIMARY subject is Express.js. Focus on: middleware execution order and pipeline, error-handling middleware (four-argument signature), router organisation, request lifecycle, authentication/authorisation patterns, input validation, rate limiting, security headers, CORS, production Express architecture. Avoid bare Node.js questions unrelated to Express.`,

  MongoDB:
    `Generate questions whose PRIMARY subject is MongoDB. Focus on: aggregation pipeline stages ($match, $group, $lookup, $unwind, $project), index types and strategies (compound, text, TTL, sparse), schema design trade-offs (embedding vs referencing), transactions and ACID in MongoDB, query optimisation (explain plan), replication (replica sets), sharding strategies, real-world data modelling decisions.`,

  SQL:
    `Generate questions whose PRIMARY subject is SQL and relational databases. Focus on: complex JOIN scenarios with reasoning, correlated subqueries, normalisation (1NF–BCNF, anomalies), ACID properties, isolation levels and their anomalies (dirty read, phantom read), window functions (ROW_NUMBER, RANK, LAG/LEAD), CTEs, query optimisation (execution plans, index selection), practical SQL interview problems.`,

  DBMS:
    `Generate questions whose PRIMARY subject is database management system theory. Focus on: normalisation and functional dependencies, Armstrong's axioms, transaction management, ACID properties, concurrency control (2PL, MVCC), deadlock detection and prevention, isolation levels, B-tree vs hash indexing, query processing and optimisation, ER modelling, data integrity constraints.`,

  "Operating Systems":
    `Generate questions whose PRIMARY subject is operating systems. Focus on: process vs thread (advantages, context switch cost), CPU scheduling algorithms (FCFS, SJF, Round Robin, Priority — with trade-offs), deadlock (conditions, Banker's algorithm, prevention), semaphores vs mutexes vs monitors, virtual memory, paging (TLB, page fault handling), segmentation, IPC mechanisms, system calls, memory allocation strategies.`,

  "Computer Networks":
    `Generate questions whose PRIMARY subject is computer networking. Focus on: TCP vs UDP trade-offs and use cases, TCP 3-way/4-way handshake, congestion control (slow start, AIMD), full HTTP/HTTPS request lifecycle, DNS resolution chain, OSI layers (applied, not just listed), TLS handshake and certificate validation, routing (OSPF, BGP basics), NAT, WebSocket upgrade, practical network troubleshooting scenarios.`,

  "System Design":
    `Generate SCENARIO-BASED system design questions ONLY. Example formats: "Design a URL shortener for 100M daily users.", "Design a distributed rate limiter.", "How would you design the notification system for a social media platform?" Focus on: scalability, load balancing strategies, caching layers (CDN, Redis), database selection and sharding, message queues, replication, CAP theorem trade-offs, fault tolerance, monitoring. NEVER ask "What is load balancing?" or any pure definition question. Hard difficulty questions must require discussing multiple architectural components.`,

  APIs:
    `Generate questions whose PRIMARY subject is API design and HTTP. Focus on: REST constraints (statelessness, uniform interface, HATEOAS), HTTP method semantics and idempotency, proper status code usage, authentication (JWT structure, OAuth 2.0 flows, API keys), authorisation patterns, API versioning strategies (URL, header, query param), pagination (cursor vs offset), rate limiting (token bucket, leaky bucket), caching (ETag, Cache-Control), API security (OWASP API Top 10), real-world API design trade-offs.`,

  Git:
    `Generate questions whose PRIMARY subject is Git version control. Focus on: merge vs rebase (when to use each, history implications), interactive rebase, cherry-pick use cases, reset vs revert (hard/mixed/soft, safe vs destructive), stash, resolving complex merge conflicts, Gitflow vs trunk-based development, recovering lost commits using reflog, bisect for bug finding, team collaboration scenarios, monorepo strategies.`,

  OOPs:
    `Generate questions whose PRIMARY subject is object-oriented programming principles. Focus on: SOLID principles with real code examples, inheritance vs composition trade-offs, Liskov Substitution in practice, dependency injection patterns, design patterns (Factory, Abstract Factory, Builder, Singleton pitfalls, Observer, Strategy, Decorator, Command) — with use-case reasoning, method overriding vs overloading, interfaces vs abstract classes, real-world OOP design scenarios. Prefer scenario-based over pure "What is X?" definitions.`,
};

// ── Difficulty guidance ───────────────────────────────────────────────────────
const DIFFICULTY_GUIDANCE = {
  Easy:
    `Easy means fundamental interview concepts tested at a basic-to-intermediate level. Questions must still be appropriate for a real technical interview — NOT school-level, NOT trivially answerable with a one-line definition. A junior developer should need 3–5 sentences to answer properly. GOOD easy question: "How does JavaScript handle asynchronous operations using the event loop?" BAD easy question: "What is JavaScript?"`,

  Medium:
    `Medium means interview-level questions requiring reasoning, practical knowledge, or trade-off analysis. A single definition is NOT an acceptable answer. The candidate must explain the "how" and "why", describe a scenario, compare approaches, or walk through an implementation. GOOD medium question: "Your React application re-renders every child component whenever a top-level state changes. Explain why this happens and how you would fix it." BAD medium question: "What is useState?"`,

  Hard:
    `Hard means advanced, production-grade questions. Focus on: architectural trade-offs, edge cases, performance considerations, deep internals, debugging complex systems, scalability decisions. The candidate must demonstrate senior-level thinking. GOOD hard question: "Your Node.js API handles 50,000 concurrent requests. Explain how you would diagnose and resolve event loop lag causing P99 latency spikes." BAD hard question: "What is the event loop?"`,
};

// ── Trivial question pattern detector ────────────────────────────────────────
// Catches known low-quality question formats that Gemini occasionally emits
// despite prompt instructions. Used as a post-processing filter.
const TRIVIAL_PATTERNS = [
  /^what is\s+\w/i,
  /^define\s+\w/i,
  /^explain what\s+(is|are)\s+\w/i,
  /^describe what\s+(is|are)\s+\w/i,
  /^what does\s+\w+\s+stand for/i,
  /^what are the (features|advantages|disadvantages|types|benefits) of\s+\w/i,
  /^list the\s+\w/i,
  /^name (the|some|a few)\s+\w/i,
];

const isTrivialQuestion = (text) =>
  TRIVIAL_PATTERNS.some((re) => re.test(text.trim()));

// ── Semantic topic validator (primary gate) ───────────────────────────────────
// Gemini now returns a `topic` field with each question.
// We validate that field against the selected topics list.
// This is semantic — we trust Gemini's self-labelling, normalised to our list.
const normaliseTopic = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  const exact = KNOWN_TOPICS.find((k) => k.toLowerCase() === t);
  if (exact) return exact;
  return KNOWN_TOPICS.find(
    (k) => t.includes(k.toLowerCase()) || k.toLowerCase().includes(t)
  ) || null;
};

// ── Keyword fallback validator (secondary gate) ───────────────────────────────
// Only used when Gemini's topic tag cannot be normalised to a known topic.
// A question passes if its text contains at least one keyword from ANY
// selected topic. Intentionally permissive — catches clear hallucinations only.
const passesKeywordFallback = (questionText, selectedTopics) => {
  const lower = questionText.toLowerCase();
  return selectedTopics.some((topic) => {
    const keywords = TOPIC_KEYWORDS[topic] || [topic.toLowerCase()];
    return keywords.some((kw) => lower.includes(kw));
  });
};

// ── Full question validator ───────────────────────────────────────────────────
// Returns { valid: boolean, reason: string }
// Layers:
//   1. Basic sanity (non-empty, minimum length)
//   2. Trivial question filter (difficulty enforcement)
//   3. Semantic topic check via Gemini's `topic` label  ← PRIMARY
//   4. Keyword fallback                                  ← SECONDARY
const validateQuestion = ({ question, topic }, selectedTopics, difficulty) => {
  if (!question || typeof question !== "string") {
    return { valid: false, reason: "empty or non-string" };
  }
  const text = question.trim();
  if (text.length < 15) {
    return { valid: false, reason: "too short" };
  }

  // Trivial filter — Medium/Hard: all patterns; Easy: only hardest-banned
  if (isTrivialQuestion(text)) {
    if (difficulty !== "Easy" || /^(what is|define|list the|name (the|some))/i.test(text)) {
      return { valid: false, reason: `trivial question pattern (${difficulty})` };
    }
  }

  // Primary: Gemini's self-assigned topic label
  const normTopic = normaliseTopic(topic);
  if (normTopic) {
    const isSelected =
      selectedTopics.includes(normTopic) || normTopic === "My Projects";
    if (!isSelected) {
      return {
        valid: false,
        reason: `topic "${normTopic}" not in selected topics [${selectedTopics.join(", ")}]`,
      };
    }
    return { valid: true, reason: "topic label match" };
  }

  // Secondary: keyword fallback when label is unrecognisable
  if (selectedTopics.length > 0 && !passesKeywordFallback(text, selectedTopics)) {
    return { valid: false, reason: "no keyword match and unrecognised topic label" };
  }

  return { valid: true, reason: "keyword fallback pass" };
};

// ── Deduplicator ─────────────────────────────────────────────────────────────
const deduplicateQuestions = (questions) => {
  const seen = new Set();
  return questions.filter(({ question }) => {
    const key = (question || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ── Build the strict Gemini prompt ───────────────────────────────────────────
const buildStrictPrompt = ({
  role,
  experience,
  interviewType,
  difficulty,
  topics,
  numberOfQuestions,
  resumeContent,
}) => {
  const hasMyProjects = topics.includes("My Projects");
  const nonProjectTopics = topics.filter((t) => t !== "My Projects");

  const topicGuidanceBlock = nonProjectTopics
    .map((t) => {
      const g = TOPIC_GUIDANCE[t];
      return g
        ? `### ${t}\n${g}`
        : `### ${t}\nGenerate advanced technical interview questions specifically and exclusively about ${t}.`;
    })
    .join("\n\n");

  let distributionNote = "";
  if (nonProjectTopics.length > 1) {
    const base = Math.floor(numberOfQuestions / nonProjectTopics.length);
    const remainder = numberOfQuestions % nonProjectTopics.length;
    const dist = nonProjectTopics
      .map((t, i) => `"${t}": ${base + (i < remainder ? 1 : 0)}`)
      .join(", ");
    distributionNote = `
TOPIC DISTRIBUTION (MANDATORY):
Distribute exactly ${numberOfQuestions} questions as follows: ${dist}.
You MUST generate questions for every listed topic. Never generate all questions from one topic.
`;
  }

  let resumeBlock = "";
  if (hasMyProjects && resumeContent && resumeContent.trim()) {
    resumeBlock = `
═══════════════════════════════════════════════════════
MY PROJECTS TOPIC
═══════════════════════════════════════════════════════
The candidate selected "My Projects". Read the resume below carefully.
Generate questions about the candidate's ACTUAL projects — architecture, technical decisions,
implementation challenges, technologies used, scalability, debugging, and lessons learned.
Do NOT invent or assume projects/technologies not found in the resume.
Tag these questions with topic: "My Projects".
If other topics are also selected, mix project-specific questions with those topic questions.

RESUME CONTENT:
---
${resumeContent.trim()}
---
`;
  }

  return `You are a strict senior technical interviewer. Your task is to generate EXACTLY ${numberOfQuestions} interview questions.

INTERVIEW CONTEXT:
- Role: ${role}
- Experience Level: ${experience}
- Interview Type: ${interviewType}
- Difficulty: ${difficulty}
- Selected Topics: ${topics.join(", ")}

═══════════════════════════════════════════════════════
NON-NEGOTIABLE RULES
═══════════════════════════════════════════════════════

RULE 1 — STRICT TOPIC OWNERSHIP
Each question belongs to exactly one primary topic from: ${topics.join(", ")}.
A question is INVALID if its primary subject is a topic NOT in that list.
Ask yourself: "What is the PRIMARY technical concept this question tests?"
If that concept belongs to an unselected topic → DISCARD and regenerate.

EXAMPLES:
  Selected: [React]
  ✓ VALID:   "How would you prevent unnecessary re-renders in a deeply nested component tree?"
  ✗ INVALID: "Explain JavaScript closures and lexical scope."  ← primary topic is JavaScript, not React

  Selected: [Node.js]
  ✓ VALID:   "How does the Node.js event loop handle I/O callbacks in the poll phase?"
  ✗ INVALID: "How would you design a MongoDB schema?"  ← primary topic is MongoDB, not Node.js

  Selected: [JavaScript, React]
  ✓ VALID:   "How does the JavaScript event loop affect React's rendering batching?"
  ✗ INVALID: "How would you normalise a SQL database?"  ← SQL not selected

RULE 2 — NO OFF-TOPIC CONTAMINATION
Never introduce a topic not in the selected list, even superficially.

RULE 3 — DIFFICULTY ENFORCEMENT (${difficulty.toUpperCase()})
${DIFFICULTY_GUIDANCE[difficulty] || "Generate appropriately challenging questions."}

RULE 4 — EXPERIENCE CALIBRATION (${experience})
Calibrate question depth to the candidate's experience level.
Do not ask production architecture questions to a beginner.
Do not ask trivially basic questions to a senior engineer.

RULE 5 — INTERVIEW QUALITY BAR
Every question MUST:
  • Test understanding, reasoning, debugging ability, trade-offs, or practical implementation.
  • Require at least 3–5 sentences to answer properly.
  • Be something a real interviewer at a tech company would ask.
  • NOT be answerable with a one-line dictionary definition.

FORBIDDEN questions (never generate regardless of difficulty):
  "What is React?" / "What is Node.js?" / "What is a process?" / "Define X." / "List the features of X."

RULE 6 — NO DUPLICATES
Each question must test a DIFFERENT concept or scenario.
Do not rephrase the same question with different wording.

${distributionNote}

═══════════════════════════════════════════════════════
TOPIC-SPECIFIC GUIDANCE
═══════════════════════════════════════════════════════

${topicGuidanceBlock}
${resumeBlock}

═══════════════════════════════════════════════════════
OUTPUT FORMAT — CRITICAL
═══════════════════════════════════════════════════════

Return ONLY a JSON object with a "questions" array.
Each element MUST have exactly two fields:
  - "question": the interview question text (string)
  - "topic": the primary topic this question belongs to — MUST be one of: ${topics.join(", ")}

Example element: { "question": "How does useMemo differ from useCallback?", "topic": "React" }

Do NOT include: answers, hints, explanations, markdown fences, or extra fields.
Generate EXACTLY ${numberOfQuestions} questions.`;
};

// ── Single Gemini call — returns [{question, topic}] ─────────────────────────
const callGemini = async ({
  role, experience, interviewType, difficulty, topics, numberOfQuestions, resumeContent,
}) => {
  const prompt = buildStrictPrompt({
    role, experience, interviewType, difficulty, topics, numberOfQuestions, resumeContent,
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                topic:    { type: "string" },
              },
              required: ["question", "topic"],
            },
          },
        },
        required: ["questions"],
      },
    },
  });

  const parsed = JSON.parse(response.text);
  if (!Array.isArray(parsed?.questions)) return [];

  return parsed.questions
    .map((item) => ({
      question: typeof item?.question === "string" ? item.question.trim() : "",
      topic:    typeof item?.topic    === "string" ? item.topic.trim()    : "",
    }))
    .filter((item) => item.question.length > 0);
};

// ── Main question generation entry point ─────────────────────────────────────
const generateQuestions = async ({
  role,
  experience,
  interviewType,
  difficulty,
  topics,
  numberOfQuestions,
  resumeContent,
}) => {
  // "My Projects" uses resume content — skip topic-keyword validation for it
  const validationTopics = (topics || []).filter((t) => t !== "My Projects");

  let accepted = []; // [{ question, topic }]
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && accepted.length < numberOfQuestions; attempt++) {
    const needed = numberOfQuestions - accepted.length;

    try {
      const rawItems = await callGemini({
        role, experience, interviewType, difficulty,
        topics, numberOfQuestions: needed, resumeContent,
      });

      const filtered = rawItems.filter((item) => {
        if (validationTopics.length === 0) return item.question.length >= 15;
        const result = validateQuestion(item, validationTopics, difficulty);
        if (!result.valid) {
          console.log(`  [rejected] "${item.question.slice(0, 80)}…" — ${result.reason}`);
        }
        return result.valid;
      });

      // Merge across attempts, deduplicate
      accepted = deduplicateQuestions([...accepted, ...filtered]);

      console.log(
        `generateQuestions attempt ${attempt}: raw=${rawItems.length} filtered=${filtered.length} accepted=${accepted.length}/${numberOfQuestions}`
      );
    } catch (err) {
      console.warn(`generateQuestions attempt ${attempt} failed:`, err.message);
    }
  }

  accepted = accepted.slice(0, numberOfQuestions);

  if (accepted.length < numberOfQuestions) {
    console.warn(
      `generateQuestions: ${accepted.length}/${numberOfQuestions} valid after ${MAX_ATTEMPTS} attempts — padding with fallbacks`
    );
    const fallbacks = buildFallbackQuestions({ role, topics, difficulty, numberOfQuestions });
    const needed = numberOfQuestions - accepted.length;
    for (let i = 0; i < needed; i++) {
      const fb = fallbacks[i % fallbacks.length];
      accepted.push({ question: fb?.question || `Technical question ${accepted.length + 1}`, topic: "" });
    }
  }

  return accepted.map(({ question }) => ({
    question,
    answer: "",
    feedback: "",
    score: null,
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback questions — topic + difficulty aware
// Only used when ALL Gemini attempts fail. Must meet the same quality bar.
// ─────────────────────────────────────────────────────────────────────────────

const TOPIC_FALLBACKS = {
  JavaScript: {
    Easy: [
      "Explain how JavaScript's event loop processes micro-tasks differently from macro-tasks, and give an example of each.",
      "How does closure work in JavaScript, and what problem does it solve? Walk through a practical example.",
      "What is the difference between == and === in JavaScript, and when would using == lead to a subtle bug?",
    ],
    Medium: [
      "Your JavaScript application has a memory leak — objects are not being garbage-collected. How would you diagnose and fix it?",
      "Explain the difference between Promise.all, Promise.allSettled, Promise.race, and Promise.any. When would you choose each?",
      "How does prototypal inheritance differ from classical inheritance, and what are the practical implications in JavaScript?",
    ],
    Hard: [
      "Design a debounce function that supports leading/trailing edge execution and can be cancelled. Explain the closure and timing mechanics.",
      "Your async JavaScript code occasionally produces different results on re-runs. Describe how race conditions occur in Promise chains and how you would eliminate them.",
      "Explain how the V8 engine's hidden classes and inline caching affect runtime performance, and how coding patterns can deoptimise hot functions.",
    ],
  },
  React: {
    Easy: [
      "Explain the difference between controlled and uncontrolled components in React. When would you prefer one over the other?",
      "How does React's reconciliation algorithm decide which DOM nodes to update when state changes?",
      "What is the purpose of the useEffect cleanup function, and what problems does omitting it cause?",
    ],
    Medium: [
      "Your React application re-renders a large list component every time any parent state changes. Diagnose the cause and describe the techniques you would use to fix it.",
      "Explain the stale closure problem in useEffect and useCallback. How do you avoid it without causing unnecessary re-renders?",
      "Compare React Context API with a state management library like Redux or Zustand. When would each be the right choice, and what are the performance implications?",
    ],
    Hard: [
      "Design a virtualised list component from scratch that renders 100,000 items without performance degradation. Explain the windowing algorithm and variable row height handling.",
      "Explain React's concurrent rendering model. How does time-slicing work, and how do useTransition and useDeferredValue affect the rendering pipeline?",
      "Your React SPA has a 3-second initial load time. Walk through a complete performance audit and the techniques you would apply to reach sub-1-second LCP.",
    ],
  },
  "Node.js": {
    Easy: [
      "Explain the role of the Node.js event loop and why blocking it with synchronous operations causes the entire server to become unresponsive.",
      "What is the difference between process.nextTick() and setImmediate() in Node.js, and when would you use each?",
      "How do Node.js streams help when processing large files, compared to reading the entire file into memory?",
    ],
    Medium: [
      "Your Node.js API's response times degrade under load. Explain how you would use cluster mode and worker threads to improve throughput, and what the differences between them are.",
      "Describe how Node.js handles unhandled promise rejections and uncaught exceptions. What are best practices for preventing silent failures in production?",
      "Explain backpressure in Node.js streams. What happens if you do not handle it, and how do you implement it correctly with a Transform stream?",
    ],
    Hard: [
      "Your Node.js service has increasing heap memory usage over several days with no restart. Walk through the tooling and process you would use to identify and fix the memory leak.",
      "Design a high-throughput job queue in Node.js that guarantees at-least-once delivery, handles worker crashes gracefully, and supports priority levels.",
      "Explain the V8 garbage collector's generational model in the context of a Node.js server. How would you tune GC behaviour for a latency-sensitive real-time application?",
    ],
  },
  Express: {
    Easy: [
      "Explain the Express middleware pipeline. How does calling next() differ from calling next(err), and what happens if you never call either?",
      "What is the correct way to define a global error-handling middleware in Express, and why does it need four parameters?",
      "How would you structure routes in a large Express application to keep the codebase maintainable?",
    ],
    Medium: [
      "Design an Express middleware that implements per-IP rate limiting without an external library. Explain the data structure and eviction strategy you would use.",
      "Explain how you would implement JWT authentication as Express middleware that validates tokens, handles expiry, and attaches the user to the request object.",
      "Your Express application occasionally returns HTML error pages instead of JSON to API clients. Explain why this happens and how you would fix it with proper error-handling middleware.",
    ],
    Hard: [
      "Design a production-grade Express application architecture that supports horizontal scaling, graceful shutdown, request tracing, and structured logging. Explain each decision.",
      "How would you implement a plugin/extension system for an Express application that allows third-party middleware to register routes and hooks without modifying core code?",
      "Explain all the security vulnerabilities a default Express application is exposed to and how you would harden it for production (OWASP API Top 10, CORS, CSRF, header injection, etc.).",
    ],
  },
  MongoDB: {
    Easy: [
      "When would you embed a document inside another document versus using a reference in MongoDB? What are the trade-offs of each approach?",
      "Explain how MongoDB indexes improve query performance. What is the cost of having too many indexes on a collection?",
      "What is an aggregation pipeline in MongoDB, and how does it differ from a simple find() query?",
    ],
    Medium: [
      "Design a MongoDB schema for a social media platform where users post content and follow each other. Justify your embedding/referencing decisions.",
      "Your MongoDB query is performing a collection scan instead of using an index. How would you diagnose this with explain(), and what steps would you take to fix it?",
      "Explain how the $lookup aggregation stage works and what the performance implications are. When would you avoid it?",
    ],
    Hard: [
      "Your MongoDB replica set's primary is handling 50,000 writes per second. Explain the replication lag mechanics and the strategies you would use to reduce it without sacrificing durability.",
      "Design a sharding strategy for a MongoDB collection containing 10 billion time-series documents. Explain your choice of shard key and the potential hotspot problems.",
      "Explain how multi-document transactions work in MongoDB. What is the performance cost, and how does MongoDB implement MVCC to support them?",
    ],
  },
  SQL: {
    Easy: [
      "Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN with a concrete example of when each should be used.",
      "What is database normalisation? Explain 1NF, 2NF, and 3NF with a practical example showing how a denormalised table would be decomposed.",
      "What is a database index and how does it speed up queries? What is the cost of adding too many indexes to a table?",
    ],
    Medium: [
      "A query joining three large tables is taking 8 seconds. Walk through the investigation process — how would you analyse the execution plan and what changes would you make?",
      "Explain the difference between READ COMMITTED and REPEATABLE READ isolation levels. What anomalies does each prevent, and when would you choose one over the other?",
      "Write and explain a query using window functions to find the top 3 highest-paid employees in each department, without using a subquery or CTE.",
    ],
    Hard: [
      "Your OLTP database has a table with 500 million rows and a composite index on (user_id, created_at). Explain index internals, when the optimiser will not use the index, and how you would redesign the schema.",
      "Design a database schema for a multi-tenant SaaS application. Compare row-level isolation, schema-per-tenant, and database-per-tenant — including security, performance, and migration trade-offs.",
      "Explain how MVCC is implemented in PostgreSQL and how it avoids locks for read operations while maintaining consistency.",
    ],
  },
  DBMS: {
    Easy: [
      "Explain the ACID properties of a database transaction with a concrete banking example for each property.",
      "What is a functional dependency in relational database theory, and how does it relate to normalisation?",
      "Explain the difference between a clustered and non-clustered index. How does the choice of clustered index affect insert performance?",
    ],
    Medium: [
      "Explain the two-phase locking (2PL) protocol. What problem does it solve, and under what circumstances can it still lead to deadlock?",
      "Compare pessimistic and optimistic concurrency control. In what workload profiles does each strategy outperform the other?",
      "Explain how a B-tree index maintains balance during inserts and deletes, and why this matters for predictable query performance.",
    ],
    Hard: [
      "Explain how a database query optimiser generates and selects an execution plan. What statistics does it use, and what conditions cause it to choose a suboptimal plan?",
      "Describe the ARIES recovery algorithm. How does it use the write-ahead log to guarantee atomicity and durability after a crash?",
      "Design the concurrency control scheme for a distributed database that must satisfy serialisable isolation across multiple nodes without a centralised coordinator.",
    ],
  },
  "Operating Systems": {
    Easy: [
      "Explain the difference between a process and a thread. What resources do threads share within the same process, and what are the implications for concurrent programming?",
      "Describe the four necessary conditions for deadlock. How does the Banker's algorithm prevent it?",
      "What is virtual memory, and how does paging allow a process to use more memory than is physically available?",
    ],
    Medium: [
      "Compare Round Robin, Shortest Job First, and Priority scheduling algorithms. Under what workload conditions does each perform best, and what problems does each have?",
      "Explain the difference between a mutex and a semaphore. Give an example of a producer-consumer problem and show how a semaphore solves it.",
      "Describe what happens during a page fault — from the fault being raised to the faulting instruction being re-executed. What happens if there are no free frames?",
    ],
    Hard: [
      "Explain how the Linux kernel implements the Completely Fair Scheduler (CFS). How does it use a red-black tree, and how does it handle I/O-bound vs CPU-bound processes?",
      "Design a deadlock detection and recovery mechanism for an OS that manages multiple resource types. Explain the data structures and algorithm complexity.",
      "Explain the TLB shootdown problem in multi-core systems. When does it occur, and what is its impact on virtual memory performance?",
    ],
  },
  "Computer Networks": {
    Easy: [
      "Explain the TCP three-way handshake. What state does each side maintain, and what problem would occur if the final ACK were lost?",
      "Describe what happens from the moment you type a URL in a browser to the moment the first byte of the response arrives. Cover DNS, TCP, and HTTP.",
      "What is the difference between TCP and UDP? Give a concrete example where you would choose UDP despite its lack of reliability guarantees.",
    ],
    Medium: [
      "Explain TCP's congestion control mechanism. How does slow start work, and what happens when packet loss is detected by timeout versus by duplicate ACKs?",
      "Your web application experiences intermittent high latency under heavy load. How would you use network diagnostic tools to investigate whether the issue is in the network layer or application layer?",
      "Explain how HTTPS works end-to-end. What does the TLS handshake establish, how are session keys derived, and what prevents a man-in-the-middle attack?",
    ],
    Hard: [
      "Explain how BGP propagates routing updates across the internet. What are the security vulnerabilities of BGP, and how does RPKI address them?",
      "Design a globally distributed CDN that minimises latency for a live video streaming platform. Explain the anycast routing strategy, cache invalidation mechanism, and failover design.",
      "Explain how QUIC (HTTP/3) eliminates head-of-line blocking that exists in HTTP/2. What trade-offs does moving to UDP introduce at the transport layer?",
    ],
  },
  "System Design": {
    Easy: [
      "Design a URL shortening service that supports 1 million daily active users. Describe the core components, the database schema, and how you would generate unique short codes.",
      "How would you design a simple key-value cache for a web application? Explain cache eviction strategies (LRU, LFU) and when each is appropriate.",
      "Design a basic notification system for a social media platform. Describe how you would handle delivery to millions of users without blocking the main application.",
    ],
    Medium: [
      "Design a rate limiter that enforces per-user API limits across a cluster of 20 servers. Compare token bucket and leaky bucket algorithms, and explain how you would make the limit consistent across nodes.",
      "Your e-commerce platform's product search is too slow at 10 million products. Design a search system that handles full-text search, filters, and faceted navigation at scale.",
      "Design the backend for a real-time collaborative document editor. Focus on conflict resolution, operational transforms, and synchronising state across many concurrent users.",
    ],
    Hard: [
      "Design a distributed message queue (like Kafka) from scratch. Cover partition strategy, consumer group semantics, exactly-once delivery guarantees, and broker failure handling.",
      "Design the architecture for a global ride-sharing platform that matches riders to drivers in real time with sub-second latency across 50 cities. Explain geospatial indexing, matching algorithm, and data consistency.",
      "Your system must process 1 million events per second with end-to-end latency under 100ms, 99.99% availability, and zero data loss. Design the ingestion, processing, and storage pipeline.",
    ],
  },
  APIs: {
    Easy: [
      "Explain the concept of idempotency in REST APIs. Which HTTP methods are idempotent, and why does it matter for retry logic?",
      "What are the trade-offs between offset-based and cursor-based pagination in a REST API? When would you choose one over the other?",
      "Explain how JWT authentication works end-to-end. What are the security risks of storing JWTs in localStorage vs HttpOnly cookies?",
    ],
    Medium: [
      "Design the error response format for a public REST API. What information should it include, what should it omit for security, and how do you ensure consistency across all endpoints?",
      "Your public API is being abused by a client making thousands of requests per minute. Design a rate limiting system that is fair, efficient, and communicates limits clearly to the caller.",
      "Compare REST, GraphQL, and gRPC for a mobile app backend. What are the concrete trade-offs in terms of payload size, over-fetching, tooling, and operational complexity?",
    ],
    Hard: [
      "Design a versioning strategy for a public REST API with 5,000 active clients that must not break on version changes. Compare URL versioning, header versioning, and content negotiation. Explain how you handle deprecation.",
      "Your API gateway is a single point of failure handling 100,000 requests per second. Design a resilient, horizontally scalable gateway that handles auth, rate limiting, routing, and observability.",
      "Design an API that supports partial updates at scale. Explain the semantics of PATCH vs PUT, how you handle concurrent updates with optimistic locking (ETags), and how you prevent lost updates.",
    ],
  },
  Git: {
    Easy: [
      "Explain the difference between git merge and git rebase. What are the implications for commit history, and when would a team choose one over the other?",
      "What is the difference between git reset --soft, --mixed, and --hard? Give an example where using --hard would be dangerous.",
      "Explain how git stash works. What are the limitations of stash, and when would you use a branch instead?",
    ],
    Medium: [
      "Your team accidentally merged a branch containing a broken feature into main two commits ago. Walk through two different strategies for fixing this, explaining the trade-offs of each.",
      "Explain Gitflow versus trunk-based development. For a team of 10 engineers shipping multiple times per day, which would you recommend and why?",
      "A colleague reports that a bug was introduced sometime in the last 200 commits. How would you use git bisect to find the exact commit, and what are its limitations?",
    ],
    Hard: [
      "Your monorepo has 10 years of Git history with 500,000 commits. Repository clone times are 20 minutes. Design a strategy to reduce repository size and improve developer experience without losing history.",
      "Explain how Git internally stores objects (blobs, trees, commits, tags). How does Git achieve storage efficiency through content-addressable storage and pack files?",
      "Design a Git workflow for a team releasing different versions of a product to enterprise clients on different update cadences, while sharing a common core codebase.",
    ],
  },
  OOPs: {
    Easy: [
      "Explain the Liskov Substitution Principle with a concrete example of a violation and how you would refactor the design to comply with it.",
      "What is the difference between composition and inheritance? Give an example where composition is clearly the better design choice and explain why.",
      "Explain the Open/Closed Principle. Describe a design that violates it and how you would refactor it using a design pattern.",
    ],
    Medium: [
      "You are designing a payment processing system that needs to support multiple payment gateways (Stripe, PayPal, Razorpay) that can be swapped at runtime. Which design pattern would you use, and how would it apply SOLID principles?",
      "Explain the difference between the Factory Method and Abstract Factory patterns. Describe a scenario where you would choose Abstract Factory over Factory Method.",
      "Your codebase has a Singleton DatabaseConnection class that is making unit testing difficult. Explain why Singletons are problematic for testing and how you would refactor it using dependency injection.",
    ],
    Hard: [
      "Design an event-driven order processing system using OOP principles. Apply relevant SOLID principles and design patterns. Explain how you would handle extensibility when new order types are added.",
      "Explain the practical differences between programming to an interface versus programming to an implementation. Design a plugin system for a text editor that allows third-party plugins to add features without modifying the core.",
      "You are refactoring a 50,000-line legacy codebase where all business logic is in a single God class. Design a decomposition strategy using OOP principles. Explain how you would extract boundaries without breaking existing behaviour.",
    ],
  },
};

const buildFallbackQuestions = ({ role, topics, difficulty, numberOfQuestions }) => {
  const pool = [];
  const effectiveDifficulty = ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium";

  // Topic-specific pool first
  const nonProjectTopics = (topics || []).filter((t) => t !== "My Projects");
  for (const topic of nonProjectTopics) {
    const byDiff = TOPIC_FALLBACKS[topic];
    if (byDiff) {
      const qs = byDiff[effectiveDifficulty] || byDiff.Medium || [];
      pool.push(...qs.map((q) => ({ question: q, answer: "", feedback: "", score: null })));
    }
  }

  // Generic role-aware fallbacks if topic pool is still too small
  if (pool.length < numberOfQuestions) {
    const genericByRole = {
      "Frontend Developer": [
        "A critical rendering path issue is causing your web application to paint visible content 4 seconds after navigation. Walk through your investigation and optimisation strategy.",
        "Compare different state management approaches for a large React SPA. What factors influence your choice, and how do you manage performance as state grows?",
      ],
      "Backend Developer": [
        "Design a circuit breaker for a backend service that calls three unreliable third-party APIs. Explain the state machine, thresholds, and recovery strategy.",
        "Your backend service's p99 latency increased 10× after a deploy. Describe your complete debugging process from alert to root cause.",
      ],
      "Full Stack Developer": [
        "Walk through the complete flow of a user authentication request from a React form submission to a JWT being stored securely, covering every layer.",
        "Your full-stack application is experiencing intermittent 502 errors under load. Explain how you would trace the problem across the frontend, API layer, and database.",
      ],
    };
    const generic = genericByRole[role] || [
      "Describe the most architecturally complex system you have designed. What trade-offs did you make, and what would you change today?",
      "Walk through a production incident you investigated. How did you identify the root cause, and what did you change to prevent recurrence?",
    ];
    pool.push(...generic.map((q) => ({ question: q, answer: "", feedback: "", score: null })));
  }

  const result = [];
  for (let i = 0; i < numberOfQuestions; i++) {
    result.push(pool[i % pool.length]);
  }
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE INTERVIEW — now includes credit check + deduction
// ─────────────────────────────────────────────────────────────────────────────

const createInterview = async (req, res) => {
  try {
    const {
      role,
      experience,
      interviewType,
      difficulty,
      topics,
      numberOfQuestions,
      duration,
      status,
      resumeContent,
    } = req.body;

    // 1. Validate required fields
    if (
      !role ||
      !experience ||
      !interviewType ||
      !difficulty ||
      !Array.isArray(topics) ||
      topics.length === 0 ||
      !numberOfQuestions ||
      !duration
    ) {
      return res.status(400).json({
        success: false,
        message: "All interview configuration fields are required.",
      });
    }

    // 1b. Validate resume requirement for "My Projects" topic
    console.log("Received resumeContent:", !!resumeContent);
    console.log("Resume content length:", resumeContent?.length ?? 0);

    if (topics.includes("My Projects") && !resumeContent?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Resume content is required when My Projects is selected.",
      });
    }

    // 2. Calculate credit cost on the backend — never trust the frontend
    let creditCost;
    try {
      creditCost = calculateInterviewCost(numberOfQuestions);
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
      });
    }

    // 3. Fetch the user document (we need the live credit balance)
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 4. Apply monthly credit reset if it's due
    const { reset } = resetMonthlyCreditsIfNeeded(user);
    // We'll save after the interview is created to keep it in one write

    // 5. Check credit balance
    if (!hasEnoughCredits(user, creditCost)) {
      // Save any reset that happened even though we're rejecting
      if (reset) await user.save();

      return res.status(402).json({
        success: false,
        message: "Insufficient credits",
        requiredCredits: creditCost,
        availableCredits: user.credits,
      });
    }

    // 6. Generate/fetch questions (can fail — do this BEFORE deducting credits)
    let questions;
    if (Array.isArray(topics) && topics.includes("DSA")) {
      // Fetch from the seeded LeetCode question bank
      questions = await getLeetCodeQuestions({ difficulty, numberOfQuestions });
    } else {
      // Use Gemini for all non-DSA topics (including My Projects)
      questions = await generateQuestions({
        role,
        experience,
        interviewType,
        difficulty,
        topics,
        numberOfQuestions,
        resumeContent,
      });
    }

    // 7. Deduct credits (in memory only — not saved yet)
    deductCredits(user, creditCost);

    // 8. Create interview document
    const interview = await Interview.create({
      user: req.user.userId,
      role,
      experience,
      interviewType,
      difficulty,
      topics,
      numberOfQuestions,
      duration,
      questions,
      status,
      resumeContent,
    });

    // 9. Save the updated credit balance (after interview is created successfully)
    await user.save();

    return res.status(201).json({
      success: true,
      interviewId: interview._id,
      interview,
      creditsUsed: creditCost,
      creditsRemaining: user.credits,
    });
  } catch (error) {
    console.error("createInterview error:", error);
    // Surface validation errors (e.g. not enough LeetCode questions) with the
    // correct HTTP status code rather than always returning 500.
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Error creating interview",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Remaining controllers — all unchanged
// ─────────────────────────────────────────────────────────────────────────────

const getUserInterviews = async (req, res) => {
  try {
    const data = await Interview.find({ user: req.user.userId });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ msg: "Error fetching interviews" });
  }
};

const getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (String(interview.user) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "You do not have access to this interview" });
    }

    return res.status(200).json({ success: true, interview });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const question = interview.questions.id(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    question.answer = answer;
    question.feedback = "";
    question.score = null;

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Answer saved successfully",
      interviewId: interview._id,
      questionId,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return res.status(500).json({ success: false, message: "Error saving answer" });
  }
};

const getNextQuestion = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (interview.currentQuestion >= interview.questions.length - 1) {
      return res.status(400).json({ message: "No more questions available" });
    }

    interview.currentQuestion += 1;
    await interview.save();

    const question = interview.questions[interview.currentQuestion];

    return res.status(200).json({ message: "Next question fetched", question });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching next question" });
  }
};

const completeInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (interview.status === "completed") {
      return res.status(400).json({ message: "Interview already completed" });
    }

    const unansweredQuestion = interview.questions.find(
      (q) => !q.answer || q.answer.trim() === ""
    );

    if (unansweredQuestion) {
      return res.status(400).json({ message: "All questions must be answered first" });
    }

    interview.status = "completed";
    interview.completedAt = new Date();

    await interview.save();

    return res.status(200).json({
      message: "Interview completed successfully",
      interviewId: interview._id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error completing interview" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TERMINATE INTERVIEW DUE TO CHEATING
// ─────────────────────────────────────────────────────────────────────────────

const terminateCheating = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    // Already terminated or completed — idempotent, just acknowledge
    if (interview.status === "terminated" || interview.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Interview already finalised",
        status: interview.status,
      });
    }

    const {
      tabSwitchCount = 0,
      fullscreenExitCount = 0,
      copyAttemptCount = 0,
      pasteAttemptCount = 0,
      cutAttemptCount = 0,
      violations = [],
      terminationReason = "UNKNOWN",
    } = req.body;

    const toSafeInt = (val) => Math.max(0, Math.floor(Number(val) || 0));

    const ALLOWED_TYPES = new Set([
      "TAB_SWITCH",
      "FULLSCREEN_EXIT",
      "COPY_ATTEMPT",
      "PASTE_ATTEMPT",
      "CUT_ATTEMPT",
    ]);

    const sanitizedViolations = Array.isArray(violations)
      ? violations
          .filter((v) => v && ALLOWED_TYPES.has(v.type) && v.timestamp)
          .map((v) => ({ type: v.type, timestamp: new Date(v.timestamp) }))
          .slice(0, 500)
      : [];

    const now = new Date();

    interview.status = "terminated";
    interview.antiCheating = {
      tabSwitchCount:      toSafeInt(tabSwitchCount),
      fullscreenExitCount: toSafeInt(fullscreenExitCount),
      copyAttemptCount:    toSafeInt(copyAttemptCount),
      pasteAttemptCount:   toSafeInt(pasteAttemptCount),
      cutAttemptCount:     toSafeInt(cutAttemptCount),
      violations:          sanitizedViolations,
      terminationReason:   String(terminationReason),
      terminatedAt:        now,
      submittedAt:         now,
    };

    await interview.save();

    console.log(`Interview ${interview._id} terminated for cheating — reason: ${terminationReason}`);

    return res.status(200).json({
      success: true,
      message: "Interview terminated due to cheating",
      terminationReason,
    });
  } catch (error) {
    console.error("terminateCheating error:", error);
    return res.status(500).json({ success: false, message: "Error terminating interview" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SAVE ANTI-CHEATING SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

const saveAntiCheating = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    const {
      tabSwitchCount = 0,
      fullscreenExitCount = 0,
      copyAttemptCount = 0,
      pasteAttemptCount = 0,
      cutAttemptCount = 0,
      violations = [],
    } = req.body;

    // Validate and sanitize counts — reject negative numbers or non-integers
    const toSafeInt = (val) => Math.max(0, Math.floor(Number(val) || 0));

    // Normalize violation entries — keep only known types and valid timestamps
    const ALLOWED_TYPES = new Set([
      "TAB_SWITCH",
      "FULLSCREEN_EXIT",
      "COPY_ATTEMPT",
      "PASTE_ATTEMPT",
      "CUT_ATTEMPT",
    ]);

    const sanitizedViolations = Array.isArray(violations)
      ? violations
          .filter((v) => v && ALLOWED_TYPES.has(v.type) && v.timestamp)
          .map((v) => ({
            type: v.type,
            timestamp: new Date(v.timestamp),
          }))
          .slice(0, 500) // hard cap — prevents abuse
      : [];

    interview.antiCheating = {
      tabSwitchCount:    toSafeInt(tabSwitchCount),
      fullscreenExitCount: toSafeInt(fullscreenExitCount),
      copyAttemptCount:  toSafeInt(copyAttemptCount),
      pasteAttemptCount: toSafeInt(pasteAttemptCount),
      cutAttemptCount:   toSafeInt(cutAttemptCount),
      violations:        sanitizedViolations,
      submittedAt:       new Date(),
    };

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Anti-cheating summary saved",
      antiCheating: interview.antiCheating,
    });
  } catch (error) {
    console.error("saveAntiCheating error:", error);
    return res.status(500).json({ success: false, message: "Error saving anti-cheating data" });
  }
};

const buildInterviewFeedbackPrompt = (interview) => {
  const questionBlocks = (interview.questions || [])
    .map((questionItem, index) => {
      const answer = questionItem.answer && questionItem.answer.trim()
        ? questionItem.answer.trim()
        : "[No answer provided]";

      return `Question ${index + 1}: ${questionItem.question}\nCandidate Answer:\n${answer}`;
    })
    .join("\n\n---\n\n");

  return `
You are an expert technical interviewer evaluating a completed interview.

Interview context:
- Role: ${interview.role || "Not provided"}
- Experience: ${interview.experience || "Not provided"}
- Difficulty: ${interview.difficulty || "Not provided"}
- Interview Type: ${interview.interviewType || "Not provided"}

Evaluate the full interview using all question-and-answer pairs below.
Return only valid JSON in the exact schema requested.

Interview Questions and Answers:
${questionBlocks}

Scoring requirements:
- Overall Score: 0-100
- Confidence Score: 0-100
- Correctness Score: 0-100
- Communication Score: 0-100
- questionWiseFeedback: one entry for every question, with questionNumber, question, feedback, and score.
- overallSummary: short but complete summary of the candidate's overall interview performance.

Important rules:
1. Use the full interview data, not a single question in isolation.
2. Do not add any extra fields beyond the required schema.
3. Return valid JSON only, no markdown fences.
4. Score conservatively but fairly.
5. If a question had no answer, mention it honestly in the feedback.
`;
};

const normalizeInterviewFeedback = (feedback = {}) => {
  const questionWiseFeedback = Array.isArray(feedback.questionWiseFeedback)
    ? feedback.questionWiseFeedback.map((item, index) => ({
        questionNumber: Number(item?.questionNumber ?? index + 1),
        question: String(item?.question ?? `Question ${index + 1}`),
        feedback: String(item?.feedback ?? ""),
        score: Number(item?.score ?? 0),
      }))
    : [];

  return {
    overallScore: Number(feedback.overallScore ?? 0),
    confidenceScore: Number(feedback.confidenceScore ?? 0),
    correctnessScore: Number(feedback.correctnessScore ?? 0),
    communicationScore: Number(feedback.communicationScore ?? 0),
    questionWiseFeedback,
    overallSummary: String(feedback.overallSummary ?? ""),
  };
};

const generateInterviewFeedback = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (interview.feedback) {
      return res.status(200).json({
        success: true,
        message: "Interview feedback already exists",
        feedback: interview.feedback,
      });
    }

    const hasUnansweredQuestion = interview.questions.some(
      (q) => !q.answer || q.answer.trim() === ""
    );

    if (hasUnansweredQuestion) {
      return res.status(400).json({
        success: false,
        message: "All questions must be answered before generating feedback",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: buildInterviewFeedbackPrompt(interview),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            overallScore: { type: "integer", minimum: 0, maximum: 100 },
            confidenceScore: { type: "integer", minimum: 0, maximum: 100 },
            correctnessScore: { type: "integer", minimum: 0, maximum: 100 },
            communicationScore: { type: "integer", minimum: 0, maximum: 100 },
            questionWiseFeedback: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  questionNumber: { type: "integer", minimum: 1 },
                  question: { type: "string" },
                  feedback: { type: "string" },
                  score: { type: "integer", minimum: 0, maximum: 100 },
                },
                required: ["questionNumber", "question", "feedback", "score"],
              },
            },
            overallSummary: { type: "string" },
          },
          required: [
            "overallScore",
            "confidenceScore",
            "correctnessScore",
            "communicationScore",
            "questionWiseFeedback",
            "overallSummary",
          ],
        },
      },
    });

    const parsedResponse = JSON.parse(response.text);
    const normalizedFeedback = normalizeInterviewFeedback(parsedResponse);

    interview.feedback = {
      ...normalizedFeedback,
      generatedAt: new Date(),
    };

    interview.questions = interview.questions.map((question, index) => {
      const matchedFeedback = normalizedFeedback.questionWiseFeedback.find(
        (item) => Number(item.questionNumber) === index + 1
      );

      if (matchedFeedback) {
        question.feedback = matchedFeedback.feedback;
        question.score = Number(matchedFeedback.score ?? question.score ?? 0);
      }

      return question;
    });

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Interview feedback generated successfully",
      feedback: interview.feedback,
    });
  } catch (error) {
    console.error("generateInterviewFeedback error:", error);
    return res.status(502).json({
      success: false,
      message: "Error generating interview feedback",
      error: error.message,
    });
  }
};

const getInterviewResult = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      user: req.user.userId,
    });

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (interview.status !== "completed") {
      return res.status(400).json({ message: "Interview is not completed yet" });
    }

    const questions = interview.questions;
    const totalQuestions = questions.length;
    const totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);
    const maxScore = totalQuestions * 10;
    const averageScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return res.status(200).json({
      interviewId: interview._id,
      role: interview.role,
      difficulty: interview.difficulty,
      totalQuestions,
      totalScore,
      maxScore,
      averageScore: Number(averageScore.toFixed(2)),
      percentage: Number(percentage.toFixed(2)),
      completedAt: interview.completedAt,
      feedback: interview.feedback,
      questions: questions.map((q) => ({
        questionId: q._id,
        question: q.question,
        answer: q.answer,
        feedback: q.feedback,
        score: q.score,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching interview result" });
  }
};

module.exports = {
  createInterview,
  getUserInterviews,
  getInterviewById,
  submitAnswer,
  getNextQuestion,
  completeInterview,
  generateInterviewFeedback,
  buildInterviewFeedbackPrompt,
  normalizeInterviewFeedback,
  getInterviewResult,
  saveAntiCheating,
  terminateCheating,
};
