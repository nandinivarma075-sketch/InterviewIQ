/**
 * evaluation.service.js — Strict Technical Accuracy & Conceptual Correctness Engine
 *
 * Evaluates candidate responses based strictly on factual accuracy, conceptual depth,
 * correct technical terminology, and absence of misconceptions — NEVER on word count.
 *
 * Rules:
 *  - Concise, accurate answers with core concepts receive top scores (90-100).
 *  - Incorrect statements or misconceptions are strictly detected and penalized.
 *  - Off-topic or concept-free responses strictly score 0.
 *  - Communication cannot inflate an inaccurate technical answer.
 */

'use strict';

/**
 * Curated Knowledge Base with Precise Rubrics and Misconception Traps
 */
const KNOWLEDGE_BASE = [
  // ─── JavaScript Core ────────────────────────────────────────────────────────
  {
    patterns: [/let.*const.*var/i, /var.*let.*const/i, /difference.*between.*let/i],
    title: 'Difference between let, const, and var',
    concepts: [
      {
        id: 'scope',
        label: 'Scoping differences',
        match: /(let|const).*(block[\s-]scope|within braces|block level)|var.*(function[\s-]scope|globally scoped)|block[\s-]scoped/i,
        positive: 'Correctly identified block scoping (let/const) vs function scoping (var)',
        negative: 'Did not clearly distinguish block scope (let/const) from function scope (var)',
      },
      {
        id: 'reassignment',
        label: 'Reassignment & Mutability',
        match: /(const.*(cannot be re-?assigned|immutable reference|constant)|(cannot|can't) re-?assign.*const)/i,
        positive: 'Correctly noted that const bindings cannot be reassigned while let/var can',
        negative: 'Omitted that const variables cannot be reassigned',
      },
      {
        id: 'hoisting_tdz',
        label: 'Hoisting & Temporal Dead Zone (TDZ)',
        match: /(hoist|temporal dead zone|tdz|undefined|referenceerror.*before|initialized)/i,
        positive: 'Mentioned hoisting behavior or Temporal Dead Zone (TDZ)',
        negative: 'Did not mention hoisting differences or the Temporal Dead Zone (TDZ)',
      },
    ],
    misconceptions: [
      {
        pattern: /(var\s+(is|are)\s+block[\s-]scope)/i,
        description: 'Claimed var is block-scoped (var is function-scoped in JavaScript).',
      },
      {
        pattern: /(const\s+(can\s+be\s+re-?assigned|bindings?\s+can\s+change))/i,
        description: 'Claimed const can be reassigned (const strictly prohibits reassignment).',
      },
      {
        pattern: /(let\s+(and\s+const\s+)?(is|are)\s+function[\s-]scope)/i,
        description: 'Claimed let/const are function-scoped (they are block-scoped).',
      },
    ],
    modelAnswer: 'var is function-scoped and hoisted with undefined. let and const are block-scoped and remain in the Temporal Dead Zone (TDZ) until declaration; const additionally prohibits reassignment of the variable binding.',
  },
  {
    patterns: [/event loop/i, /call stack.*task queue/i, /microtask/i],
    title: 'JavaScript Event Loop Architecture',
    concepts: [
      {
        id: 'stack',
        label: 'Call Stack & Synchronous Execution',
        match: /(call[\s-]stack|execution stack|synchronous|single[\s-]thread)/i,
        positive: 'Explained synchronous code execution on the call stack',
        negative: 'Missing explanation of the call stack role in synchronous execution',
      },
      {
        id: 'task_queue',
        label: 'Task Queue (Macrotasks)',
        match: /(task queue|macrotask|callback queue|settimeout|setinterval|i\/o)/i,
        positive: 'Explained the task/macrotask queue for asynchronous operations (timers, I/O)',
        negative: 'Omitted the role of the task/macrotask queue',
      },
      {
        id: 'microtask',
        label: 'Microtask Queue Priority',
        match: /(microtask|promise|queuemicrotask|mutationobserver|priority|before.*macrotask)/i,
        positive: 'Noted that microtasks (Promises) take priority and flush before the next macrotask',
        negative: 'Did not explain that microtasks (e.g. Promises) have higher execution priority',
      },
    ],
    misconceptions: [
      {
        pattern: /(microtasks?\s+run\s+after\s+(the\s+)?(macro[\s-]?tasks?|task queue))/i,
        description: 'Stated microtasks run after macrotasks (microtasks run immediately after call stack empties, before the next macrotask).',
      },
      {
        pattern: /(javascript\s+is\s+multi[\s-]threaded\s+by\s+default)/i,
        description: 'Stated JavaScript is multi-threaded (JS runtime execution engine is single-threaded).',
      },
    ],
    modelAnswer: 'The call stack executes synchronous code. Asynchronous operations enqueue callbacks into the microtask queue (Promises) and task queue (timers, I/O). The event loop flushes all microtasks after each stack frame before running the next macrotask.',
  },
  {
    patterns: [/closure/i, /lexical scope/i],
    title: 'Closures in JavaScript',
    concepts: [
      {
        id: 'lexical',
        label: 'Lexical Environment & Outer Scope Access',
        match: /(lexical|outer function|enclosing scope|outer variable|surrounding)/i,
        positive: 'Correctly explained that an inner function retains access to its outer lexical scope',
        negative: 'Did not specify how inner functions retain access to their outer lexical environment',
      },
      {
        id: 'retention',
        label: 'Variable Lifetime Beyond Outer Return',
        match: /(retains?|remembers?|persists?|after.*return|keeps? access|lives? on|closed over)/i,
        positive: 'Explained that variables persist in memory even after outer function execution terminates',
        negative: 'Missed explaining that outer scope variables survive outer function return',
      },
      {
        id: 'use_case',
        label: 'Practical Use Case',
        match: /(encapsulat|private|module|factory|curry|memoiz|state|handler)/i,
        positive: 'Provided a realistic use case (data encapsulation, private variables, or factories)',
        negative: 'Could include practical applications such as private state encapsulation or currying',
      },
    ],
    misconceptions: [
      {
        pattern: /(cannot\s+access\s+outer|variables?\s+are\s+destroyed\s+immediately)/i,
        description: 'Stated that variables are destroyed immediately or outer variables cannot be accessed.',
      },
    ],
    modelAnswer: 'A closure is an inner function that retains access to variables from its outer lexical scope even after that outer function has returned, enabling private data encapsulation and factories.',
  },
  {
    patterns: [/promise.*async.*await/i, /async.*await.*error/i, /promises and async/i],
    title: 'Promises and Async/Await',
    concepts: [
      {
        id: 'promises',
        label: 'Promise Mechanics & States',
        match: /(promise|resolve|reject|pending|fulfilled|settled)/i,
        positive: 'Accurately described Promise mechanics and resolution/rejection states',
        negative: 'Did not define Promise states or asynchronous resolution',
      },
      {
        id: 'async_await',
        label: 'Async/Await Syntax & Return Value',
        match: /(syntactic sugar|cleaner|synchronous.*look|awaits?|pauses?|returns.*promise)/i,
        positive: 'Noted async/await provides synchronous-looking syntax over Promises',
        negative: 'Did not mention async/await relationship to underlying Promises',
      },
      {
        id: 'error_handling',
        label: 'Error Handling with Try/Catch',
        match: /(try[\s-]catch|\.catch|catch block|error handling|reject)/i,
        positive: 'Correctly demonstrated error handling using try/catch blocks',
        negative: 'Did not explain error handling using try/catch or .catch()',
      },
    ],
    misconceptions: [
      {
        pattern: /(async\s+functions?\s+returns?\s+(a\s+)?(string|number|boolean|void|nothing\s+special))/i,
        description: 'Failed to recognize that async functions always return a Promise.',
      },
    ],
    modelAnswer: 'Promises represent eventual completion or failure of an asynchronous operation (pending, fulfilled, rejected). async/await is syntactic sugar over Promises, allowing cleaner non-blocking code, with errors handled via try/catch blocks.',
  },
  {
    patterns: [/==.*===/i, /difference.*==/i, /strict.*equality/i],
    title: 'Equality Operators (== vs ===)',
    concepts: [
      {
        id: 'coercion',
        label: 'Type Coercion in Loose Equality (==)',
        match: /(type coercion|coerc|converts? type|implicit conversion|loose)/i,
        positive: 'Correctly explained that == performs implicit type coercion before comparison',
        negative: 'Missed explaining type coercion in the loose equality (==) operator',
      },
      {
        id: 'strict',
        label: 'Strict Comparison in === (Type & Value)',
        match: /(strict|both type and value|without coercion|no conversion|same type)/i,
        positive: 'Accurately stated that === checks both type and value without coercion',
        negative: 'Did not emphasize that === strictly checks type and value without conversion',
      },
    ],
    misconceptions: [
      {
        pattern: /(==\s+(does\s+not|doesn't)\s+convert|==\s+checks\s+types?)/i,
        description: 'Incorrectly claimed loose equality (==) does not convert types.',
      },
      {
        pattern: /(===\s+converts\s+types?|===\s+does\s+type\s+coercion)/i,
        description: 'Incorrectly claimed strict equality (===) performs type coercion.',
      },
    ],
    modelAnswer: '== performs loose equality with implicit type coercion before comparing values. === performs strict equality, verifying that both operand type and value are identical without coercion.',
  },
  {
    patterns: [/prototypal inheritance/i, /prototype chain/i],
    title: 'Prototypal Inheritance in JavaScript',
    concepts: [
      {
        id: 'proto_chain',
        label: 'Prototype Chain Lookup',
        match: /(prototype chain|lookup|delegat|__proto__|object\.prototype|fallback)/i,
        positive: 'Explained property lookup traversal along the prototype chain',
        negative: 'Did not explain how properties are looked up along the prototype chain',
      },
      {
        id: 'prototype_object',
        label: 'Prototype Object & Delegation',
        match: /(prototype|inherits?|shared methods?|constructor|object\.create)/i,
        positive: 'Described object delegation and shared methods via the prototype property',
        negative: 'Did not clarify that objects inherit methods via prototype delegation',
      },
    ],
    misconceptions: [
      {
        pattern: /(javascript\s+uses\s+classical\s+inheritance|classes\s+are\s+not\s+prototypes)/i,
        description: 'Claimed JS has true classical inheritance (ES6 classes are syntactic sugar over prototypes).',
      },
    ],
    modelAnswer: 'JavaScript objects have an internal prototype reference (__proto__). When accessing a property, the engine searches the object, then traverses up the prototype chain until found or reaching null.',
  },
  {
    patterns: [/higher[\s-]order function/i, /map.*filter.*reduce/i],
    title: 'Higher-Order Functions in JavaScript',
    concepts: [
      {
        id: 'definition',
        label: 'Definition of Higher-Order Function',
        match: /(takes?.*function|returns?.*function|accepts?.*callback|first[\s-]class)/i,
        positive: 'Correctly defined higher-order function as accepting or returning other functions',
        negative: 'Did not define a higher-order function as one that accepts or returns functions',
      },
      {
        id: 'examples',
        label: 'Array Methods (map, filter, reduce)',
        match: /(map|filter|reduce|transform|accumulat|predicate)/i,
        positive: 'Demonstrated array transformation examples like map, filter, or reduce',
        negative: 'Did not explain standard examples such as map, filter, or reduce',
      },
    ],
    modelAnswer: 'A higher-order function is a function that either accepts another function as an argument (callback) or returns a function. Examples include map (transformation), filter (selection), and reduce (accumulation).',
  },
  {
    patterns: [/this.*arrow function/i, /arrow.*regular.*function/i, /this.*keyword/i],
    title: 'this Keyword: Arrow Functions vs Regular Functions',
    concepts: [
      {
        id: 'arrow_lexical',
        label: 'Arrow Functions Lexical this',
        match: /(arrow.*lexical|lexical.*this|enclosing scope|surrounding scope|does not have.*own this)/i,
        positive: 'Correctly explained that arrow functions do not bind their own this (lexical this)',
        negative: 'Did not state that arrow functions inherit this lexically from their enclosing scope',
      },
      {
        id: 'regular_dynamic',
        label: 'Regular Functions Dynamic Invocation Binding',
        match: /(regular.*call|how.*called|invocat|call.*apply.*bind|context|caller)/i,
        positive: 'Explained that regular functions determine this dynamically based on invocation context',
        negative: 'Did not explain dynamic invocation-time binding of this in regular functions',
      },
    ],
    misconceptions: [
      {
        pattern: /(arrow\s+functions?\s+have\s+their\s+own\s+this)/i,
        description: 'Claimed arrow functions have their own this binding (they inherit this lexically).',
      },
    ],
    modelAnswer: 'Regular functions bind this dynamically depending on how the function is invoked (or via call/apply/bind). Arrow functions do not have their own this; they capture this lexically from the enclosing lexical scope.',
  },

  // ─── React Core ────────────────────────────────────────────────────────────
  {
    patterns: [/reconciliation|virtual dom|diffing/i],
    title: 'React Virtual DOM and Reconciliation',
    concepts: [
      {
        id: 'vdom',
        label: 'In-Memory Representation',
        match: /(in[\s-]memory|virtual dom|vdom|javascript object|representation of.*dom)/i,
        positive: 'Explained Virtual DOM as a lightweight in-memory representation of the real DOM',
        negative: 'Did not clarify that Virtual DOM is an in-memory JS representation',
      },
      {
        id: 'diffing',
        label: 'Diffing Algorithm',
        match: /(diff|compare|previous.*new|tree|algorithm|o\(n\)|heuristic)/i,
        positive: 'Described diffing to identify changes between previous and current render trees',
        negative: 'Omitted how diffing compares prior and new component render trees',
      },
      {
        id: 'batching',
        label: 'Minimal Batched Real DOM Updates',
        match: /(batch|minimal|re-render|update.*real dom|patch|commit)/i,
        positive: 'Highlighted minimal, batched updates to the real DOM for high rendering performance',
        negative: 'Did not mention batching or minimal targeted updates to the real DOM',
      },
    ],
    misconceptions: [
      {
        pattern: /(virtual\s+dom\s+is\s+slower\s+than\s+manual\s+dom|replaces\s+the\s+entire\s+real\s+dom)/i,
        description: 'Incorrectly claimed Virtual DOM replaces the entire real DOM on each render.',
      },
    ],
    modelAnswer: 'React keeps a Virtual DOM tree in memory. When state updates, it diffs new and old trees using a heuristic algorithm to compute minimal real DOM operations and apply them in batches.',
  },
  {
    patterns: [/controlled.*uncontrolled/i, /controlled component/i],
    title: 'Controlled vs Uncontrolled Components in React',
    concepts: [
      {
        id: 'controlled',
        label: 'Controlled Component (React State Driven)',
        match: /(controlled.*(state|value|onchange|react)|single source of truth)/i,
        positive: 'Accurately stated controlled components have form data handled by React state',
        negative: 'Did not define controlled components as being driven by React state and onChange handlers',
      },
      {
        id: 'uncontrolled',
        label: 'Uncontrolled Component (DOM Refs)',
        match: /(uncontrolled.*(ref|dom|internal|queryselector)|useref)/i,
        positive: 'Accurately stated uncontrolled components store form state in the DOM accessed via refs',
        negative: 'Did not explain that uncontrolled components rely on the DOM and useRef',
      },
    ],
    modelAnswer: 'Controlled components have their input values driven by React state via value and onChange handlers. Uncontrolled components let the DOM manage input values, accessed using useRef.',
  },
  {
    patterns: [/usecallback.*usememo/i, /usememo.*usecallback/i],
    title: 'useCallback vs useMemo Hooks',
    concepts: [
      {
        id: 'use_callback',
        label: 'useCallback (Function Memoization)',
        match: /(usecallback.*(function|callback|reference)|memoiz.*function|prevent recreation)/i,
        positive: 'Correctly identified useCallback for memoizing function instances across renders',
        negative: 'Did not specify that useCallback memoizes function references',
      },
      {
        id: 'use_memo',
        label: 'useMemo (Value / Computation Memoization)',
        match: /(usememo.*(value|result|calculation|computed)|expensive calculation)/i,
        positive: 'Correctly identified useMemo for memoizing computed return values of expensive calculations',
        negative: 'Did not specify that useMemo memoizes computed values/results',
      },
      {
        id: 'dependencies',
        label: 'Dependency Array & Re-render Prevention',
        match: /(dependenc|re-render|child component|render cycle|props)/i,
        positive: 'Mentioned dependency arrays and preventing unnecessary child re-renders',
        negative: 'Could clarify how dependency arrays prevent unnecessary child renders',
      },
    ],
    misconceptions: [
      {
        pattern: /(usememo\s+(is\s+for|memoizes?)\s+functions?\s+and\s+usecallback\s+(is\s+for|memoizes?)\s+values?)/i,
        description: 'Swapped useCallback and useMemo purposes (useCallback memoizes functions; useMemo memoizes computed values).',
      },
    ],
    modelAnswer: 'useCallback memoizes a function definition across re-renders to prevent recreating function references. useMemo memoizes the computed result of an expensive calculation. Both rely on dependency arrays.',
  },
  {
    patterns: [/key.*props?.*list/i, /role.*of.*key/i],
    title: 'Role of Key Prop in React Lists',
    concepts: [
      {
        id: 'identity',
        label: 'Stable Element Identity in Diffing',
        match: /(identity|uniquely identif|diffing|reconciliation|track items?)/i,
        positive: 'Explained that keys provide a stable identity for items during reconciliation diffing',
        negative: 'Did not explain that keys give elements a unique identity for diffing',
      },
      {
        id: 'consequences',
        label: 'Avoiding Bugs & Unnecessary Re-mounts',
        match: /(reorder|index as key|state bug|unnecessary.*re-?render|performance|remount)/i,
        positive: 'Described pitfalls of missing keys or using array indices (state corruption, DOM thrashing)',
        negative: 'Did not mention problems caused by missing keys or index keys when items reorder',
      },
    ],
    modelAnswer: 'Keys give React a stable identity to track list items across renders during reconciliation. Without unique keys (or using array indices), reordering or filtering items can cause state corruption and unnecessary DOM mutations.',
  },

  // ─── CSS & Web Layouts ─────────────────────────────────────────────────────
  {
    patterns: [/box model|content-box.*border-box/i],
    title: 'CSS Box Model',
    concepts: [
      {
        id: 'layers',
        label: 'Four Box Layers (Content, Padding, Border, Margin)',
        match: /(content.*padding.*border.*margin|margin.*border.*padding.*content|content,?\s*padding)/i,
        positive: 'Accurately detailed content, padding, border, and margin layers',
        negative: 'Did not list the four box model layers (content, padding, border, margin)',
      },
      {
        id: 'box_sizing',
        label: 'content-box vs border-box',
        match: /(border-box.*includes?|content-box.*only|includes? padding.*border|box-sizing)/i,
        positive: 'Clearly explained that border-box includes padding and border in width/height calculations',
        negative: 'Missing comparison between standard content-box and border-box sizing',
      },
    ],
    misconceptions: [
      {
        pattern: /(border-box\s+includes?\s+margin)/i,
        description: 'Claimed border-box includes margins (border-box only includes content, padding, and border; margin is always external).',
      },
    ],
    modelAnswer: 'The CSS box model consists of content, padding, border, and margin. In content-box, width applies solely to the content. In border-box, width includes padding and border, preventing unexpected layout expansions.',
  },
  {
    patterns: [/flexbox.*grid|grid.*flexbox/i],
    title: 'CSS Flexbox vs CSS Grid',
    concepts: [
      {
        id: 'dimensions',
        label: 'Dimensionality (1D vs 2D)',
        match: /(one[\s-]dimensional|1d.*2d|two[\s-]dimensional|single axis|rows and columns)/i,
        positive: 'Correctly highlighted that Flexbox is 1-dimensional (row OR column) while Grid is 2-dimensional (rows AND columns)',
        negative: 'Did not articulate the core 1-dimensional (Flexbox) vs 2-dimensional (Grid) distinction',
      },
      {
        id: 'use_cases',
        label: 'Practical Use Cases',
        match: /(component|page layout|alignment|overall structure|nav|item)/i,
        positive: 'Provided relevant use cases (Flexbox for component flow/alignment, Grid for macro page layouts)',
        negative: 'Did not clarify when to choose Flexbox vs Grid in practical design',
      },
    ],
    misconceptions: [
      {
        pattern: /(flexbox\s+is\s+two[\s-]dimensional|flexbox\s+is\s+2d)/i,
        description: 'Claimed Flexbox is 2-dimensional (Flexbox is strictly 1-dimensional along a single axis).',
      },
    ],
    modelAnswer: 'Flexbox is 1-dimensional, aligning items along a single axis (row or column). CSS Grid is 2-dimensional, positioning elements simultaneously across rows and columns for macro page structures.',
  },
  {
    patterns: [/position.*absolute.*relative|relative.*absolute.*fixed.*sticky/i],
    title: 'CSS Positioning Properties',
    concepts: [
      {
        id: 'relative_absolute',
        label: 'Relative vs Absolute',
        match: /(relative.*normal flow|absolute.*nearest positioned ancestor|positioned parent|offset)/i,
        positive: 'Explained relative positioning from normal flow and absolute positioning relative to nearest positioned ancestor',
        negative: 'Did not clearly distinguish relative flow offset from ancestor-relative absolute positioning',
      },
      {
        id: 'fixed_sticky',
        label: 'Fixed vs Sticky',
        match: /(fixed.*viewport|sticky.*scroll|toggles?|viewport)/i,
        positive: 'Explained fixed (relative to viewport) and sticky (toggles between relative and fixed on scroll)',
        negative: 'Did not detail fixed (viewport relative) vs sticky (scroll threshold relative)',
      },
    ],
    modelAnswer: 'Relative offsets an element from its normal flow position. Absolute removes it from flow and positions relative to the nearest positioned ancestor. Fixed positions relative to the viewport. Sticky behaves as relative until a scroll threshold is met.',
  },
  {
    patterns: [/debounce.*throttl|throttl.*debounce/i],
    title: 'Debouncing vs Throttling',
    concepts: [
      {
        id: 'debounce',
        label: 'Debouncing (Delay After Inactivity)',
        match: /(debounce.*(delay|inactivity|timer|wait until|stops? typing|search))/i,
        positive: 'Correctly explained debouncing delays execution until a quiet period of inactivity occurs (e.g. search input)',
        negative: 'Did not explain that debouncing waits for a pause in events before invoking',
      },
      {
        id: 'throttle',
        label: 'Throttling (Fixed Time Intervals)',
        match: /(throttle.*(interval|rate limit|at most once|scroll|resize|regular))/i,
        positive: 'Correctly explained throttling limits execution to at most once per specified time interval (e.g. scroll handlers)',
        negative: 'Did not explain that throttling guarantees execution at a fixed periodic rate',
      },
    ],
    modelAnswer: 'Debouncing delays function execution until after a specified period of inactivity (ideal for search input). Throttling enforces a maximum frequency, executing at most once per interval (ideal for scroll or resize events).',
  },

  // ─── Backend, APIs & Systems ───────────────────────────────────────────────
  {
    patterns: [/non[\s-]blocking.*i\/o|node.*event loop/i, /single[\s-]thread.*multi[\s-]thread/i],
    title: 'Node.js Non-Blocking I/O Architecture',
    concepts: [
      {
        id: 'event_driven',
        label: 'Single-Threaded Event Loop & Libuv',
        match: /(single[\s-]thread|libuv|event[\s-]driven|thread pool|asynchronous)/i,
        positive: 'Explained single-threaded JavaScript execution combined with libuv thread pool for OS operations',
        negative: 'Did not mention the single-threaded event loop or libuv asynchronous foundation',
      },
      {
        id: 'non_blocking',
        label: 'Non-Blocking OS Delegation',
        match: /(delegat|os kernel|non[\s-]blocking|callback|does not wait|concurrency)/i,
        positive: 'Described non-blocking operations delegating I/O without stalling the main execution thread',
        negative: 'Did not explain how non-blocking I/O allows high concurrency without creating threads per request',
      },
    ],
    modelAnswer: 'Node.js uses a single-threaded event loop backed by libuv. Non-blocking I/O delegates network and disk calls to the OS kernel or worker thread pool, enabling thousands of concurrent connections without thread-per-request overhead.',
  },
  {
    patterns: [/rest.*api|restful/i],
    title: 'RESTful API Design Principles',
    concepts: [
      {
        id: 'verbs',
        label: 'Standard HTTP Verbs & Status Codes',
        match: /(get.*post|put|delete|status code|200|404|500|crud)/i,
        positive: 'Identified standard HTTP methods (GET, POST, PUT, DELETE) and appropriate status codes',
        negative: 'Did not mention standard HTTP verbs (GET, POST, PUT, DELETE) or status codes',
      },
      {
        id: 'stateless_resources',
        label: 'Statelessness & Resource-Oriented URIs',
        match: /(stateless|resource|uri|noun|plural|endpoint)/i,
        positive: 'Emphasized resource-oriented nouns in URIs and stateless request handling',
        negative: 'Omitted the core principles of statelessness and resource-based URI endpoints',
      },
    ],
    modelAnswer: 'REST APIs are stateless and resource-oriented. Endpoints use noun-based URIs (e.g. /users) with standard HTTP verbs (GET, POST, PUT, DELETE) and standardized HTTP status codes (200, 201, 400, 404, 500).',
  },
  {
    patterns: [/jwt|json web token/i],
    title: 'JWT Authentication',
    concepts: [
      {
        id: 'structure',
        label: 'Three-Part Structure (Header, Payload, Signature)',
        match: /(header.*payload.*signature|three parts|claims|signature)/i,
        positive: 'Identified the 3 components: Header, Payload, and Signature',
        negative: 'Did not describe the Header, Payload, and Signature structure',
      },
      {
        id: 'stateless',
        label: 'Stateless Cryptographic Verification',
        match: /(stateless|no session.*db|secret|verify|cryptograph|signed)/i,
        positive: 'Explained stateless token verification using cryptographic signatures without DB lookups',
        negative: 'Did not highlight that JWTs are verified statelessly via cryptographic signatures',
      },
    ],
    misconceptions: [
      {
        pattern: /(jwt\s+is\s+encrypted\s+by\s+default|payload\s+is\s+hidden)/i,
        description: 'Incorrectly claimed JWT payloads are encrypted (JWTs are base64-encoded and signed, not encrypted by default).',
      },
    ],
    modelAnswer: 'JWTs are compact, stateless tokens comprising Header, Payload, and Signature. Servers verify authenticity cryptographically using a secret or public key without querying session databases.',
  },
  {
    patterns: [/database index|indexing/i],
    title: 'Database Indexing',
    concepts: [
      {
        id: 'mechanism',
        label: 'Lookup Data Structure (B-Tree)',
        match: /(b[\s-]tree|data structure|fast.*lookup|pointer|binary tree|search|log.*n)/i,
        positive: 'Explained that indexes use data structures (like B-Trees) for rapid O(log n) lookups',
        negative: 'Did not explain how an index data structure speeds up querying compared to full table scans',
      },
      {
        id: 'tradeoff',
        label: 'Write Overhead & Storage Trade-off',
        match: /(write.*overhead|slower.*insert|slower.*update|storage|disk|memory)/i,
        positive: 'Correctly identified the trade-off: faster read queries at the expense of slower writes and disk usage',
        negative: 'Omitted the trade-off of write penalties and storage costs',
      },
    ],
    modelAnswer: 'Database indexes use data structures like B-Trees to provide fast O(log n) lookups instead of full table scans, with the trade-off of slower write operations and extra disk usage.',
  },
  {
    patterns: [/sql.*nosql|nosql.*sql/i],
    title: 'SQL vs NoSQL Databases',
    concepts: [
      {
        id: 'structure',
        label: 'Schema & Relational Structure',
        match: /(relational|schema|tables?|document|key[\s-]value|flexible|unstructured)/i,
        positive: 'Distinguished relational table schemas (SQL) from flexible document/key-value models (NoSQL)',
        negative: 'Did not contrast rigid relational schemas with flexible NoSQL data models',
      },
      {
        id: 'scaling_acid',
        label: 'Scaling & Consistency (ACID vs Horizontal)',
        match: /(acid|vertical.*horizontal|scale|transaction|distributed)/i,
        positive: 'Mentioned ACID transactions in SQL vs horizontal scaling/eventual consistency in NoSQL',
        negative: 'Missing discussion of ACID compliance or horizontal scaling characteristics',
      },
    ],
    modelAnswer: 'SQL databases are relational with structured schemas and ACID compliance (e.g. Postgres). NoSQL databases provide flexible schemas and scale horizontally for unstructured or rapid-growth data (e.g. MongoDB).',
  },
  {
    patterns: [/database transaction|acid/i],
    title: 'Database Transactions and ACID Properties',
    concepts: [
      {
        id: 'acid',
        label: 'ACID Components (Atomicity, Consistency, Isolation, Durability)',
        match: /(atomicity.*consistency|all or nothing|isolation|durability|commit|rollback)/i,
        positive: 'Explained ACID principles: Atomicity (all-or-nothing), Consistency, Isolation, and Durability',
        negative: 'Did not explain ACID transaction properties (Atomicity, Consistency, Isolation, Durability)',
      },
      {
        id: 'rollback',
        label: 'Commit and Rollback Behavior',
        match: /(rollback|commit|revert|failure|crash)/i,
        positive: 'Explained that errors trigger a rollback to maintain data integrity',
        negative: 'Omitted explaining how rollbacks prevent corrupt or partial state',
      },
    ],
    modelAnswer: 'Transactions guarantee ACID: Atomicity (all operations succeed or all rollback), Consistency (valid state transitions), Isolation (concurrent transactions do not interfere), and Durability (committed changes persist).',
  },
  {
    patterns: [/cors/i, /cross[\s-]origin/i],
    title: 'CORS (Cross-Origin Resource Sharing)',
    concepts: [
      {
        id: 'security_model',
        label: 'Same-Origin Policy Enforcement',
        match: /(same[\s-]origin|browser.*security|origin|domain|protocol|port)/i,
        positive: 'Correctly explained CORS as a browser security mechanism enforcing the Same-Origin Policy',
        negative: 'Did not explain that CORS is a browser security mechanism based on origin headers',
      },
      {
        id: 'headers_preflight',
        label: 'Headers & Preflight (OPTIONS) Requests',
        match: /(access-control-allow|preflight|options request|headers)/i,
        positive: 'Noted Access-Control-Allow-Origin headers and preflight OPTIONS requests for non-simple requests',
        negative: 'Missing mention of Access-Control response headers or preflight OPTIONS requests',
      },
    ],
    misconceptions: [
      {
        pattern: /(cors\s+is\s+enforced\s+by\s+the\s+backend|postman\s+blocks\s+cors)/i,
        description: 'Incorrectly claimed CORS is enforced by backends or curl (CORS is strictly enforced by web browsers).',
      },
    ],
    modelAnswer: 'CORS is a browser security policy preventing unauthorized cross-origin requests. Servers respond with headers like Access-Control-Allow-Origin, and browsers issue preflight OPTIONS requests before complex operations.',
  },
  {
    patterns: [/docker.*virtual machine|docker.*vm|container.*vm/i],
    title: 'Docker Containers vs Virtual Machines',
    concepts: [
      {
        id: 'kernel',
        label: 'Shared Kernel vs Guest OS',
        match: /(host kernel|shared kernel|guest os|hypervisor|isolated)/i,
        positive: 'Accurately stated that containers share the host kernel while VMs run dedicated guest OSes on a hypervisor',
        negative: 'Did not clarify that containers share the host OS kernel unlike full VMs',
      },
      {
        id: 'efficiency',
        label: 'Resource Efficiency & Boot Speed',
        match: /(lightweight|fast.*boot|less overhead|resource|heavy|megabytes)/i,
        positive: 'Highlighted containers as lightweight with instant startup and low resource footprint',
        negative: 'Did not contrast the resource efficiency and boot times of containers vs VMs',
      },
    ],
    misconceptions: [
      {
        pattern: /(containers?\s+(contain|have|run)\s+(their\s+own\s+)?(full\s+)?kernel)/i,
        description: 'Claimed Docker containers run their own OS kernel (containers share the host operating system kernel).',
      },
    ],
    modelAnswer: 'Containers virtualize at the OS level, sharing the host kernel for lightweight isolation and instant startup. VMs virtualize hardware via a hypervisor, running complete, heavier guest operating systems.',
  },

  // ─── Algorithms & CS Foundations ───────────────────────────────────────────
  {
    patterns: [/binary search/i],
    title: 'Binary Search Algorithm and Complexity',
    concepts: [
      {
        id: 'prerequisite',
        label: 'Sorted Array Requirement',
        match: /(sorted|in order|ordered array)/i,
        positive: 'Correctly noted that the dataset must be sorted beforehand',
        negative: 'Did not specify that binary search strictly requires a sorted collection',
      },
      {
        id: 'complexity',
        label: 'O(log n) Complexity & Divide-and-Conquer',
        match: /(o\(log\s*n\)|logarithmic|halv|divide and conquer)/i,
        positive: 'Accurately stated O(log n) logarithmic time complexity via divide-and-conquer',
        negative: 'Missing explicit mention of O(log n) logarithmic time complexity',
      },
    ],
    misconceptions: [
      {
        pattern: /(binary\s+search\s+works\s+on\s+unsorted|o\(n\s*log\s*n\)\s+search\s+time)/i,
        description: 'Claimed binary search works on unsorted arrays (it strictly requires sorted data).',
      },
    ],
    modelAnswer: 'Binary search finds elements in a sorted array in O(log n) time by repeatedly halving the search interval using divide-and-conquer.',
  },
  {
    patterns: [/bfs.*dfs|dfs.*bfs/i],
    title: 'Breadth-First Search (BFS) vs Depth-First Search (DFS)',
    concepts: [
      {
        id: 'data_structures',
        label: 'Queue (BFS) vs Stack/Recursion (DFS)',
        match: /(bfs.*queue|dfs.*stack|recursion|fifo|lifo)/i,
        positive: 'Accurately paired BFS with queues (FIFO) and DFS with stacks/recursion (LIFO)',
        negative: 'Did not pair BFS with queues or DFS with stacks/recursion',
      },
      {
        id: 'traversal_use_cases',
        label: 'Level-Order / Shortest Path vs Pathfinding',
        match: /(level[\s-]order|shortest path|deep|backtrack|connected|cycle)/i,
        positive: 'Explained BFS for shortest paths in unweighted graphs and DFS for backtracking or cycle detection',
        negative: 'Did not explain practical use cases (BFS for shortest path; DFS for backtracking/topological sort)',
      },
    ],
    modelAnswer: 'BFS traverses level-by-level using a queue, ideal for finding shortest paths in unweighted graphs. DFS explores deeply down branches using a stack or recursion, ideal for backtracking and cycle detection.',
  },
  {
    patterns: [/hash table|hash map.*collision/i],
    title: 'Hash Tables and Collision Resolution',
    concepts: [
      {
        id: 'mechanism',
        label: 'Hash Function & O(1) Lookup',
        match: /(hash function|key[\s-]value|o\(1\)|constant time|bucket|index)/i,
        positive: 'Explained hash function converting keys into bucket indices for average O(1) access',
        negative: 'Did not explain how hash functions map keys to array indices in average O(1) time',
      },
      {
        id: 'collisions',
        label: 'Collision Resolution (Chaining vs Open Addressing)',
        match: /(chaining|linked list|open addressing|linear probing|collision)/i,
        positive: 'Detailed collision handling strategies like separate chaining or open addressing',
        negative: 'Did not describe collision resolution mechanisms (chaining or open addressing)',
      },
    ],
    modelAnswer: 'A hash table maps keys to array indices via a hash function for O(1) average lookup. Collisions (different keys hashing to the same index) are resolved using chaining (linked lists per bucket) or open addressing (probing).',
  },
];

/**
 * Universal Technical Keyword & Terminology Dictionary
 */
const TECHNICAL_TERMS = new Set([
  'scope', 'closure', 'hoisting', 'prototype', 'promise', 'async', 'await',
  'reconciliation', 'component', 'props', 'state', 'hook', 'memoize', 'callback',
  'dom', 'vdom', 'render', 'lifecycle', 'context', 'redux', 'event', 'handler',
  'api', 'rest', 'graphql', 'http', 'json', 'jwt', 'auth', 'database', 'sql',
  'nosql', 'query', 'index', 'table', 'schema', 'transaction', 'acid', 'latency',
  'cache', 'redis', 'scaling', 'docker', 'container', 'kubernetes', 'cloud',
  'complexity', 'algorithm', 'runtime', 'stack', 'queue', 'tree', 'hash',
  'flexbox', 'grid', 'css', 'margin', 'padding', 'border', 'responsive',
  'server', 'client', 'middleware', 'token', 'session', 'microservice'
]);

/**
 * Clean and normalize text
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().replace(/[`'".,\/#!$%\^&\*;:{}=\-_~()]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Strict Technical Evaluation of Candidate Answer
 */
function evaluateAnswer({ questionText, questionType, transcript }) {
  const answer = (transcript || '').trim();

  // If no answer or purely empty/whitespace
  if (!answer || answer.length === 0) {
    return {
      accuracyScore: 0,
      relevanceScore: 0,
      reasoningScore: 0,
      communicationScore: 0,
      overallQuestionScore: 0,
      marksAwarded: 0,
      marksLost: 100,
      verdict: 'No Answer Provided',
      summary: 'No response was recorded for this question.',
      strengths: [],
      missing: ['Question was skipped or submitted without an answer.'],
      deductions: [
        {
          reason: 'No Response Submitted',
          detail: 'No candidate answer was provided for evaluation.',
          pointsDeducted: 100,
          type: 'unanswered',
        },
      ],
      howToImprove: ['Attempt every interview question by stating core definitions and relevant mechanisms.'],
      misconceptions: [],
      keyConceptsCovered: [],
      keyConceptsExpected: [],
      modelAnswer: '',
    };
  }

  const cleanedAnswer = cleanText(answer);
  const words = cleanedAnswer.split(' ').filter(Boolean);

  // Check if answer is just trivial dismissal ("idk", "no idea", "pass", "skip")
  if (words.length <= 5 && /(i don'?t know|no idea|pass|skip|not sure|dunno|no comment)/i.test(answer)) {
    return {
      accuracyScore: 0,
      relevanceScore: 0,
      reasoningScore: 0,
      communicationScore: 10,
      overallQuestionScore: 0,
      marksAwarded: 0,
      marksLost: 100,
      verdict: 'Did Not Attempt Answer',
      summary: 'Candidate explicitly opted out or indicated unfamiliarity with the topic.',
      strengths: [],
      missing: ['Candidate did not provide a technical explanation.'],
      deductions: [
        {
          reason: 'Question Passed / Unanswered',
          detail: 'Expressed uncertainty without providing technical concepts.',
          pointsDeducted: 100,
          type: 'unanswered',
        },
      ],
      howToImprove: ['Share any partial knowledge, relevant keywords, or conceptual associations rather than skipping.'],
      misconceptions: [],
      keyConceptsCovered: [],
      keyConceptsExpected: [],
      modelAnswer: '',
    };
  }

  // 1. Check if question matches our curated knowledge base
  const kbEntry = KNOWLEDGE_BASE.find((entry) =>
    entry.patterns.some((p) => p.test(questionText))
  );

  if (kbEntry) {
    const coveredConcepts = [];
    const missingConcepts = [];
    const strengths = [];
    const missing = [];
    const deductions = [];
    const howToImprove = [];
    const misconceptionsDetected = [];

    // Check for explicit misconceptions / false statements
    if (kbEntry.misconceptions && kbEntry.misconceptions.length > 0) {
      for (const m of kbEntry.misconceptions) {
        if (m.pattern.test(answer)) {
          misconceptionsDetected.push(m.description);
        }
      }
    }

    const totalConcepts = kbEntry.concepts.length;
    const ptsPerConcept = Math.round(85 / totalConcepts);

    // Check concept coverage
    for (const c of kbEntry.concepts) {
      if (c.match.test(answer)) {
        coveredConcepts.push(c.label);
        strengths.push(`${c.positive} (+${ptsPerConcept} pts)`);
      } else {
        missingConcepts.push(c.label);
        missing.push(c.negative);
        deductions.push({
          reason: `Missing Concept: ${c.label}`,
          detail: c.negative,
          pointsDeducted: ptsPerConcept,
          type: 'missing_concept',
        });
        howToImprove.push(`Include "${c.label}": Explicitly explain that ${c.positive.toLowerCase()}`);
      }
    }

    const hitCount = coveredConcepts.length;
    const conceptRatio = totalConcepts > 0 ? hitCount / totalConcepts : 1.0;

    // Check for causal reasoning indicators (why / how / trade-offs)
    const hasReasoning = /(because|since|therefore|as a result|whereas|means that|in order to|prevents|trade[\s-]off|advantage|drawback|benefit|specifically|for example)/i.test(answer);

    // STRICT ACCURACY SCORING
    let accuracyScore = 0;
    let relevanceScore = 0;
    let reasoningScore = 0;
    let communicationScore = 0;

    if (hitCount === 0) {
      accuracyScore = 0;
      relevanceScore = 15;
      reasoningScore = 0;
      communicationScore = 20;
      deductions.push({
        reason: 'Zero Essential Concepts Covered',
        detail: 'The response did not contain any of the required core technical concepts.',
        pointsDeducted: 100,
        type: 'unanswered',
      });
      howToImprove.push(`To master this topic, study: ${kbEntry.concepts.map((c) => c.label).join(', ')}.`);
    } else if (conceptRatio >= 1.0) {
      accuracyScore = hasReasoning ? 100 : 92;
      relevanceScore = 100;
      reasoningScore = hasReasoning ? 95 : 85;
      communicationScore = 95;
    } else {
      accuracyScore = Math.round(conceptRatio * 85 + (hasReasoning ? 8 : 0));
      relevanceScore = Math.min(100, Math.round(40 + conceptRatio * 60));
      reasoningScore = Math.min(100, Math.round(conceptRatio * 75 + (hasReasoning ? 25 : 0)));
      communicationScore = Math.min(90, Math.round(50 + conceptRatio * 40));
    }

    // STRICT PENALTY: Misconceptions detected
    if (misconceptionsDetected.length > 0) {
      accuracyScore = Math.min(25, Math.max(0, accuracyScore - 45));
      reasoningScore = Math.min(25, reasoningScore - 40);
      for (const m of misconceptionsDetected) {
        deductions.push({
          reason: 'Factual Error / Technical Misconception',
          detail: m,
          pointsDeducted: 40,
          type: 'misconception',
        });
        howToImprove.push(`Correction: ${m}`);
      }
    }

    if (!hasReasoning && hitCount > 0) {
      deductions.push({
        reason: 'Lacks Analytical Depth / Trade-offs',
        detail: 'Explained basic definitions, but missed underlying mechanism, performance implications, or practical trade-offs.',
        pointsDeducted: 10,
        type: 'reasoning',
      });
      howToImprove.push('Explain the "why" and trade-offs: detail how this operates under the hood or why it is designed this way.');
    }

    // Strict weighting: Accuracy is 70%, Relevance 15%, Reasoning 15%
    let overallQuestionScore = Math.round(
      accuracyScore * 0.70 +
      relevanceScore * 0.15 +
      reasoningScore * 0.15
    );

    if (accuracyScore < 50) {
      overallQuestionScore = Math.min(overallQuestionScore, accuracyScore);
    }

    const marksAwarded = overallQuestionScore;
    const marksLost = Math.max(0, 100 - marksAwarded);

    // Strict professional verdict
    let verdict = 'Incorrect / Inaccurate';
    if (accuracyScore >= 90) verdict = 'Exceptional / Production-Grade';
    else if (accuracyScore >= 75) verdict = 'Technically Sound / Competent';
    else if (accuracyScore >= 50) verdict = 'Partially Correct / Incomplete Coverage';
    else if (accuracyScore >= 25) verdict = 'Substandard / Major Nuances Missing';
    else verdict = misconceptionsDetected.length ? 'Flawed / Misconceptions Detected' : 'Inaccurate / Unsatisfactory';

    let summary = '';
    if (accuracyScore >= 85) {
      summary = `Verified accurate technical understanding of ${coveredConcepts.join(', ')}.`;
    } else if (accuracyScore >= 50) {
      summary = `Partially correct: accurately addressed ${coveredConcepts.join(', ')}, but missed ${missingConcepts.join(', ')}.`;
    } else if (misconceptionsDetected.length > 0) {
      summary = `Factual errors detected: ${misconceptionsDetected[0]}`;
    } else {
      summary = `Inaccurate or incomplete response. Expected verified coverage of: ${missingConcepts.join(', ')}.`;
    }

    return {
      accuracyScore,
      relevanceScore,
      reasoningScore,
      communicationScore,
      overallQuestionScore,
      marksAwarded,
      marksLost,
      verdict,
      summary,
      strengths: strengths.length ? strengths : ['Attempted response'],
      missing: missing.length ? missing : ['Excellent answer coverage with no major omissions'],
      deductions,
      howToImprove: howToImprove.length ? howToImprove : ['Maintain this level of technical precision and depth.'],
      misconceptions: misconceptionsDetected,
      keyConceptsCovered: coveredConcepts,
      keyConceptsExpected: kbEntry.concepts.map((c) => c.label),
      modelAnswer: kbEntry.modelAnswer,
    };
  }

  // ── 2. Universal Semantic Evaluator (Strict Semantic Analysis) ─────────────
  const qTokens = cleanText(questionText)
    .split(' ')
    .filter((w) => w.length > 3 && !['what', 'when', 'where', 'which', 'explain', 'describe', 'difference', 'between', 'how', 'does', 'would', 'your', 'with', 'from', 'this', 'that'].includes(w));

  const matchedQTokens = qTokens.filter((token) => cleanedAnswer.includes(token));
  const qTokenMatchRatio = qTokens.length > 0 ? matchedQTokens.length / qTokens.length : 0.0;

  const techTermsUsed = words.filter((w) => TECHNICAL_TERMS.has(w));
  const uniqueTechTerms = new Set(techTermsUsed);

  const hasReasoning = /(because|since|therefore|as a result|whereas|means that|in order to|prevents|trade[\s-]off|advantage|drawback|benefit|specifically|for example)/i.test(answer);

  const deductions = [];
  const howToImprove = [];

  let accuracyScore = 0;
  let relevanceScore = 0;
  let reasoningScore = 0;
  let communicationScore = 0;

  if (matchedQTokens.length === 0 && uniqueTechTerms.size === 0) {
    accuracyScore = 0;
    relevanceScore = 0;
    reasoningScore = 0;
    communicationScore = 15;
    deductions.push({
      reason: 'No Relevant Technical Terms or Core Concepts',
      detail: 'The answer did not reference any specific technical topics from the question prompt.',
      pointsDeducted: 100,
      type: 'unanswered',
    });
    howToImprove.push(`Address the central question topics directly: ${qTokens.slice(0, 3).join(', ')}.`);
  } else {
    const termScore = Math.min(uniqueTechTerms.size / 3, 1.0);
    accuracyScore = Math.round(qTokenMatchRatio * 55 + termScore * 35 + (hasReasoning ? 10 : 0));
    accuracyScore = Math.min(95, Math.max(0, accuracyScore));
    relevanceScore = Math.min(100, Math.round(qTokenMatchRatio * 80 + (uniqueTechTerms.size > 0 ? 20 : 0)));
    reasoningScore = Math.min(95, Math.round((hasReasoning ? 50 : 20) + termScore * 40));
    communicationScore = Math.min(90, Math.round(40 + termScore * 30 + (hasReasoning ? 20 : 0)));

    if (matchedQTokens.length < qTokens.length) {
      const unaddressed = qTokens.filter((t) => !matchedQTokens.includes(t));
      if (unaddressed.length) {
        const lost = Math.round((unaddressed.length / qTokens.length) * 45);
        deductions.push({
          reason: `Omitted Core Question Aspects: ${unaddressed.slice(0, 3).join(', ')}`,
          detail: 'Did not sufficiently address these central subjects asked in the prompt.',
          pointsDeducted: lost,
          type: 'missing_concept',
        });
        howToImprove.push(`Explicitly cover: ${unaddressed.slice(0, 3).join(', ')}.`);
      }
    }

    if (uniqueTechTerms.size < 2) {
      deductions.push({
        reason: 'Limited Domain Terminology',
        detail: 'Answer used casual phrasing instead of standard industry terminology.',
        pointsDeducted: 20,
        type: 'terminology',
      });
      howToImprove.push('Incorporate professional domain terms (e.g. data structures, lifecycles, or protocols).');
    }

    if (!hasReasoning) {
      deductions.push({
        reason: 'Lacks Cause-and-Effect Rationale',
        detail: 'Did not explain the rationale, trade-offs, or concrete production examples.',
        pointsDeducted: 15,
        type: 'reasoning',
      });
      howToImprove.push('Include cause-and-effect reasoning using "because", "as a result", or concrete practical trade-offs.');
    }
  }

  let overallQuestionScore = Math.round(
    accuracyScore * 0.70 +
    relevanceScore * 0.15 +
    reasoningScore * 0.15
  );

  if (accuracyScore < 50) {
    overallQuestionScore = Math.min(overallQuestionScore, accuracyScore);
  }

  const marksAwarded = overallQuestionScore;
  const marksLost = Math.max(0, 100 - marksAwarded);

  const strengths = [];
  if (matchedQTokens.length > 0) {
    strengths.push(`Directly referenced question domain: ${matchedQTokens.slice(0, 3).join(', ')}`);
  }
  if (hasReasoning) {
    strengths.push('Provided analytical cause-and-effect explanations');
  }
  if (uniqueTechTerms.size >= 1) {
    strengths.push(`Utilized domain terminology: ${[...uniqueTechTerms].slice(0, 3).join(', ')}`);
  }
  if (!strengths.length) strengths.push('Direct response to prompt');

  const missing = [];
  if (matchedQTokens.length < qTokens.length) {
    const unaddressed = qTokens.filter((t) => !matchedQTokens.includes(t));
    if (unaddressed.length) {
      missing.push(`Did not sufficiently articulate: ${unaddressed.slice(0, 3).join(', ')}`);
    }
  }
  if (!hasReasoning) {
    missing.push('Explain underlying mechanisms and trade-offs rather than surface definitions');
  }
  if (!missing.length) missing.push('Good answer precision');

  let verdict = 'Unsatisfactory';
  if (accuracyScore >= 85) verdict = 'High Technical Accuracy';
  else if (accuracyScore >= 70) verdict = 'Moderately Accurate';
  else if (accuracyScore >= 45) verdict = 'Partially Accurate';

  return {
    accuracyScore,
    relevanceScore,
    reasoningScore,
    communicationScore,
    overallQuestionScore,
    marksAwarded,
    marksLost,
    verdict,
    summary: `Strict technical evaluation: ${accuracyScore}% accuracy based on conceptual coverage and domain terminology.`,
    strengths,
    missing,
    deductions,
    howToImprove: howToImprove.length ? howToImprove : ['Good conceptual coverage.'],
    misconceptions: [],
    keyConceptsCovered: [...uniqueTechTerms].slice(0, 4),
    keyConceptsExpected: qTokens.slice(0, 4),
    modelAnswer: '',
  };
}

/**
 * Dynamic AI Follow-up Question Generator
 * Generates an intelligent, context-aware interrogation probe based on candidate response
 */
function generateFollowUpQuestion({ questionText, questionType, transcript, evaluationResult }) {
  const answer = (transcript || '').trim();
  const kbEntry = KNOWLEDGE_BASE.find((entry) =>
    entry.patterns.some((p) => p.test(questionText))
  );

  // If candidate gave no answer
  if (!answer || answer.length === 0) {
    return 'Could you provide the fundamental definition or an overview of this concept to get started?';
  }

  // If candidate had a misconception
  if (evaluationResult?.misconceptions?.length > 0) {
    return `In your answer, you noted that ${evaluationResult.misconceptions[0].toLowerCase().replace(/\.$/, '')}. How would you verify or test this behavior in practice?`;
  }

  // If question matches our Knowledge Base
  if (kbEntry) {
    // 1. If candidate missed key concepts, probe the missing concept directly
    if (evaluationResult?.missingConcepts?.length > 0) {
      const missed = evaluationResult.missingConcepts[0];
      if (/scop/i.test(missed)) {
        return 'Could you expand specifically on variable scoping: how do block-scoped and function-scoped variables differ inside loops or conditional blocks?';
      }
      if (/reassign|mutab/i.test(missed)) {
        return 'If a variable is declared with const as an object or array, can its properties or elements be modified? Why or why not?';
      }
      if (/hoist|tdz/i.test(missed)) {
        return 'What happens under the hood during the creation phase of the execution context, and what is the Temporal Dead Zone (TDZ)?';
      }
      if (/microtask/i.test(missed)) {
        return 'What is the exact execution priority between Promise microtasks and setTimeout callbacks when both are waiting to run?';
      }
      if (/lexical/i.test(missed)) {
        return 'Can you explain the role of the outer lexical environment record in allowing an inner function to access closed-over variables?';
      }
      if (/diff|reconcil/i.test(missed)) {
        return 'How does React optimize the diffing algorithm from an O(n³) tree comparison down to an O(n) heuristic reconciliation?';
      }
      if (/box-sizing|border-box/i.test(missed)) {
        return 'Why is `box-sizing: border-box` commonly set globally across modern web layouts, and what layout calculation bug does it prevent?';
      }
      if (/acid/i.test(missed)) {
        return 'In high-concurrency database transactions, which ACID isolation level prevents phantom reads, and what performance trade-off does it introduce?';
      }
      if (/stateless/i.test(missed)) {
        return 'Since JWT tokens are stateless, how do you handle immediate token invalidation if a user logs out or has their account compromised?';
      }
      return `Can you dive deeper into ${missed.toLowerCase()} and explain how it behaves in production?`;
    }

    // 2. If candidate had a high score (> 80%), ask an advanced senior probe
    if (evaluationResult?.accuracyScore >= 80) {
      if (/let.*const.*var/i.test(questionText)) {
        return 'In a loop with `for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }` vs using `let`, what prints out and why?';
      }
      if (/event loop/i.test(questionText)) {
        return 'What happens if a Promise microtask recursively queues another microtask via `queueMicrotask`? Does the event loop ever yield to render or run timers?';
      }
      if (/closure/i.test(questionText)) {
        return 'How do closures interact with JavaScript garbage collection, and how can retaining closures inadvertently cause memory leaks in Node.js?';
      }
      if (/reconciliation|virtual dom/i.test(questionText)) {
        return 'How does React 18+ concurrent rendering with Fiber prioritize user interactions over expensive background re-renders?';
      }
      if (/usecallback|usememo/i.test(questionText)) {
        return 'When is adding useCallback or useMemo actually detrimental to performance, and how do you profile when to use them?';
      }
      if (/flexbox.*grid/i.test(questionText)) {
        return 'In what specific UI scenario would you nest a Flexbox container inside a CSS Grid cell, and why?';
      }
      if (/jwt/i.test(questionText)) {
        return 'Where should JWT access tokens and refresh tokens be stored on the client to mitigate both XSS and CSRF attacks?';
      }
      if (/database index/i.test(questionText)) {
        return 'How does the B-Tree index structure handle range queries (e.g. `WHERE age BETWEEN 20 AND 30`) compared to a Hash index?';
      }
      if (/binary search/i.test(questionText)) {
        return 'How would you adapt standard binary search to find the first occurrence of a duplicate key in a sorted array containing repeated values?';
      }
      return 'What is the most critical architectural trade-off or failure mode of this approach under extreme high-load conditions?';
    }
  }

  // Universal fallback follow-up based on question type
  if (questionType === 'behavioral') {
    return 'What was the specific quantifiable business impact or user outcome of your decision, and what would you do differently today?';
  }
  if (questionType === 'scenario') {
    return 'If this issue reoccurred in production during peak traffic, what automated telemetry, health check, or circuit breaker would catch it first?';
  }
  return 'Could you walk through a concrete production example or discuss a key trade-off you encountered when working with this?';
}

/**
 * Evaluate Candidate's Follow-up Response
 * Awards up to +20 recovery/bonus points toward the question score
 */
function evaluateFollowUpAnswer({ followUpQuestion, followUpAnswer, originalEvaluation }) {
  const ans = (followUpAnswer || '').trim();
  if (!ans || ans.length < 5 || /(pass|skip|no idea|dunno|not sure)/i.test(ans)) {
    return {
      bonusPoints: 0,
      followUpAccuracy: 0,
      followUpFeedback: 'Follow-up question was skipped or unanswered. No recovery points awarded.',
      recoveryAchieved: false,
    };
  }

  const cleaned = cleanText(ans);
  const words = cleaned.split(' ').filter(Boolean);
  const techTermsUsed = words.filter((w) => TECHNICAL_TERMS.has(w));

  const hasReasoning = /(because|since|therefore|as a result|whereas|means that|in order to|prevents|trade[\s-]off|advantage|drawback|benefit|specifically|for example)/i.test(ans);

  // Score follow-up response
  let accuracy = Math.min(100, words.length * 4 + techTermsUsed.length * 15 + (hasReasoning ? 20 : 0));
  if (techTermsUsed.length === 0 && words.length < 10) {
    accuracy = 25;
  }

  // Bonus points proportional to accuracy (up to +20 pts)
  const bonusPoints = Math.round((accuracy / 100) * 20);

  const followUpFeedback = accuracy >= 75
    ? `Strong follow-up response: effectively addressed the interviewer's probe (+${bonusPoints} bonus points).`
    : accuracy >= 40
    ? `Partially addressed the follow-up inquiry (+${bonusPoints} bonus points).`
    : `Follow-up attempted, but lacked technical specifics (+${bonusPoints} points).`;

  return {
    bonusPoints,
    followUpAccuracy: accuracy,
    followUpFeedback,
    recoveryAchieved: bonusPoints > 0,
  };
}

module.exports = {
  evaluateAnswer,
  generateFollowUpQuestion,
  evaluateFollowUpAnswer,
  KNOWLEDGE_BASE,
};

