export const PROJECTS = [
  {
    num: '01',
    name: 'AeroSense',
    role: 'Real-time aviation intelligence',
    blurb:
      'A 4D situational-awareness platform fusing live air-traffic streams with AI-driven anomaly detection. Mapbox GL renders the volumetric traffic field; a Redis ring buffer absorbs the firehose; Gemini summarises events into natural-language briefings.',
    stack: ['Mapbox GL', 'Redis', 'Gemini', 'WebSockets', 'Node', 'Postgres'],
    visual: 'aero',
  },
  {
    num: '02',
    name: 'MF Query Compiler',
    role: 'Database internals · query planner',
    blurb:
      'Rewrote a multi-feature query engine from a recursive enumeration of partition states — O(2ⁿ) — to a single linear pass with hash-based grouping. Operator pipeline emits a compact plan tree consumed by the execution layer.',
    stack: ['C++', 'LLVM IR', 'Postgres', 'Catalyst', 'Bench'],
    visual: 'mf',
  },
  {
    num: '03',
    name: 'SprintPay',
    role: 'Group expense ledger',
    blurb:
      'A multi-currency expense manager for shared households and trip groups. Recurring bills, OCR receipt uploads, OTP-secured auth, debt-graph minimisation, intelligent alerts. CI via GitHub Actions, pytest coverage on every push.',
    stack: ['Flask', 'SQLAlchemy', 'Tailwind', 'Pytest', 'GH Actions'],
    visual: 'spp',
  },
  {
    num: '04',
    name: 'LocalLens',
    role: 'Hyper-local social network',
    blurb:
      'A neighbourhood-scale social layer over the map: shareable posts, events, incidents, yard sales, anchored to a real-world coordinate. Built to make information legible at street-block resolution.',
    stack: ['Next.js', 'MongoDB', 'Firebase', 'Mapbox', 'Tailwind'],
    visual: 'll',
  },
  {
    num: '05',
    name: 'WindBorne Constellation',
    role: '24K-point real-time visualiser',
    blurb:
      "Full-stack monitor for WindBorne's high-altitude balloon constellation. Node backend reverse-engineers the undocumented telemetry feed; a high-performance Leaflet front renders 24,000+ live points; Gemini layers narrative insight over the trajectories.",
    stack: ['Node', 'Leaflet', 'Gemini', 'WebSockets'],
    visual: 'wb',
  },
  {
    num: '06',
    name: 'Scholario',
    role: 'Role-based LMS platform',
    blurb:
      'A learning-management platform with first-class RBAC. Student, TA, and admin dashboards each compose only the surface they\'re entitled to — permissions enforced server-side and reflected end-to-end through the routing layer.',
    stack: ['Node', 'MongoDB', 'Express', 'RBAC', 'JWT'],
    visual: 'sch',
  },
]
