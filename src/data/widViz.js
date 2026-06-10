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
    kicker: '// 03·02',
    mode:   'BACKEND',

    // ── Node graph — positions as % of the 0–100 field SVG / field div.
    // Layout: EDGE (ingress, left) → API (dispatcher, center) → forks to
    // CACHE (Redis, bottom-left) and DB (Postgres, bottom-right).
    nodes: [
      { id: 'edge',  label: 'EDGE',     tag: 'TLS',      x: 22, y: 20 },
      { id: 'api',   label: 'API',      tag: 'NODE',     x: 50, y: 38 },
      { id: 'cache', label: 'CACHE',    tag: 'REDIS',    x: 28, y: 62 },
      { id: 'db',    label: 'DB',       tag: 'POSTGRES', x: 72, y: 62 },
    ],

    // ── Edges — d-strings for the stretched preserveAspectRatio="none" field SVG.
    edges: [
      { id: 'edge-api',   d: 'M22,20 L50,38' },
      { id: 'api-cache',  d: 'M50,38 L28,62' },
      { id: 'api-db',     d: 'M50,38 L72,62' },
    ],

    // ── BREAKER label — positioned between API and DB (midpoint of that edge).
    breakerLabel:  'BREAKER',
    breakerOpen:   'OPEN',
    breakerClosed: 'CLOSED',
    // Midpoint of api→db edge, offset slightly to avoid the line.
    breakerX: 64,
    breakerY: 50,

    // ── State captions
    stressState: 'DB SATURATING',
    calmState:   'CACHE WARM',

    // ── Readout labels (résumé-tied headline + illustrative set-dressing)
    latencyLabel: 'p95 LATENCY',
    latencyHi:    '180ms',   // STRESSED display value
    latencyLo:    '72ms',    // RESOLVED display value (−60%)
    deltaLabel:   'p95 −60%',

    hitRateLabel: 'CACHE HIT',
    hitRateLo:    '0%',      // STRESSED (cold cache)
    hitRateHi:    '96%',     // RESOLVED

    reqLabel:  'REQ',
    rpsLabel:  '10M req / day',

    // ── Sparkline sample arrays — 44 points each (must stay equal-length).
    // STRESSED: starts low, climbs toward the p99 ceiling with erratic spikes.
    // CALM:     flat-low around p50 with gentle heartbeat bumps.
    // Scale: 0–34ms, matching existing MAX_MS = 34.
    traceStressed: [
       4,  4,  5,  5,  6,  7,  8,  9, 11, 13,
      15, 17, 20, 22, 25, 26, 27, 28, 28, 27,
      26, 28, 29, 30, 28, 26, 28, 30, 28, 27,
      26, 24, 25, 27, 28, 28, 27, 26, 25, 24,
      26, 27, 28, 28,
    ],
    traceCalm: [
       4,  4,  4,  4,  4,  5,  4,  4,  4,  4,
       4,  4,  4,  5,  5,  8, 10,  8,  5,  4,
       4,  4,  4,  4,  4,  4,  4,  4,  5,  5,
       8, 10,  8,  5,  4,  4,  4,  4,  4,  4,
       4,  4,  5,  4,
    ],
  },

  data: {
    kicker: '// 03·03',
    mode:   'DATA',
    rowCounterLabel: 'ROWS',
    costLabel:       '−60% p99',
    tableLabel:      'SNOWFLAKE',
    // x/y as % of the field (0–100).
    // naiveX/naiveY = Phase 2 naive plan layout (branched DAG with join).
    // optX/optY/folds = Phase 3b optimized layout (join-free); authored now, not yet consumed.
    planNodes: [
      { id: 'scan-a',    label: 'SEQ SCAN A', naiveX: 10, naiveY: 32, optX: 10, optY: 50, folds: false },
      { id: 'scan-b',    label: 'SEQ SCAN B', naiveX: 10, naiveY: 68, optX: 10, optY: 68, folds: true  },
      { id: 'hash-join', label: 'HASH JOIN',  naiveX: 34, naiveY: 50, optX: 34, optY: 50, folds: true  },
      { id: 'filter',    label: 'FILTER',     naiveX: 55, naiveY: 50, optX: 40, optY: 50, folds: false },
      { id: 'aggregate', label: 'AGGREGATE',  naiveX: 74, naiveY: 50, optX: 65, optY: 50, folds: false },
      { id: 'emit',      label: 'EMIT',       naiveX: 92, naiveY: 50, optX: 90, optY: 50, folds: false },
    ],
    // d strings authored as matching M x y L x y sequences so Phase 3b can
    // lerp coordinate-for-coordinate via lerpPath(). Phase 2 renders naiveD only.
    planEdges: [
      { from: 'scan-a',    to: 'hash-join', naiveD: 'M10 32 L34 50', optD: 'M10 50 L40 50' },
      { from: 'scan-b',    to: 'hash-join', naiveD: 'M10 68 L34 50', optD: 'M10 68 L34 50' },
      { from: 'hash-join', to: 'filter',    naiveD: 'M34 50 L55 50', optD: 'M34 50 L40 50' },
      { from: 'filter',    to: 'aggregate', naiveD: 'M55 50 L74 50', optD: 'M40 50 L65 50' },
      { from: 'aggregate', to: 'emit',      naiveD: 'M74 50 L92 50', optD: 'M65 50 L90 50' },
    ],
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
