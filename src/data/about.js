export const RUNTIME_ENV = {
  kicker: '// RUNTIME ENV',
  degree: 'MS Computer Science',
  school: 'Stevens Institute of Technology',
  location: 'Hoboken, NJ',
  gpa: '4.0',
  status: 'Expected May 2026',
  concurrent: '// concurrent process: System Administrator · 50+ machine fleet',
}

export const PRIOR_PROCESS = {
  kicker: '// PRIOR PROCESS',
  title: 'Software Engineer',
  org: 'Saras Analytics',
  lines: [
    '> handled 10M+ daily transactions',
    '> architected Node.js microservices',
    '> Redis caching · −60% p99 latency',
  ],
}

export const STACK = [
  { id: 'python',     label: 'Python',      group: 'languages', fact: 'daily scripting, data pipelines, and automation workflows' },
  { id: 'js',        label: 'JavaScript',   group: 'languages', fact: 'Node.js microservices to React SPAs — the full JS continuum' },
  { id: 'cpp',       label: 'C++',          group: 'languages', fact: 'for systems work: memory layout, concurrency, and compiler internals' },
  { id: 'react',     label: 'React',        group: 'frontend',  fact: 'composable UIs with Framer Motion — this site is proof' },
  { id: 'postgres',  label: 'PostgreSQL',   group: 'stores',    fact: 'relational modeling, query planning, and index tuning' },
  { id: 'snowflake', label: 'Snowflake',    group: 'stores',    fact: '10M+ daily transaction analytics at Saras' },
  { id: 'redis',     label: 'Redis',        group: 'stores',    fact: 'caching layer that dropped p99 latency by 60%' },
]

export const STACK_GROUPS = [
  { key: 'languages', label: '// LANGUAGES' },
  { key: 'frontend',  label: '// FRONTEND'  },
  { key: 'stores',    label: '// STORES'    },
]

export const PROTOCOL = [
  { text: 'I ' },
  { text: 'vibe code.', emphasis: true },
  { text: ' I ship daily. I push tooling to its edge and treat AI as a ' },
  { text: 'force multiplier', emphasis: true },
  { text: ' — not a crutch.' },
]

export const OFF_HOURS = [
  {
    id: 'iron',
    kicker: '// OFF-HOURS / IRON',
    headline: 'Push · Pull · Legs',
    sub: '3-day split',
  },
  {
    id: 'rank',
    kicker: '// OFF-HOURS / RANK',
    headline: 'Diamond',
    sub: 'Marvel Rivals',
  },
  {
    id: 'input',
    kicker: '// HARDWARE / INPUT',
    headline: 'Epomaker Shadow X',
    sub: 'mechanical · daily driver',
  },
]
