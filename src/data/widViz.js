/**
 * widViz — per-viz diagram labels, metrics, and glyph content.
 * Keyed by whatIDo.js id. No copy lives in the component files.
 */

// ── DATA geometry — noise→signal field, computed once at module load.
//    Dedicated Mulberry32 PRNG (separate seed from _sysRand) so the particle
//    field is deterministic across renders — the frozen/reduced final frame
//    must show the same settled constellation every time.
const _datRand = (() => {
  let s = 0x5161A157
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
})()

// Signal curve in 0–100 field space: clean smoothstep rise left→right.
// Pure smoothstep — no sine wobble: a multi-cycle frequency in a tall
// stretched-viewBox SVG produces two visual humps that look like a broken
// curve. t = (x − X0) / (X1 − X0).
const _DAT_X0 = 8
const _DAT_X1 = 94
const _datSmooth = t => t * t * (3 - 2 * t)
const _datCurveY = x => {
  const t = (x - _DAT_X0) / (_DAT_X1 - _DAT_X0)
  // y=71 (lower-center) → y=43 (upper-center); midpoint y≈57 aligns with
  // the center of the visible band (mask fades top 20%, bottom 6% → center≈57%).
  return 71 - 28 * _datSmooth(t)
}

// Sampled polyline for the SVG curve (step 2 units → 44 points).
const _datCurvePts = []
for (let x = _DAT_X0; x <= _DAT_X1; x += 2)
  _datCurvePts.push(`${x} ${_datCurveY(x).toFixed(1)}`)
const _datCurveD = `M${_datCurvePts.join(' L')}`
const _datAreaD  = `${_datCurveD} L${_DAT_X1} 100 L${_DAT_X0} 100 Z`

// 110 particles: sx stratified along the curve (each dot owns a horizontal
// slot so the resolved curve is evenly populated), sy on the curve ± jitter;
// nx/ny scattered over the full field for the noise state.
const _datParticles = Array.from({ length: 110 }, (_, i) => {
  const sx = _DAT_X0 + (_DAT_X1 - _DAT_X0) * ((i + _datRand() * 0.8) / 110)
  return {
    sx:  +sx.toFixed(1),
    sy:  +(_datCurveY(sx) + (_datRand() * 2 - 1) * 4).toFixed(1),
    nx:  +(6 + _datRand() * 88).toFixed(1),
    ny:  +(18 + _datRand() * 70).toFixed(1),
    ph:  +(_datRand() * 6.283).toFixed(2),
    ph2: +(_datRand() * 6.283).toFixed(2),
  }
})

export const WID_VIZ = {
  backend: {
    kicker: '// 03·02',
    mode:   'BACKEND',

    // ── Node graph — positions as % of the 0–100 field SVG / field div.
    // Layout: vertical trunk EDGE(top-center) → API(center) → symmetric Y-fork
    // to CACHE(lower-left) and DB(lower-right). Fork angles are mirrored (Δx=±20, Δy=+18).
    // Dots anchor on the coordinate; labels splay outward (EDGE/API/DB right, CACHE left).
    // Triangle shifted up by 10pp to create breathing room above the EKG graph.
    nodes: [
      { id: 'edge',  label: 'EDGE',     tag: 'TLS',      x: 50, y: 14 },
      { id: 'api',   label: 'API',      tag: 'NODE',     x: 50, y: 32 },
      { id: 'cache', label: 'CACHE',    tag: 'REDIS',    x: 30, y: 50 },
      { id: 'db',    label: 'DB',       tag: 'POSTGRES', x: 70, y: 50 },
    ],

    // ── Edges — d-strings for the stretched preserveAspectRatio="none" field SVG.
    // Trunk is a pure vertical (x=50). Fork is symmetric about x=50.
    edges: [
      { id: 'edge-api',   d: 'M50,14 L50,32' },
      { id: 'api-cache',  d: 'M50,32 L30,50' },
      { id: 'api-db',     d: 'M50,32 L70,50' },
    ],

    // ── BREAKER chip — exactly on the midpoint of the api→db edge (60,41).
    breakerLabel:  'BREAKER',
    breakerOpen:   'OPEN',
    breakerClosed: 'CLOSED',
    breakerX: 60,
    breakerY: 41,

    // ── State captions
    stressState: 'DB SATURATING',
    calmState:   'CACHE WARM',

    // ── Readout labels (résumé-tied headline + illustrative set-dressing)
    latencyLabel: 'p95 LATENCY',
    latencyHi:    '180ms',   // STRESSED display value
    latencyLo:    '72ms',    // RESOLVED display value (−60%)
    deltaLabel:   'p95 −60%',

    hitRateLabel: 'CACHE HIT',
    hitRateLo:    '31%',     // STRESSED (cold cache, realistic floor)
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
    tableLabel:      'SNOWFLAKE',
    // Counter value the scramble decelerates onto when the signal locks.
    lockValue: 4821094,
    stageLabels: { noise: 'NOISE', resolving: 'RESOLVING', signal: 'SIGNAL' },
    // Sweep travel bounds in 0–100 field space (match the curve sample range).
    sweepX0: _DAT_X0,
    sweepX1: _DAT_X1,
    curveD:     _datCurveD,
    curveAreaD: _datAreaD,
    particles:  _datParticles,
  },

  interface: {
    kicker: '// 03·04',
    mode:   'INTERFACE',

    // ── Layer 2 — Logic & Orchestration routing paths (100×100 viewBox).
    // Circuit-like topology: single entry point → horizontal trunk → three vertical
    // drops → bottom rail → two terminal drops. Geometric and structural.
    routePaths: [
      { id: 'entry',    d: 'M50,8  L50,30' },
      { id: 'h-trunk',  d: 'M12,30 L88,30' },
      { id: 'v-left',   d: 'M22,30 L22,62' },
      { id: 'v-center', d: 'M50,30 L50,62' },
      { id: 'v-right',  d: 'M78,30 L78,62' },
      { id: 'h-bottom', d: 'M22,62 L78,62' },
      { id: 'drop-l',   d: 'M22,62 L22,78' },
      { id: 'drop-r',   d: 'M78,62 L78,78' },
    ],
    // Empty structural nodes at path endpoints and intersections
    gridNodes: [
      { id: 'entry',  x: 50, y:  8 },
      { id: 'tl',     x: 12, y: 30 },
      { id: 'tc',     x: 50, y: 30 },
      { id: 'tr',     x: 88, y: 30 },
      { id: 'ml',     x: 22, y: 62 },
      { id: 'mc',     x: 50, y: 62 },
      { id: 'mr',     x: 78, y: 62 },
      { id: 'bl',     x: 22, y: 78 },
      { id: 'br',     x: 78, y: 78 },
    ],

    // ── Layer 3 — Insight Widgets
    // Sparkline: 12 normalized samples (0–100) for UI response latency
    spark:        [62, 70, 55, 72, 68, 80, 65, 75, 71, 76, 69, 77],
    sparkLabel:   'RESP',
    // Rolling metric counter
    counterValue: '847',
    counterLabel: 'EVENTS/S',
    // Resource allocation ring (fraction of circumference to fill)
    ringPct:   0.73,
    ringLabel: '73%',
    ringTitle: 'GPU',

    // ── Layer identity tags — fade in at peak to label each slab as an
    // engineered component. Index order matches DOM stacking: L1→L4.
    layerTags: ['01·RAW', '02·LOGIC', '03·INSIGHT', '04·INTERFACE'],

    // ── Layer 4 — Glass control panel
    panelTitle:   '// motion-first',   // Sai's actual design philosophy
    fpsTarget:    '60',
    fpsLabel:     'fps floor',
    frameTarget:  '<16',
    frameLabel:   'ms budget',
    // The four libraries actually powering this page's animations
    techStack:    ['THREE.JS', 'FRAMER', 'GSAP', 'LENIS'],
    toggleLabel:  'SMOOTH',            // Lenis smooth scroll
    buttonLabel:  'GPU',               // GPU-composited render path
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
