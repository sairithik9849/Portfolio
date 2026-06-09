/**
 * widViz — per-viz diagram labels, metrics, and glyph content.
 * Keyed by whatIDo.js id. No copy lives in the component files.
 */

// ── SYSTEMS geometry — Fibonacci sphere projection, computed once at module load.
//    Mulberry32 PRNG retained only for per-node breathing delay offsets.
const _sysRand = (() => {
  let s = 0xDEAD5EED
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
})()

// Golden-angle Fibonacci sphere: 50 evenly distributed points on a unit sphere.
// Orthographically projected to 2D with horizontal radius 32% and vertical radius 40%
// so the sphere silhouette fits the tall panel. z3d is retained for the yaw rotation
// in the physics RAF loop (Y-axis rotation: x' = x·cosθ − z·sinθ).
const _fibSphere = n => {
  const phi = Math.PI * (3 - Math.sqrt(5))  // golden angle ≈ 137.5°
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2           // −1 (south pole) → +1 (north pole)
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = phi * i
    return { x3d: Math.cos(theta) * r, y3d: y, z3d: Math.sin(theta) * r }
  })
}

const _sysNodes = _fibSphere(50).map(({ x3d, y3d, z3d }) => ({
  x3d, y3d, z3d,
  cx:    +(50 + x3d * 32).toFixed(2),       // projected x, roughly 18–82%
  cy:    +(50 + y3d * 40).toFixed(2),       // projected y, roughly 10–90%
  z:     +((z3d + 1) / 2).toFixed(3),      // depth 0 (back) → 1 (front) for CSS cue
  delay: +(_sysRand() * 2.5).toFixed(2),   // CSS breathing stagger (seconds)
}))

// Near-neighbour mesh: connect nodes whose 3D chord length < 0.53 (≈ 0.28 squared).
// Using 3D distance preserves the sphere topology — nodes near each other on the
// surface are connected regardless of their 2D projection overlap.
const _sysEdges = (() => {
  const pairs = []
  for (let i = 0; i < _sysNodes.length; i++)
    for (let j = i + 1; j < _sysNodes.length; j++) {
      const a = _sysNodes[i], b = _sysNodes[j]
      const d2 = (a.x3d-b.x3d)**2 + (a.y3d-b.y3d)**2 + (a.z3d-b.z3d)**2
      if (d2 < 0.28) pairs.push([i, j])
    }
  return pairs
})()

// 10 pulse edges: the longest by 2D projected distance so pulses travel across
// visually interesting diagonals rather than short local hops.
const _sysPulseEdges = [..._sysEdges]
  .sort(([ia, ja], [ib, jb]) => {
    const da = (_sysNodes[ia].cx - _sysNodes[ja].cx) ** 2
             + (_sysNodes[ia].cy - _sysNodes[ja].cy) ** 2
    const db = (_sysNodes[ib].cx - _sysNodes[jb].cx) ** 2
             + (_sysNodes[ib].cy - _sysNodes[jb].cy) ** 2
    return db - da
  })
  .slice(0, 10)

export const WID_VIZ = {
  systems: {
    kicker:      '// 03·01',
    mode:        'SYSTEMS',
    healTargets: [16, 32],
    statusLabel: 'INFRA STATUS',
    aliveCount:  '50 / 50',
    uptimeLabel: '99.9%',
    nodes:       _sysNodes,
    edges:       _sysEdges,
    pulseEdges:  _sysPulseEdges,
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
    cacheTag: 'REDIS',
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
