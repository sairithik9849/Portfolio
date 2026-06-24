---
name: AgentsViz design decisions
description: What was removed and key design choices made during the autonomous-factory viz redesign
---

## Geometry removed from VizAgents.jsx
- MEM_CELLS (2×4 memory bank grid) — too small to read, cluttered discovery zone
- FEEDERS_LEFT/RIGHT (6 diagonal convergence lines) — visual noise, zero comprehension value
- makeHatchLines / HATCH_LEFT (hatch strips in verification band) — gate bar alone sufficient
- GATE_TICK (V-mark above gate bar) — redundant with the bar itself
- CORE_HOUSING_PATH (octagonal dashed bracket around core) — competed with HTML rings
- CORE_SPOKES (4 horizontal lines core → lane centers) — added noise without clarity
- RIVET_POSITIONS (4 corner rivet circles) — decorative noise, removed completely

## Core simplified: 6 layers → 4
Was: glow-wide, ring-outer, ring-tick (rotating), ring-inner, nucleus, ack
Now: glow (large radial bloom), ring-inner (single clean ring), nucleus, ack
**Why:** fewer rings = calm authority; rotating tick read as decoration not information

## Key geometry changes
- Chevrons: half=2.5/rise=1.5 → half=3.2/rise=1.8; 4 chevrons → 5 (3 top, 2 bottom)
- Rework chevrons: half=1.8/rise=1.2 → half=2.2/rise=1.5; 2 → 3
- Gate bar: now full-span (FRAME_X1+2 to FRAME_X2-2), no hatch dependency
- Core ring radius: 7 → 8 vb units

## CSS design choices

### Focal hierarchy (Phase 3)
- Base recede: 0.22 → 0.12 (more dramatic gap between ACTIVE and DISTANT)
- Adjacent tier: 0.55 → 0.42
- Transition easing: ease → cubic-bezier(0.4, 0, 0.2, 1) (more cinematic)
- Station label: added opacity:0.65 base; uplift sets opacity:1.0 (not just color)

### Gate bar
- Dormant: stroke=--line-2, width=0.4, opacity=0.20 (infrastructure, not active)
- Verification: stroke=--accent, width=0.9, opacity=0.90 + scan animation
- Rework: stroke=--accent-2, width=1.0, opacity=0.95 + one-shot reject animation
**Why:** gate bar should feel like it "turns on" during inspection, not just get brighter

### Animation timing (slowed)
- Core beat: 2.6s → 3.2s
- Chevron cascade: 2.4s → 3.0s
- Lane rail march: 1.6s → 2.0s
- Module breathe: 4.8s → 6.0s
- Conduit pulse: 3.6s → 5.0s
**Why:** simultaneous fast oscillations read as "frenetic noise" not "live system"

### Tokens
- Child: 7px → 8px, stronger double box-shadow
- Lead: 9px → 10px, stronger glow
- Rework carrier (lead+fail): more prominent gold double-shadow
**Why:** tokens at 7px had no physical weight against the dark background

### Rework path visibility
- stroke-width: 0.9 → 1.1
- opacity: 0.50 → 0.35 base (but jumps to 1.0 + animation during rework phase)
- Label: opacity 0.25 base → 0.85 during rework phase
**Why:** rework was an afterthought visually; gold bus should feel consequential

### Tiebar change
- Was: dashed stroke-dasharray:1 1.2 at stroke-width 0.5
- Now: solid hairline at stroke-width 0.35, opacity 0.5
**Why:** dash pattern competed with lane rails; hairlines provide division without noise
