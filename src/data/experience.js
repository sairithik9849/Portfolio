export const EXPERIENCE = [
  {
    idx: 'EXEC.02',
    company: 'Stevens Institute of Technology',
    role: 'Systems Administrator',
    range: 'Nov 2024 — Present',
    location: 'Hoboken, NJ',
    status: 'RUNNING',
    bullets: [
      'Operate and harden a fleet of 50+ research-lab workstations across multiple departments.',
      'Authored Python / PowerShell automations that compressed manual data-entry workflows by 40%.',
      'Stood up Git-based CI/CD pipelines for internal tooling — provisioning, validation, deploy on push.',
      'On-call for incident triage, image rebuilds, and access-control audits.',
    ],
    stack: ['Python', 'PowerShell', 'Git', 'CI/CD', 'Active Directory', 'Bash'],
  },
  {
    idx: 'EXEC.01',
    company: 'Saras Analytics',
    role: 'Software Engineer',
    range: 'Jun 2023 — Aug 2024',
    location: 'Hyderabad, IN',
    status: 'EXITED',
    bullets: [
      'Architected scalable Node.js microservices sustaining 10M+ daily requests across product surface.',
      'Designed Redis caching + query-shape rewrites that cut p95 latency by 60% on hot paths.',
      'Shipped interactive React.js dashboards over TB-scale Snowflake datasets — pagination, drilldown, virtualised grids.',
      'Owned observability: structured logs, custom metrics, anomaly alerting through PagerDuty.',
    ],
    stack: ['Node.js', 'React', 'Redis', 'Snowflake', 'PostgreSQL', 'AWS'],
  },
]
