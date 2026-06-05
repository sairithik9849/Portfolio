/**
 * widViz — per-viz diagram labels, metrics, and glyph content.
 * Keyed by whatIDo.js id. No copy lives in the component files.
 */
export const WID_VIZ = {
  systems: {
    kicker:    '// 03·01',
    mode:      'SYSTEMS',
    // Grid dot count (target — rendered as rows × cols)
    dotRows:   7,
    dotCols:   7,
    // Indices of the two nodes that participate in the heal cycle
    healTargets: [16, 32],
    statusLabel: 'INFRA STATUS',
    aliveLabel:  'NOMINAL',
    nodeLabel:   'NODE',
    healLabel:   'HEALING',
  },

  backend: {
    kicker:  '// 03·02',
    mode:    'BACKEND',
    layers:  ['EDGE', 'API', 'CACHE', 'DB'],
    hitLabel:  'CACHE HIT',
    missLabel: 'CACHE MISS',
    sparkLabel: 'LATENCY',
    // p-values shown in the sparkline legend
    p50: 'p50 · 4ms',
    p99: 'p99 · 28ms',
    reqLabel: 'REQ',
    rpsLabel: '10M req/day',
  },

  data: {
    kicker: '// 03·03',
    mode:   'DATA',
    // Query-plan nodes in topological order (parent → children)
    planNodes: [
      { id: 'scan',      label: 'SEQ SCAN',    depth: 0 },
      { id: 'filter',    label: 'FILTER',       depth: 1 },
      { id: 'hashgroup', label: 'HASH GROUP',   depth: 2 },
      { id: 'project',   label: 'PROJECT',      depth: 3 },
      { id: 'emit',      label: 'EMIT',         depth: 4 },
    ],
    // Edges: [fromId, toId]
    planEdges: [
      ['scan', 'filter'],
      ['filter', 'hashgroup'],
      ['hashgroup', 'project'],
      ['project', 'emit'],
    ],
    rowCounterLabel: 'ROWS',
    costLabel:       '−60% p99',
    tableLabel:      'SNOWFLAKE',
  },

  interface: {
    kicker: '// 03·04',
    mode:   'INTERFACE',
    // Wireframe layout zone labels
    zones: [
      { id: 'header',  label: 'HEADER' },
      { id: 'sidebar', label: 'NAV' },
      { id: 'main',    label: 'CONTENT' },
      { id: 'card-a',  label: 'CARD' },
      { id: 'card-b',  label: 'CARD' },
      { id: 'card-c',  label: 'CARD' },
    ],
    stackLabel: 'REACT · VITE',
    fpsLabel:   '60fps',
  },

  agents: {
    kicker: '// 03·05',
    mode:   'AGENTS',
    // Cycle nodes
    cycle: ['THINK', 'ACT', 'OBSERVE'],
    // Token stream shown during ambient loop
    tokens: ['context', '→', 'embed', '→', 'retrieve', '→', 'ground', '→', 'emit'],
    ragLabel:   'RAG',
    llmLabel:   'LLM',
    loopLabel:  'AGENT LOOP',
    slopLabel:  'slop stays out.',
  },
}
