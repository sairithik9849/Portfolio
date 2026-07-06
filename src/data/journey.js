// Journey chapters — all copy lives here; never hardcoded in components.
//
// Each chapter is a *scene*: a hero quote (always the dominant element) plus
// a bespoke featured visual selected by `scene`, unified by a shared grammar
// (spine, sticky year marker, label, deck, metadata, skill chips). See
// docs/journey.md for the full contract and `src/components/journey/scenes/`
// for the scene components this `scene` key selects between.
//
// No emoji anywhere — `metadata[].icon` is a key into the monoline SVG set
// in `src/components/journey/MetaIcon.jsx`.
//
// `deck` may wrap one short phrase in `**double-asterisks**` to mark it for
// gold (--accent-2) italic emphasis — parsed by
// `src/lib/journey/deckEmphasis.js` and rendered by QuoteBlock.jsx /
// JourneyMobile.jsx. Keep the marked phrase short (under ~50 characters) so
// it never wraps past a line or two — see docs/journey.md.
//
// Entry order drives both the timeline's stacking order and the avatar's
// frame mapping — there is no per-entry frame range; the avatar frame is
// driven by normalized scroll progress across the whole sequence.
export const JOURNEY = [
  {
    id: 'origin',
    year: '2019',
    label: 'Beginnings',
    quote: ['Before I knew', 'what I was', 'doing.'],
    deck: 'Four years of learning the fundamentals, solving countless problems, and discovering that I genuinely enjoy building software. This was where I built my understanding of algorithms, systems, databases, and software engineering principles. More importantly, it taught me to **think critically, stay curious, and keep improving** with every project I built.',
    scene: 'foundation',
    visual: {},
    metadata: [
      { icon: 'location', text: 'Hyderabad, India' },
      { icon: 'degree', text: 'B.E. Computer Science & Engineering' },
      { icon: 'institution', text: 'MGIT', href: 'https://mgit.ac.in/' },
    ],
    skills: ['Algorithms', 'Data Structures', 'Operating Systems', 'Databases'],
  },
  {
    id: 'saras',
    year: '2021',
    label: 'First Real Project',
    quote: ['Real users', 'are the best', 'teachers.'],
    deck: "I kept Node.js microservices running under **10 million requests a day**, where every slow response meant a dashboard hanging in front of a real user. I added Redis caching in front of the database with circuit breakers built in, so the system could serve most requests from memory and only hit the database when it needed to.",
    scene: 'scale',
    visual: {
      latency: { value: 60, prefix: '−', suffix: '%', unit: 'latency' },
      threadCount: 4,
    },
    metadata: [
      { icon: 'role', text: 'Software Engineer' },
      { icon: 'institution', text: 'Saras Analytics', href: 'https://www.sarasanalytics.com/' },
      { icon: 'location', text: 'Hyderabad, India' },
    ],
    skills: ['Node.js', 'Redis', 'Snowflake', 'React'],
  },
  {
    id: 'usa',
    year: '2022',
    label: 'New Horizons',
    quote: ['I crossed', 'an ocean', 'to bet on myself.'],
    deck: "Moving halfway across the world was about more than earning a Master's degree. It challenged me to **adapt, become independent, and grow** both as an engineer and as a person. Every unfamiliar experience became an opportunity to learn something new.",
    scene: 'leap',
    visual: {
      route: { from: 'India', to: 'United States' },
    },
    metadata: [
      { icon: 'location', text: 'Hoboken, NJ' },
      { icon: 'degree', text: 'M.S. Computer Science' },
      { icon: 'institution', text: 'Stevens Institute of Technology', href: 'https://www.stevens.edu/' },
    ],
    skills: ['Distributed Systems', 'Systems Design', 'Research'],
  },
  {
    id: 'stevens',
    year: '2023',
    label: 'Enabling Others',
    quote: ['I built tools', 'that helped others', 'move faster.'],
    deck: "My focus shifted from building features to building foundations. From managing lab infrastructure to automating everyday tasks, I learned that **small improvements can create a lasting impact** when they make other people's work easier.",
    scene: 'build',
    visual: {},
    metadata: [
      { icon: 'server', text: 'Managed 50+ Lab Workstations' },
      { icon: 'workflow', text: 'Automated Python Workflows' },
      { icon: 'database', text: 'Optimized System Architecture' },
    ],
    skills: ['Infrastructure', 'Tooling', 'Automation'],
  },
  {
    id: 'today',
    year: 'Present',
    label: 'Today',
    quote: ['Now I build', 'software that', 'thinks for itself.'],
    deck: 'Designing autonomous systems where large language models retrieve context and execute multi-step logic. Focused on building **resilient agentic workflows** and writing the technical narratives that make complex systems understandable.',
    scene: 'today',
    visual: {},
    metadata: [
      { icon: 'terminal', text: 'Custom Claude Code Workflows' },
      { icon: 'network', text: 'Engineered MCP Servers' },
      { icon: 'cogbolt', text: 'Agentic Harness Orchestration' },
    ],
    skills: ['Claude Code', 'Agentic Harnesses', 'AI Skill Writing'],
  },
]
