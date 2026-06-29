# Scroll Performance — Root Causes & Remediation

Work-in-progress doc tracking the scroll-jank audit and phased fixes. A new agent can pick up from whichever phase is marked incomplete.

**Status:** Phase 1 complete ✅ · Phase 2 pending · Phase 3 pending

---

## Why competitors feel smooth (and we didn't)

Sites like dumemearts.com (Webflow + AVIF) and make-b.studio follow four rules we were breaking:

1. **One scroll clock.** Single Lenis rAF loop driving everything — no competing loops.  
   → *We already did this correctly* (`App.jsx` Lenis + GSAP ticker). Not a problem.

2. **Zero per-frame layout reads.** Never call `getBoundingClientRect`/`clientWidth`/`offsetTop` inside a scroll or rAF handler — each read forces the browser to flush pending style/layout.  
   → *We had violations in ImageSequenceRenderer and pointermove handlers.*

3. **Compositor-only property animation.** Only animate `transform` and `opacity`. Never animate `height`, `width`, `top`, `left`, `background`, or `box-shadow` per frame.  
   → *We had violations in VizSystems, VizData, VizBackend, and CSS keyframes.*

4. **Uniform, properly-sized assets.** No single asset that is anomalously large and stalls decode.  
   → *Frame 0193.webp was 2,193 KB — 66× heavier than every other frame.*

---

## Architecture that is verified clean (do not change)

- **`App.jsx` Lenis/GSAP/ScrollTrigger sync** — single shared clock, correct teardown, reduced-motion gate. ✓  
- **`AboutMe.jsx` word reveal** — pure `useTransform` on opacity only, zero `setState` per frame. ✓  
- **`Cursor.jsx`** — self-pausing rAF, transform-only writes. ✓  
- **`HeroFluid`** — correctly paused mid-page (`active = heroVisible || footerVisible`). ✓  
- **All 5 `IntersectionObserver`s in `App.jsx`** — async, state writes only on visibility flips. ✓  
- **`prefers-reduced-motion`** — comprehensively handled everywhere; do not regress. ✓  
- **`useJourneyEngine.js` `setActiveIndex`** — guarded by `activeIndexRef`, fires only on chapter-boundary crossings (~4 total), not per frame. ✓

---

## Phase 1 — Complete ✅

All four items implemented, lint clean, build clean.

### 1.1 Frame 0193.webp re-encoded

**Root cause:** `public/avatar/0193.webp` was exported at **2752×1536** (2K) while every other frame is 1280×720. File size: **2,193 KB vs 37 KB average** — a 66× outlier. On fast scroll-to-bottom the rolling decode window calls `img.decode()` on this giant, causing a guaranteed hitch and memory spike.

**Fix applied:** Re-encoded with ffmpeg to 1280×720 at quality 82.  
**Result:** 2,193 KB → **25 KB**. No code change needed; pure asset replacement.

**File:** `public/avatar/0193.webp`

---

### 1.2 VizSystems — height/width writes → compositor transforms

**Root cause:** `VizSystems.jsx` rAF wrote `style.height = X%` on 4 CPU bars, `style.width = X%` on the memory fill, and `style.height = X%` on 6 queue bars — **every rAF frame** while the Systems panel was the active WhatIDo snap. `height`/`width` are layout-triggering properties; each write forces a reflow + paint. Direct violation of `docs/animation.md` "transform/opacity only" floor.

**Fix applied:**

*`src/components/widviz/VizSystems.jsx` — rAF section:*
```js
// Before (per-frame reflow ×4 cores)
coreRefs.current[i].style.height = `${cpuCurrents[i].toFixed(1)}%`

// After (compositor-only)
coreRefs.current[i].style.transform = `scaleY(${(cpuCurrents[i] / 100).toFixed(3)})`
```
Same change for `memFillRef` (scaleX) and `qBarRefs` (scaleY).

*`src/components/widviz/VizSystems.jsx` — JSX initial styles:*
- CPU bars: `style={{ height: `${init}%` }}` → `style={{ transform: `scaleY(${(init/100).toFixed(3)})` }}`
- Memory fill: `style={{ width: '44%' }}` → `style={{ transform: 'scaleX(0.44)' }}`
- Queue bars: `style={{ height: '0%' }}` → `style={{ transform: 'scaleY(0)' }}`

*`src/styles/widviz.css` — `.wsys-core-bar`, `.wsys-mem-fill`, `.wsys-queue-bar`:*
- Added `height: 100%` (core + queue) / `width: 100%` (mem)
- Added `transform-origin: center bottom` (core + queue) / `transform-origin: left center` (mem)
- Added `will-change: transform`
- Removed `transition: height/width` (the rAF lerp already provides smooth motion; CSS transitions were creating a second interpolation track)

**Why scaleY works correctly:** Both `.wsys-core-track` and `.wsys-queue-track` use `display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden`, so bars sit at the bottom. A full-height bar scaled with `transform-origin: bottom` produces the same visual as `height: X%`.

---

### 1.3 VizData — 110 per-frame background writes eliminated

**Root cause:** `VizData.jsx` rAF wrote `el.style.background = COLOR_LUT[lutIdx]` for each of **110 dot elements every rAF frame** while the Data layer was visible — a 110-element style-recalc + paint batch per frame. `background` is not a composited property; every write invalidates paint.

**Fix applied:**

*`src/components/widviz/VizData.jsx`:*
- Removed the entire `COLOR_LUT` system (16-step muted→accent precomputed array, `hexToRgb`, `LUT_STEPS`, `MUTED_HEX`, `ACCENT_HEX` constants)
- Removed `lutIdx` computation and `el.style.background = COLOR_LUT[lutIdx]` from the rAF loop
- Inline SVG gradient that referenced `ACCENT_HEX` now uses the literal `"#c9f558"`
- Flare opacity boost adjusted from `+ fl * 0.3` → `+ fl * 0.4` to compensate for the removed brightness boost

*`src/styles/widviz.css` — `.wdat-dot`:*
- Changed `background: var(--muted)` → `background: var(--accent)`
- Removed the `background: var(--accent)` override from `.wdat-field[data-phase='signal'] .wdat-dot` (now redundant; kept `opacity: 0.95` for the static/frozen frame)

**Visual change:** Unresolved "noise" dots are now low-opacity lime instead of low-opacity brownish/muted. The noise→signal sweep still reads clearly. User accepted this change under "aggressive — prioritize FPS" mode.

---

### 1.4 ImageSequenceRenderer — rAF pause, cached dimensions, coalesced decode window

**Root cause (three sub-issues):**

a. **rAF loop never stopped** — `_startRaf()` scheduled `requestAnimationFrame(tick)` unconditionally for the component's entire lifetime, even when `#journey` was scrolled off-screen. ~60 wakeups/s burned continuously.

b. **Layout read per drawn frame** — `_drawFrame` read `this._canvas.clientWidth` / `clientHeight` on every frame change. These reads force a style flush if any pending layout exists.

c. **`_primeWindow` ran on every Lenis change event** — `setProgress` called `_primeWindow` (eviction scan + allocation + sort) on each `scrollYProgress.on('change')` callback. Lenis can emit multiple change events per rAF cycle; the eviction/sort work ran redundantly 2–3× per frame.

**Fix applied:**

*`src/lib/journey/ImageSequenceRenderer.js`:*
- Added `this._paused = false`, `this._cw = 0`, `this._ch = 0` to constructor
- `_applyDpr()` now caches `this._cw = w; this._ch = h` after reading `clientWidth/clientHeight` (these reads only happen on resize — acceptable)
- `_drawFrame()` uses `this._cw / this._ch` instead of live `clientWidth/clientHeight`
- `setProgress()` no longer calls `_primeWindow` — removed that call entirely
- `_startRaf()` tick now calls `_primeWindow(this._targetFrame)` *inside* the `if (targetFrame !== lastDrawn)` guard — decode window only re-primes when the frame actually changes, and at most once per rAF cycle
- Added `pause()` method: sets `_paused = true`, calls `cancelAnimationFrame`
- Added `resume()` method: sets `_paused = false`, calls `_primeWindow` immediately (eager re-prime), then `_startRaf()`

*`src/hooks/useJourneyEngine.js`:*
- Added `sectionRef` to the options destructure
- Added `IntersectionObserver` on `sectionRef.current` (threshold: 0) → calls `renderer.pause()` on exit, `renderer.resume()` on enter
- Cleans up `io.disconnect()` in the effect return

*`src/components/journey/MyJourney.jsx`:*
- Passes `sectionRef` into `useJourneyEngine({ ..., sectionRef })`

---

## Phase 2 — Pending ⏳

### 2.1 Return-to-Top: remove fixed `backdrop-filter`

**Root cause:** `src/styles/return-to-top.css:21` applies `backdrop-filter: blur(16px) saturate(150%)` to a `position: fixed` element that is **visible for the entire page after WhatIDo**. A blurred fixed backdrop forces the browser to re-sample + blur the content behind it **every scrolled frame** — one of the most expensive persistent scroll costs a page can carry.

**Approach (aggressive):** Remove the `backdrop-filter` entirely. Replace with a higher-opacity solid background that doesn't require per-frame re-rasterization:

```css
/* Before */
background: rgba(12, 12, 12, 0.72);
backdrop-filter: blur(16px) saturate(150%);

/* After */
background: rgba(12, 12, 12, 0.92);
/* No backdrop-filter — fixed blur over scrolling content costs a full
   re-rasterize every scrolled frame. Solid background reads identically
   at this opacity level. */
```

**File:** `src/styles/return-to-top.css` (line 20–21)

---

### 2.2 VizBackend: `top`/`left` → `transform: translate3d()`

**Root cause:** `VizBackend.jsx` uses Framer Motion `useTransform` to animate `FlowDot` elements via `top` and `left` MotionValues (lines 70–71, 74–76). The companion CSS (`widviz.css:149,274,1371`) uses `will-change: top, left, opacity`. Animating `top`/`left` triggers layout every frame — `will-change: top, left` does not make these composited. There are 12 flow dots (`NUM_TRUNK_DOTS = 6` + `NUM_PATH_DOTS = 6`) plus 1 hero packet (line 456) that all use `top`/`left`.

**Approach:** Convert `FlowDot` to use `transform: translate3d(x%, y%, 0)` via a single MotionValue. Since percentage values in `transform` are relative to the element's *own* size (not container), you need to express positions as pixel offsets using a container-size ref. The pattern already used by `VizData.jsx` (lines 191–195) is the blueprint: store CSS `left`/`top` as a static base position in JSX, then write only the *delta* as `transform`.

**Concrete approach for `FlowDot`:**
1. Remove the `top` and `left` MotionValues from `FlowDot`
2. Give `.wbk-flow-dot` `left: 0; top: 0` as its static anchor
3. Derive `x` and `y` pixel positions using a `containerSize` ref (ResizeObserver on the field div, already used in `VizData`)
4. Set `style={{ transform }}` where `transform` = `translate3d(${x}px, ${y}px, 0)` driven by a single MotionValue

**Alternatively (simpler):** Express everything as a single `transform: translate(fromX%, fromY%)` → `translate(toX%, toY%)` using Framer's `useTransform` — but transform % is element-relative so this only works if you make the dots 0×0 (position-only) elements. The easiest true fix is the pixel-based approach above.

**Files:** `src/components/widviz/VizBackend.jsx` (FlowDot component, ~lines 66–78; packet at ~line 456), `src/styles/widviz.css` (`.wbk-flow-dot` at line 142, `.wbk-packet` at line 264, line 1371)

**CSS changes:**
```css
/* Before */
.wbk-flow-dot { will-change: top, left, opacity; }
.wbk-packet   { will-change: left, top, opacity; }

/* After */
.wbk-flow-dot { will-change: transform, opacity; left: 0; top: 0; }
.wbk-packet   { will-change: transform, opacity; left: 0; top: 0; }
```

---

### 2.3 WhatIDo viz: gate infinite animations to the active layer

**Root cause:** All 5 viz subtrees are mounted simultaneously (`WidVisual.jsx:65–96`), cross-dissolved by opacity. While mounted, each runs its own infinite animations even when opacity ≈ 0 (dissolved out). The total load while pinned includes:
- ~20 `wagnt-*` infinite CSS keyframe animations (the Agents viz, `widviz.css ~2237–2517`)
- `wifc-ind-breathe` CSS keyframe (3 instances, lines 1582–1603) — animates `box-shadow` (non-composited repaint each cycle)
- `VizInterface.jsx:266,301` — inline animated `boxShadow` MotionValue (Framer animates boxShadow per frame)
- `VizInterface.jsx:106–140` — 3 `setInterval` tickers (850ms, 1050ms, 380ms) running continuously

**Approach — gate by active layer:**

The codebase already uses `isActive`, `isFinal`, and `isActiveRef` patterns in each viz. Extend this to CSS animations:

1. In `WidVisual.jsx`, set a `data-active-viz={activeVizId}` attribute on the container
2. In `widviz.css`, scope `wagnt-*` and `wifc-ind-breathe` keyframe rules behind `[data-active-viz="agents"]` and `[data-active-viz="interface"]` respectively, using `animation-play-state: paused` as the default and `running` when active:

```css
/* Default: all inactive layers have animations paused */
.wagnt-some-element { animation-play-state: paused; }
/* Active layer: run */
[data-active-viz="agents"] .wagnt-some-element { animation-play-state: running; }
```

3. Replace `VizInterface.jsx:266,301` inline animated `boxShadow` MotionValue with a CSS class swap on the `isActive` boundary — a CSS class toggle is free; Framer animating `boxShadow` per frame is not.

4. In `VizInterface.jsx`, already gated by `isFinal` for intervals. Add an `isActive`-gated `clearInterval`/restart pattern if not already present (verify lines 106–140 before editing).

**Files:** `src/components/WidVisual.jsx`, `src/components/widviz/VizInterface.jsx` (lines 106–140, 266, 301), `src/styles/widviz.css` (~lines 1582–1604 for `wifc-ind-breathe`, ~2237–2517 for `wagnt-*`)

**Read `docs/what-i-do.md` in full before touching these files.**

---

## Phase 3 — Optional polish ⏳

### 3.1 Hoist `getBoundingClientRect` out of pointermove handlers

**Root cause:** Two components call `getBoundingClientRect()` on every `pointermove` event. When the user moves the mouse while scrolling, these synchronous layout reads interleave with scroll frames:

- `src/components/InfiniteGrid.jsx:23` — `getBoundingClientRect()` per `pointermove` (window-level listener), result feeds MotionValues for the mask
- `src/components/Hero.jsx:102` — `getBoundingClientRect()` per `pointermove`, plus synthetic event re-dispatch to Spline canvas (lines 118–119)

**Approach:** Cache the bounding rect via `ResizeObserver` + a scroll-invalidated ref. `VizAgents.jsx:302` already uses this exact pattern — copy it:

```js
const rectRef = useRef(null)
// On mount + resize:
const ro = new ResizeObserver(() => { rectRef.current = el.getBoundingClientRect() })
ro.observe(el)
// In pointermove: use rectRef.current — no live read
```

**Files:** `src/components/InfiniteGrid.jsx` (~line 23), `src/components/Hero.jsx` (~line 102)

**Note:** This is the lowest-impact fix (pointermove ≠ scroll; only interleaves if user moves mouse while scrolling). Implement last.

---

## Verification checklist

Run after each phase before moving to the next.

1. `vercel dev` — confirm the app loads and all sections render
2. DevTools → Performance → record a fast scroll **top → bottom → top**
3. In the flame chart, look for reduction in:
   - **"Recalculate Style" + "Layout"** tasks during WhatIDo scroll (should shrink after Phase 1.2)
   - **"Paint"** tasks during WhatIDo scroll (should shrink after Phase 2.3)
   - **Long tasks (>50ms) in the Journey section** (should be gone after Phase 1.1 + 1.4)
4. CPU throttle **4–6×** in DevTools (simulates low-end device) — fast scroll should no longer visibly stutter
5. `prefers-reduced-motion: reduce` in OS settings — verify all reduced-motion paths still work
6. `npm run lint && npm run build` — both must pass clean

---

## Key file index

| File | What changed / what to change |
|---|---|
| `public/avatar/0193.webp` | ✅ Re-encoded 2K→1280×720, 2193 KB→25 KB |
| `src/components/widviz/VizSystems.jsx` | ✅ height/width → scaleY/scaleX transforms |
| `src/components/widviz/VizData.jsx` | ✅ Removed COLOR_LUT + per-frame background writes |
| `src/lib/journey/ImageSequenceRenderer.js` | ✅ pause/resume, cached dimensions, coalesced _primeWindow |
| `src/hooks/useJourneyEngine.js` | ✅ IntersectionObserver → renderer pause/resume |
| `src/components/journey/MyJourney.jsx` | ✅ Passes sectionRef to useJourneyEngine |
| `src/styles/widviz.css` | ✅ bar CSS; ⏳ wbk-flow-dot/packet will-change; ⏳ wagnt-* animation-play-state |
| `src/styles/return-to-top.css` | ⏳ Remove backdrop-filter (Phase 2.1) |
| `src/components/widviz/VizBackend.jsx` | ⏳ FlowDot + packet top/left → transform (Phase 2.2) |
| `src/components/WidVisual.jsx` | ⏳ data-active-viz attribute (Phase 2.3) |
| `src/components/widviz/VizInterface.jsx` | ⏳ boxShadow + interval gating (Phase 2.3) |
| `src/components/InfiniteGrid.jsx` | ⏳ Cache getBoundingClientRect (Phase 3.1) |
| `src/components/Hero.jsx` | ⏳ Cache getBoundingClientRect (Phase 3.1) |

**Read before editing any WhatIDo area:** `docs/what-i-do.md`  
**Read before editing any animation:** `docs/animation.md`  
**Read before editing the Journey engine:** `docs/journey.md`
