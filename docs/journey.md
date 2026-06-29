# My Journey

Scroll-driven storytelling section (section 04). Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** Image-sequence rendering engine, Renderer contract, rolling decode window, Framer `useScroll` pin, chapter component, mobile fallback, and `journey.js` data. Animation variants → `docs/animation.md`. Styling tokens → `docs/design-system.md`.

---

## Overview

`#journey` is a scroll-storytelling section that pins a full-viewport stage while the user scrolls through five chapters. A WebP image sequence (192 frames, `public/avatar/`) scrubs in sync with scroll progress. Everything derives from **one normalized scroll-progress value (0→1)** — frame and chapter are all driven by it.

**Three-layer architecture:**

```
scroll position ──► useScroll (Framer) ──► scrollYProgress (0→1)
       │
       ├─► ENGINE LAYER  src/lib/journey/
       │     ImageSequenceRenderer (implements Renderer contract)
       │       • rolling decode window biased by scroll direction
       │       • DPR cover-fit canvas draw
       │       • internal rAF; draws only on frame change
       │
       ├─► CONTROLLER   src/lib/journey/journeyProgress.js  (pure, no DOM)
       │     progressToChapter(p, N) → index   (normalized, not frame ranges)
       │     progressToFrame(p, total) → frame
       │
       └─► UI LAYER     src/components/journey/
             MyJourney → useJourneyEngine → JourneyStage + JourneyChapter
```

---

## File Map

| File | Purpose |
|---|---|
| `src/lib/journey/sequenceConfig.js` | Source descriptor: `basePath`, `count`, `pad`, `ext`, `decodeWindow` |
| `src/lib/journey/renderer.contract.js` | JSDoc `Renderer` typedef: `{ setProgress, resize, destroy }` |
| `src/lib/journey/journeyProgress.js` | Pure helpers: `progressToChapter`, `progressToFrame`, `chapterMidpointProgress` |
| `src/lib/journey/ImageSequenceRenderer.js` | Framework-agnostic WebP + canvas engine |
| `src/hooks/useJourneyEngine.js` | React lifecycle bridge (the only place engine meets React) |
| `src/components/journey/MyJourney.jsx` | Orchestrator — `useScroll`, branch desktop/mobile/reduced |
| `src/components/journey/JourneyStage.jsx` | `<canvas>` element + gradient scrim |
| `src/components/journey/JourneyChapter.jsx` | Single chapter text; `AnimatePresence mode="wait"` |
| `src/components/journey/JourneyMobile.jsx` | Mobile flat chapter list (no pin) |
| `src/data/journey.js` | `JOURNEY` array — all copy lives here, never in components |
| `src/styles/journey.css` | Section styles (imported after `widviz.css` in `global.css`) |

---

## Data Shape (`src/data/journey.js`)

```js
export const JOURNEY = [
  {
    id:              'origin',      // stable key for AnimatePresence / map
    chapterNumber:   '01',          // displayed in mobile flat list (JourneyMobile)
    navigationTitle: 'Where It Began',   // large lime heading in JourneyChapter
    title:           'Computer Science in India',  // gold sub-heading
    body:            '…paragraph…',
  },
  // … 4 more entries
]
```

Chapter switching is driven by **normalized progress**, not frame ranges:
`activeIndex = min(floor(progress × JOURNEY.length), N-1)`.  
Frame ranges are noted as comments in `journey.js` for reference only — no component reads them.

---

## Rendering Engine (`ImageSequenceRenderer`)

Framework-agnostic ES class implementing the `Renderer` contract.

### Renderer contract

```js
// src/lib/journey/renderer.contract.js (typedef only)
{
  setProgress(progress: number): void,  // [0, 1] → update target frame
  resize(): void,                       // recompute DPR backing store + redraw
  destroy(): void,                      // cancel rAF, release cache — called once on unmount
}
```

Swapping the source (WebP → WebM / Three.js) means writing a new class that satisfies this contract and updating the `new ImageSequenceRenderer(...)` line in `useJourneyEngine.js`. Nothing in the UI layer changes.

### Rolling decode window

The engine maintains a `Map<frameIndex, HTMLImageElement>` cache for frames within `±decodeWindow` of the current target frame (configured in `sequenceConfig.js`, default `24`). On each `setProgress` call:
1. Frames outside the window are evicted from the cache.
2. Missing frames inside the window are decoded asynchronously (`img.decode()`), prioritized toward the scroll direction.
3. If the exact target frame isn't decoded yet, `_getNearestDecoded` finds the closest cached frame so there is never a blank canvas.

### DPR-scaled drawing

`resize()` calls `canvas.width = clientWidth × dpr` then `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` — idempotent, so multiple `resize()` calls never accumulate scale. All drawing uses CSS pixel coordinates. Cover-fit math: `scale = max(cw/iw, ch/ih)`, centered horizontally.

### rAF loop

The engine owns its own `requestAnimationFrame` tick. It draws only when `targetFrame !== lastDrawn`. Scroll → `setProgress` → `_targetFrame` update → next rAF tick draws — no React state involved.

---

## React Bridge (`useJourneyEngine`)

The **only** place where the engine meets React:

- Instantiates `ImageSequenceRenderer` against a `canvasRef` on mount; calls `destroy()` on unmount.
- Subscribes to the `scrollYProgress` MotionValue via `.on('change', renderer.setProgress)` — **zero React re-renders for frame changes**.
- Computes `progressToChapter(p, CHAPTER_COUNT)` on the same event; calls `setActiveIndex` only when the index changes (guarded by `activeIndexRef`). This is the **single intentional re-render path**, driving `AnimatePresence`.
- Wires `ResizeObserver` → `renderer.resize()`.
- Handles `reduced` option: draws one static frame (`staticProgress`, default 0.5 → frame ~96) and skips the scroll subscription.

---

## Scroll / Pin Model

Desktop (`≥ 768px`):

```
<section id="journey">
  <div ref={scrollContainerRef}   ← useScroll target; height: var(--journey-scroll-length, 500vh)
    class="journey-scroll-container">
    <div class="journey-sticky">  ← position: sticky; top: 0; height: 100vh
      <JourneyStage />             canvas + scrim (absolute, inset 0, z-index 0)
      <div class="journey-content"> section header + chapter (z-index 1)
    </div>
  </div>
</section>
```

`scrollYProgress` comes from `useScroll({ target: scrollContainerRef, offset: ['start end', 'end end'] })`.  
- Progress `0` begins when the scroll container's **top reaches the viewport bottom** — frames start scrubbing as the section rises into view, right after the What I Do agents tab finishes.
- Progress `1` = sticky last releases (unchanged).

**Lenis compatibility:** Lenis lerps native `window.scrollTop`. Framer's `useScroll` reads native `scrollTop` transparently. `position: sticky` works with Lenis because it doesn't replace the native scroll container. No GSAP is involved in this section.

**`--journey-scroll-length`** (CSS variable, default `500vh`) controls the scroll budget. Change it in `journey.css` or at the section root without touching component code.

Mobile (`≤ 767px`): `journey-scroll-container` is `display: none`; `journey-mobile` is `display: flex`. Flat chapter list, no pin, no canvas — readable on all screen sizes.

---

## Gradient Scrim

`JourneyStage` always renders a `.journey-scrim` div between the canvas and the foreground text. The scrim is a three-layer gradient (left-to-right legibility layer + top + bottom vignettes) using `rgba(7, 7, 7, …)` — the decomposed value of `--bg: #070707`. Raw `rgba()` is required here because CSS `rgba()` cannot compose a CSS custom property as its color argument; a comment in `journey.css` documents the constraint and which token is mirrored.

The scrim guarantees text legibility independent of the underlying animation source — swapping the renderer never requires rechecking contrast.

---

## Transitions (Framer Motion)

Defined in `src/animations/variants.js` (never inline):

- `JOURNEY_CHAPTER` — used on `JourneyChapter`'s `AnimatePresence` keyed by `activeIndex`. Incoming: `opacity 0→1, blur 8px→0, y 40→0`. Outgoing: reverse. Duration ~0.45s. Both use the repo-wide easing `[0.22, 1, 0.36, 1]` (expo-out).

---

## Layout Zones (desktop sticky)

Two vertical zones inside `.journey-sticky`:

1. **Header strip (top):** `.journey-header` — bold serif `04` idx (cream `--fg`) + `My Journey` title (`Journey` in italic muted). `width: fit-content` keeps the `border-bottom` underline trimmed to the text, not the full viewport width. Mirrors the `03 What I Do` `SectionHead` type treatment.
2. **Chapter area (middle, `flex: 1; justify-content: center`):** `JourneyChapter` — lime `--accent` chapter name (`navigationTitle`, ~36px `--text-display-lg`) + gold `--accent-2` sub-heading (`title`, `--text-display-md`) + body text (`--fg-2`).

---

## AIOrb Gating

`App.jsx` has a fourth `IntersectionObserver` on `#journey` → `journeyVisible`. `AIOrb` receives `hidden={heroVisible || whatIdoVisible || journeyVisible}`. This hides the orb while the full-bleed canvas is on screen, matching the WhatIDo pattern.

---

## Accessibility

- `<canvas>` and `.journey-scrim` are `aria-hidden="true"` (decorative).
- `<section id="journey">` is the accessible landmark.
- `prefers-reduced-motion`: engine draws one static frame; scroll subscription is skipped; chapter text remains fully readable with no animation.

---

## Extending / Swapping

**Swap the animation source:** implement a new class satisfying the `Renderer` contract (`src/lib/journey/renderer.contract.js`), update `new ImageSequenceRenderer(canvas)` in `useJourneyEngine.js` to `new YourRenderer(canvas)`. No UI component changes.

**Add a chapter:** add an entry to `JOURNEY` in `src/data/journey.js`. Section height auto-scales if `--journey-scroll-length` is set to `JOURNEY.length * 100vh`.

**Change the scroll budget:** update `--journey-scroll-length` in `journey.css` or set it as an inline style from `MyJourney.jsx`.

---

## Do Not

- Do not animate frames through React state — use the engine's `setProgress` and the MotionValue `.on('change', …)` subscription.
- Do not hardcode frame ranges in `JOURNEY` data — chapter switching is normalized-progress-based.
- Do not add a second `requestAnimationFrame` loop to this section — the engine owns its own tick.
- Do not use GSAP for the pin — this section uses CSS `position: sticky` + Framer `useScroll` to keep GSAP in its two documented places. See `docs/animation.md`.
- Do not define `JOURNEY_CHAPTER` variants inline — they live in `src/animations/variants.js`.
- Do not hardcode section content in components — all copy lives in `src/data/journey.js`.
