# AgentsViz — Working Reference

A vertical autonomous-factory animation inside the AGENTS panel (word 05) of the WhatIDo section. The simulation loops continuously: goal enters → discovery → planning (fan-out) → parallel execution → reconverge → verification → ship or self-correct (rework). No user interaction. No end state.

---

## Files

| File | Role |
|---|---|
| `src/components/widviz/VizAgents.jsx` | Component + RAF simulation loop |
| `src/styles/widviz.css` | All `wagnt-*` styles, keyframes, `[data-phase]` rules |
| `src/data/widViz.js` | `WID_VIZ.agents` — all copy, telemetry values, drift config |

**Do not touch:**
- `src/components/WidVisual.jsx` — wiring, passes `{ progress, agentsProgress, index, isActive, reduced, frozen }` to `VizAgents`
- `src/utils/widSlice.js` — cross-dissolve ranges

---

## Layout

```
ViewBox:  0 0 100 150   (SVG coordinate space)
Field:    left/right 48px inset from panel edges
          top 80px (below header), bottom 40px

Frame:    FRAME_X1=8, FRAME_X2=92, USABLE_W=84

Station bands (y1→y2):
  intake:       0   → 4.5
  discovery:    4.5 → 24
  planning:     24  → 45
  execution:    45  → 105   (dominant — 40% of height)
  verification: 105 → 126
  shipping:     126 → 145.5
  output:       145.5 → 150

Lane centers (4 lanes):
  x = FRAME_X1 + USABLE_W * (i + 0.5) / 4
  → [18.5, 39.5, 60.5, 81.5]

Core:  x=50, y=75

Helpers (viewBox → CSS %):
  xp(x)      = (x/100*100).toFixed(3)+'%'
  yp(y)      = (y/150*100).toFixed(3)+'%'
  hp(y1, y2) = ((y2-y1)/150*100).toFixed(3)+'%'
  wp(w)      = (w/100*100).toFixed(3)+'%'
```

---

## Simulation (RAF loop in VizAgents.jsx)

Single RAF clock drives everything. No React state. All DOM writes via refs.

### Phases and timing

| Phase | Duration | What moves |
|---|---|---|
| `intake` | 0.8s | Lead packet descends from intake port to discovery |
| `discovery` | 1.0s | Lead traverses discovery band |
| `planning` | 1.0s | Lead fades; 4 children spawn + overshoot-scale at fan-out origin |
| `fanout` | 0.6s | Children follow FAN_OUT beziers to lane tops |
| `execution` | 3.2s | Each lane descends at own pace (×0.72/1.0/0.85/0.62); slot[1] fill updates live |
| `reconverge` | 0.7s | Children follow RECONVERGE beziers back to verification |
| `verification` | 1.0s | Lead dwells at gate; pass/fail decided on exit |
| `shipping` | 0.8s | Lead exits down spine, fades out |
| `rework` | 1.2s | Gold lead travels UP rework arc → re-enters planning |
| `rest` | 1.0s | All tokens hidden; cycle resets |

**Rework cadence:** no back-to-back fails; ~18% chance after 2+ consecutive passes; forced fail after 6 consecutive passes. A reworked cycle always passes second verification.

### Key refs

| Ref | Points to |
|---|---|
| `fieldRef` | `.wagnt-field` div — hosts `dataset.phase` |
| `leadRef` | `.wagnt-packet.wagnt-packet--lead` |
| `childRefs` | Array[4] of `.wagnt-packet.wagnt-packet--child` |
| `slot1Refs` | Array[4] of `.wagnt-module-fill` (slot[1] per lane) — live width during execution |
| `driftElsRef` | Map of telemetry spans with drift config |
| `fieldSizeRef` | `{w,h}` px — updated by ResizeObserver, used by `vbPx()` |

### Phase activation (CSS declarative system)

The RAF writes `fieldRef.current.dataset.phase = sim.phase` on each transition (deleted during `rest`). CSS rules under `.wagnt-live .wagnt-field[data-phase="X"]` handle all visual activation — no JS opacity writes for stage emphasis.

**Gating:** `.wagnt-live` class is applied only when `isActive && !isFinal`. `isFinal = reduced || frozen`. When `isFinal`, the RAF doesn't run and the static Phase 1 frame is shown at opacity 1.

---

## Colors (3-token system — do not add new colors)

| Token | Used for |
|---|---|
| `--accent` (lime `#c9f558`) | Core nucleus, port dots, active fanout/reconverge stroke, packet border/fill, kicker text |
| `--accent-2` (gold `#e8c47a`) | Rework arc, gate-bar, fail packet, station index tags, telemetry values, global status |
| `--line` / `--line-2` | Chassis, lane rails, manifold, feeder lines (structural/dim) |
| `--fg-2` | Station body labels |
| `--muted` | Telemetry label keys |
| `--accent-alert` (red) | **Reserved — not used. Do not use.** |

---

## CSS class map (`wagnt-*`)

### SVG layer (`.wagnt-svg`)
```
wagnt-upright         frame side rails
wagnt-cap             top/bottom plate bars
wagnt-tiebar          dashed station dividers
wagnt-spine           center spine
wagnt-conduit         wide dim underlay paths behind spine
wagnt-flow-chevron    downward V-marks on spine (--chev-i for stagger delay)
wagnt-port-dot        intake/output circles (wagnt-port-dot--in / --out)
wagnt-fanout          planning→lane beziers
wagnt-lane-rail       execution lane centerlines (dashed)
wagnt-reconverge      lane→verification beziers
wagnt-rework          gold dashed arc up left gutter
wagnt-rework-chevron  upward V-marks on rework arc (--chev-rw-i for cascade delay)
wagnt-rework-arrow    arrowhead at top of rework arc
wagnt-core-ring       SVG ring behind HTML nucleus
wagnt-core-housing    dashed octagon around core
wagnt-feeder          discovery context feeder lines
wagnt-membank-cell    memory bank grid cells
wagnt-membank-cell--lit  filled memory cells
wagnt-manifold        planning manifold H-bar
wagnt-manifold-rib    manifold vertical ribs
wagnt-checkpoint-hatch  verification hatch pattern
wagnt-gate-bar        verification gate horizontal bar
wagnt-gate-tick       verification gate tick marks
```

### HTML overlay (inside `.wagnt-field`)
```
wagnt-header          global status bar (above field)
wagnt-kicker          // 03·05 label
wagnt-status          AUTONOMOUS LOOP label
wagnt-global-tel      wrapper for AGENTS/QUEUE pair
wagnt-tel-pair        label+value pair
wagnt-tel-label       dim key (--muted)
wagnt-tel-value       bright value (--accent-2, tabular-nums)

wagnt-station         non-execution station bay (wagnt-station--{id})
wagnt-station-head    index + label row
wagnt-station-index   01/02/04/05 number
wagnt-station-label   DISCOVERY / PLANNING / etc
wagnt-station-tel     telemetry row

wagnt-exec-band       execution zone container
wagnt-exec-head       03 EXECUTION header
wagnt-lanes           flex row of lane cells
wagnt-lane            individual lane column
wagnt-lane-head       LANE 01 + % label
wagnt-module-slots    column of 3 module tracks
wagnt-module          single module track (bg = --line dim)
wagnt-module-fill     fill bar (lime, --cell-i for breathe delay)
wagnt-module-fill--done  completed fill (higher opacity)

wagnt-core            core container div (centered at 50,75)
wagnt-core-nucleus    6px lime dot
wagnt-core-glow       radial glow div behind nucleus

wagnt-packet          data packet token (7px, lime border+fill, box-shadow halo)
wagnt-packet--lead    goal unit — 9px, stronger halo
wagnt-packet--child   subtask unit — base 7px
wagnt-packet--fail    gold variant for rework phase
wagnt-packet-tick     inner corner mark

wagnt-port-label      GOAL IN / OUTPUT text (--in / --out variants)
wagnt-rework-label    rotated REWORK text in left gutter
```

---

## Ambient animations (always on under `.wagnt-live`)

| Keyframe | Target | Period | Effect |
|---|---|---|---|
| `wagnt-core-beat` | nucleus | 2.6s | scale 1→1.08→1 |
| `wagnt-glow-breathe` | glow div | 2.6s | opacity 0.45→0.80 |
| `wagnt-ring-pulse` | core ring | 2.6s | opacity 0.18→0.30 |
| `wagnt-chevron-wave` | flow chevrons | 2.4s | opacity 0.08→0.32, staggered by `--chev-i` |
| `wagnt-rail-march` | lane rails | 1.6s | dashoffset march |
| `wagnt-arc-flow` | fanout (2.0s) / reconverge (2.4s) | — | dashoffset flow |
| `wagnt-conduit-pulse` | conduit | 3.6s | opacity 0.10→0.20 |
| `wagnt-port-pulse` | port dots | 2.8s | opacity 0.45→0.80, offset by `--port-i` |
| `wagnt-module-breathe` | module fills | 4.8s | opacity 0.70→1.0, staggered by `--cell-i` |

## Phase-triggered animations (only under matching `[data-phase]`)

| Keyframe | Trigger | Effect |
|---|---|---|
| `wagnt-gate-scan` | `verification` | gate bar+tick pulse 0.80→1.0 at 0.9s |
| `wagnt-gate-reject` | `rework` | gate bar one-shot flash on fail |
| `wagnt-rework-flow` | `rework` | rework arc dashes flow upward |
| `wagnt-rework-chevron-cascade` | `rework` | chevrons cascade 0.55→0.95, staggered by `--chev-rw-i` |

---

## Focal / recede system

When any phase is active, all `.wagnt-station` and `.wagnt-exec-band` elements dim to **opacity 0.42**. Per-phase rules restore the focal bay to **opacity 1**. Transitions: 0.35s ease on stations, 0.3s ease on lane rails.

| Phase(s) | Focal element |
|---|---|
| `intake`, `discovery` | `.wagnt-station--discovery` |
| `planning`, `fanout` | `.wagnt-station--planning` |
| `execution` | `.wagnt-exec-band` |
| `reconverge` | `.wagnt-station--verification` at 0.72 |
| `verification` | `.wagnt-station--verification` |
| `shipping` | `.wagnt-station--shipping` |
| `rework` | `.wagnt-station--planning` at 1.0; `.wagnt-station--verification` at 0.60 |

SVG elements are NOT inside station/exec-band divs — they are never receded.

---

## Data shape (`WID_VIZ.agents` in `widViz.js`)

Telemetry items with a `drift` key animate their value in the RAF:
```js
{ label: 'MEM HIT', value: '94%',   drift: { min: 92, max: 96,   decimals: 0, suffix: '%'  } }
{ label: 'PASS',    value: '98%',   drift: { min: 97, max: 99,   decimals: 0, suffix: '%'  } }
{ label: 'CONF',    value: '0.97',  drift: { min: 0.95, max: 0.99, decimals: 2, suffix: '' } }
{ label: 'LAT',     value: '240ms', drift: { min: 232, max: 248, decimals: 0, suffix: 'ms' } }
```
PASS and CONF also couple to pass/fail outcomes: drops on rework, recovers on ship.

---

## What is NOT rendered

- Corner registration brackets (removed)
- Any card border or visible panel frame (the field dissolves into the page via mask-image)
- Red (`--accent-alert`) — reserved, unused
