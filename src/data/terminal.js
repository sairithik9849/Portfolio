// All terminal console copy lives here — the component owns presentation only.
//
// Line shapes:
//   ''                                     blank spacer
//   'plain string'                         unstyled text
//   { tone, text }                         single-toned line
//   { segments: [{ text, tone }] }         mixed-tone line
//   { type: 'pron',    label, value }      pronunciation line + play button
//   { type: 'metric',  value, suffix, label } count-up metric (e.g. impact)
//   { type: 'systems', nodes }             architecture viz
//   { type: 'project', name, purpose }     project name + supporting line
//   { type: 'links',   links: [...] }      contact link rows
//   { type: 'command-link', label, command, prefix } internal command link
//
// Tones: accent | gold | muted | strong

export const PROMPT = '~/sairithik'

// Ordered list of all runnable commands — drives autocomplete (no 'help').
// Derived from COMMANDS below; 'whoami' is prepended as the home command.
// Exported here so COMMANDS is the single source of truth.
export const COMMAND_IDS = ['whoami', 'impact', 'projects', 'systems', 'philosophy', 'journey', 'contact']

// ─── Default state ─────────────────────────────────────────────────────────────
export const WHOAMI = [
  { type: 'pron', label: 'name_pron', value: 'Sigh-RIH-thick / Koh-moo-ruh-VEL-lee' },
  {
    segments: [
      { text: 'friends_call_me', tone: 'muted' },
      { text: ' = ' },
      { text: '"Sai"', tone: 'strong' },
    ],
  },
  {
    segments: [
      { text: 'location', tone: 'muted' },
      { text: ' = ' },
      { text: '"NYC Metro Area"' },
    ],
  },
  '',
  {
    segments: [
      { text: 'mission', tone: 'muted' },
      { text: ' = ' },
      { text: '"Build systems people actually use"' },
    ],
  },
  {
    segments: [
      { text: 'obsession', tone: 'muted' },
      { text: ' = ' },
      { text: '"understanding first principles"' },
    ],
  },
  '',
  {
    segments: [
      { text: 'status', tone: 'muted' },
      { text: ' = ' },
      { text: '"Seeking New Grad SWE Roles"', tone: 'accent' },
    ],
  },
  { type: 'command-link', prefix: 'connect = ', label: 'Contact Me', command: 'contact' },
  '',
]

// ─── Commands ──────────────────────────────────────────────────────────────────
// featured: true  →  impact / systems / philosophy receive priority pill treatment.
// preview         →  short text shown in the status bar on hover.
export const COMMANDS = [
  {
    id: 'impact',
    hint: 'measurable outcomes',
    preview: '10M+ requests/day',
    featured: true,
    lines: [
      { type: 'metric', value: 10, suffix: 'M+', label: 'requests processed daily.' },
      '',
      'Built systems used in production,',
      'where performance and reliability matter.',
      '',
      { tone: 'strong', text: 'Measured outcomes over assumptions.' },
    ],
  },
  {
    id: 'projects',
    hint: "things I've built",
    preview: 'real, shipped work',
    featured: false,
    lines: [
      { type: 'project', name: 'AI Knowledge Agent',        purpose: 'infrastructure search & retrieval' },
      { type: 'project', name: 'Operations Dashboard',      purpose: 'tools used by internal teams' },
      { type: 'project', name: 'Multi-Agent SDLC Pipeline', purpose: 'accelerated development workflows' },
      '',
      { tone: 'muted', text: 'Built for real users, not demo videos.' },
    ],
  },
  {
    id: 'systems',
    hint: 'how I think',
    preview: 'architecture thinking',
    featured: true,
    lines: [
      { type: 'systems', nodes: ['React', 'APIs', 'Data', 'AI', 'Users'] },
      '',
      'I connect layers,',
      'not just isolated components.',
      '',
      { tone: 'muted', text: "The stack changes. Systems thinking doesn't." },
    ],
  },
  {
    id: 'philosophy',
    hint: 'engineering principles',
    preview: 'trust AI, verify',
    featured: true,
    lines: [
      { tone: 'accent', text: 'Trust AI. Verify outputs.' },
      '',
      'Understand first principles.',
      '',
      'Measure before optimizing.',
    ],
  },
  {
    id: 'journey',
    hint: 'my story',
    preview: 'India → scale',
    featured: false,
    lines: [
      {
        segments: [
          { text: 'India', tone: 'strong' },
          { text: ' → ' },
          { text: 'Stevens', tone: 'strong' },
          { text: ' → ' },
          { text: 'production at scale', tone: 'accent' },
        ],
      },
      '',
      'Started by asking "how does this work?"',
      'Now I ask "how does it hold at scale?"',
      '',
      { tone: 'muted', text: 'Same obsession. Higher stakes.' },
    ],
  },
  {
    id: 'contact',
    hint: "let's connect",
    preview: 'say hello',
    featured: false,
    lines: [
      {
        type: 'links',
        links: [
          {
            label: 'GitHub',
            display: 'github.com/sairithik9849',
            href: 'https://github.com/sairithik9849',
          },
          {
            label: 'LinkedIn',
            display: 'linkedin.com/in/sairithik-komuravelly-8348b124b',
            href: 'https://www.linkedin.com/in/sairithik-komuravelly-8348b124b/',
          },
          {
            label: 'Resume',
            display: 'drive.google.com/file/d/1KCAnYaT8Bo8mKDy8ydTlMxF37h0sDvIQ',
            href: 'https://drive.google.com/file/d/1KCAnYaT8Bo8mKDy8ydTlMxF37h0sDvIQ/view?usp=drive_link',
          },
          {
            label: 'Email',
            display: 'sairithik8639@gmail.com',
            href: 'mailto:sairithik8639@gmail.com',
          },
        ],
      },
    ],
  },
]
