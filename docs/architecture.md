# Architecture

App-shell wiring, render order, preloader handoff, scrolling, observers, and cross-cutting singletons. Loaded on demand via the routing table in `CLAUDE.md`.

**Scope:** `App.jsx` wiring, preloader flags, Lenis setup, IntersectionObservers, AIOrb, nav/footer, project-card visuals, and content data mapping. Hero internals → `docs/hero.md`. WhatIDo rig → `docs/what-i-do.md`. Animation variants → `docs/animation.md`.

## Subsystem Map

```
App.jsx (orchestration root)
├── Preloader               src/components/Preloader.jsx
├── Lenis + GSAP clock      App.jsx useEffect
├── Hero subsystem          → docs/hero.md
│   ├── Hero.jsx            (#top)
│   ├── SplineScene.jsx     (lazy @splinetool/react-spline; stop()/play() gated on hero visibility)
│   └── StarField.jsx
│
├── WhatIDo subsystem       → docs/what-i-do.md
│   ├── WhatIDo.jsx         (#what-i-do, GSAP pin/scrub)
│   └── src/components/widviz/Viz*.jsx
│
├── MyJourney subsystem     → docs/journey.md
│   ├── src/components/journey/MyJourney.jsx   (#journey, CSS sticky + Framer useScroll)
│   ├── src/components/journey/Viz*.jsx        (JourneyStage/Chapter/Counter/Nav/Mobile)
│   ├── src/lib/journey/ImageSequenceRenderer.js  (engine — implements Renderer contract)
│   ├── src/lib/journey/journeyProgress.js     (pure progress helpers)
│   └── src/hooks/useJourneyEngine.js          (React↔engine bridge)
│
├── Projects subsystem
│   ├── Projects.jsx        (#work)
│   ├── ProjectVisual.jsx   (VIZ switch)
│   └── src/components/visuals/Viz*.jsx
│
├── AI subsystem            → docs/backend.md
│   ├── AIDrawer.jsx        (React.lazy — mounted only after first open, see "AIDrawer Lazy Load")
│   ├── AIOrb.jsx
│   └── api/chat.js         (Vercel serverless → Gemini)
│
├── Return-to-Hero marker
│   └── ReturnToTop.jsx     (fixed top-right, z-index 40; see "ReturnToTop Visibility" below)
│
└── Content data            src/data/*.js  ← all copy lives here, never hardcoded
```

## Section Render Order (`App.jsx`)

`Nav → Hero → AboutMe → WhatIDo → MyJourney → Projects → Footer`

`Hero` and `AboutMe` are wrapped together in a `.hero-about-stack` div — see "Hero → AboutMe
Sticky-Stack Transition" below. This wrapper does not change render order, only how the two
sections visually overlap during that scroll band.

`AIOrb` + `ReturnToTop` + `AIDrawer` are fixed overlays at the end of the tree.

**`<Nav />` is currently commented out in `App.jsx`** (temporarily hidden) — its import and visibility wiring remain intact; uncomment the JSX to restore it.

## Section id ↔ Component ↔ Nav Label

The ids in `nav.js` do not match component names — use this table for scroll targets and anchor links:

| Component | DOM id | Nav label |
|-----------|--------|-----------|
| `Hero` | `#top` | "Index" |
| `AboutMe` | `#about` | "About" |
| `WhatIDo` | `#what-i-do` | "What I Do" |
| `MyJourney` | `#journey` | "My Evolution" |
| `Projects` | `#work` | "Work" |
| `Footer` | `#contact` | "Contact" |

## Three-Flag Preloader Handoff

`App.jsx` uses three booleans — `mountContent`, `revealed`, and `heroStarted` — to separate the three distinct phases cleanly.

- **`mountContent`** (set via `requestAnimationFrame` one frame after the overlay paints) mounts the full content tree **under the still-opaque overlay** so Spline can init while the bar animates.
- **`revealed`** is granted from the first render (`useState(true)`) — it is no longer gated on Spline readiness. It sends `beginExit=true` to Preloader, but the curtain (`translateY` sweep) still only lifts once Preloader's own bar-fill has finished: `Preloader.jsx` internally ANDs `fillDone && beginExit`, and since `beginExit` is already true, the bar's `FILL_DURATION_MS` (~2.6s WAAPI fill, `Preloader.jsx`) is the sole remaining gate. The Spline robot is **not** part of this gate at all — it fades in independently (see "Spline Visibility Gating" below) whenever it finishes loading, even if that lands after the curtain has already lifted. This means slow connections see the site reveal in ~2.6s instead of waiting up to the old ~6.5s Spline ceiling.
- **`heroStarted`** (set from `Preloader`'s `onRevealComplete` → `AnimatePresence onExitComplete`) starts the `HERO_SEQUENCE` cascade. This deliberately fires **after the curtain finishes sweeping up**, so the heavy Framer reconciliation spike lands on a fully clean main thread with the preloader already gone.

**Do not collapse these back into two or one flag** — separating `revealed` from `heroStarted` is what keeps the Framer spike off the preloader's visible frames. Collapsing them causes the cascade's main-thread cost to contend with the curtain sweep.

**Do not gate `mountContent` on anything time-based** — content must mount early so both subsystems load under the opaque overlay during the cinematic window.

**Do not re-couple `revealed` to Spline readiness** — the bar-fill floor plus SplineScene's independent fade-in is the intended design; re-adding a Spline wait here reintroduces the up-to-6.5s reveal delay this replaced.

The four `IntersectionObserver` effects in `App.jsx` have `mountContent` in their dep array so they attach only after the Hero DOM actually exists; do not change their deps back to `[]`.

## Spline Visibility Gating

`SplineScene.jsx` captures the `Application` instance from `@splinetool/react-spline`'s `onLoad`
callback and calls `app.stop()` / `app.play()` (guarded by `app.isStopped`) whenever its `visible`
prop changes. `Hero.jsx` forwards its own `visible` prop (App's `heroVisible`) straight through.
Spline runs its own WebGL render loop for as long as the `Application` is alive — without this,
that loop kept rendering at full rate even while the hero was scrolled completely out of view. This
can only ever fire after the hero has already been revealed (the hero is on-screen for the entire
preloader window), so it never interacts with the reveal gate above. Independently of this,
`SplineScene`'s own `loaded` state drives a Framer opacity fade-in on the canvas wrapper — this is
what lets the preloader curtain lift before Spline has actually finished loading; the robot simply
fades in whenever it's ready.

`heroVisible` is driven by an `IntersectionObserver` on **`#hero-sentinel`**, not on `#top` (the
Hero root) — see "Hero → AboutMe Sticky-Stack Transition" below for why.

## Hero → AboutMe Sticky-Stack Transition

`Hero` and `AboutMe` are wrapped in a `.hero-about-stack` div (`App.jsx`). On desktop
(`min-width: 981px`) with motion allowed, `src/styles/hero-about-stack.css` makes `.hero`
`position: sticky; top: 0` — it pins to the viewport top — while `.about-me` becomes an opaque
`--bg-2` card with rounded top corners and a hairline `--line` top border, so it visually slides up
and covers the pinned hero as the user scrolls. This is **pure CSS `position: sticky`** — no GSAP
(would be a third `ScrollTrigger` site, violating the two-site cap in `docs/animation.md`), no
Framer scroll-scrub. Below 981px and under `prefers-reduced-motion: reduce`, both sections stay in
normal document flow (no pin, no card background).

**Z-index override, load-bearing:** `.hero` also carries the shared `.shell` class, which sets
`z-index: 3` (`layout.css`) — that would otherwise paint the pinned hero *above* the incoming
`.about-me` card (`z-index: 2`), hiding the transition entirely. `hero-about-stack.css` scopes
`.hero-about-stack .hero { z-index: 1; }` to override this for the pinned hero only; the global
`.shell` rule and every other section using it are untouched.

**`#hero-sentinel`** is a 1px `aria-hidden` div placed **between** `<Hero>` and `<AboutMe>` in the
JSX — deliberately not before Hero. Because it sits in normal (non-sticky) flow at the Hero/AboutMe
boundary, it scrolls out of the viewport at exactly the scroll position where AboutMe's card has
fully covered the pinned hero (`scrollY ≈` hero height), which is the moment `heroVisible` should
flip to `false` to pause the two WebGL contexts (StarField, Spline). A sentinel on `#top` (the Hero
root) would never report `false` while sticky, since the pinned hero stays geometrically in the
viewport indefinitely.

## AIDrawer Lazy Load

`AIDrawer` is `React.lazy`-imported in `App.jsx` and mounted only after the user opens it for the
first time (Cmd+K, the orb, or a footer/hero CTA — all routed through a shared `openAI` callback
that also flips a sticky `hasOpenedAI` flag). Once mounted it is **never unmounted again**, even
after closing — `AIDrawer` owns its own chat-history state internally, and keeping it mounted
after the first open preserves that history across subsequent opens exactly as it behaved before
lazy-loading. `open={aiOpen}` still controls its internal show/hide.

`MyJourney` and the WhatIDo `WidVisual` field were evaluated for the same treatment and
deliberately left eager: `MyJourney`'s root `#journey` section is looked up via
`document.getElementById` by an `App.jsx` IntersectionObserver that only runs once
(`[mountContent]` deps) — lazy-loading it would require that lookup to retry once the real section
mounts, which the current effect doesn't do. `WidVisual` is already forced into the initial bundle
regardless, because `WhatIDo.jsx`'s mobile blurb list renders five `<WidVisual frozen>` instances
unconditionally (CSS-hidden on desktop, not JS-gated) — a lazy boundary there would add complexity
with no deferred-load benefit under the current architecture.

## Lenis Momentum Scroll

`App.jsx` owns a site-wide Lenis smooth-scroll instance (`duration: 1.6`, exponential ease, `smoothWheel: true`), driven by `gsap.ticker` (single shared clock):
- `gsap.ticker.add(tickerFn)` calls `lenis.raf(time * 1000)`
- `lenis.on('scroll', ScrollTrigger.update)` keeps ScrollTrigger in sync
- `gsap.ticker.lagSmoothing(0)` prevents frame-skip after tab blur
- Exposed as `window.__lenis` for cross-component access

Key behaviours:
1. **Entirely disabled** under `prefers-reduced-motion` (early return, no instance created).
2. **Paused** (`.stop()`) while the AI drawer is open, resumed (`.start()`) on close — prevents wheel events leaking behind the drawer.

Framer Motion's `useScroll` reads native `scrollTop` transparently — do not replace native scroll with a virtual Lenis scroll container.

**Anchor scrolling goes through `scrollToId(id)` (`src/utils/scrollTo.js`)** — it routes through `window.__lenis.scrollTo` when Lenis exists and falls back to native `scrollIntoView`. Use it (Hero and Nav already do) instead of raw `scrollIntoView` for any new in-page link.

## ReturnToTop Visibility

`ReturnToTop` receives `hidden={!returnVisible}` from `App.jsx`. `returnVisible` is driven by a
fifth `mountContent`-gated `IntersectionObserver` on `#what-i-do`:

```js
([entry]) => setReturnVisible(
  entry.isIntersecting || entry.boundingClientRect.top < 0,
)
// options: { threshold: 0, rootMargin: '0px 0px -20% 0px' }
```

- **Hero / About:** `#what-i-do` is below the fold → `isIntersecting = false`, `top > 0` → hidden.
- **Entering What I Do:** the section intersects (with a −20% bottom-margin delay so it appears once
  the section is meaningfully engaged) → visible.
- **Journey / Projects / Footer:** `#what-i-do` has scrolled past — `top < 0` → stays visible.
- **Scrolling back above What I Do:** `isIntersecting` becomes false and `top > 0` again → hidden.

The component mirrors `AIOrb`'s `hidden`-prop contract: `aria-hidden`, `tabIndex -1`,
`pointer-events: none` while hidden. Click calls `scrollToId('top')` from `src/utils/scrollTo.js`.
Entrance/exit uses the `RETURN_MARKER` variant from `src/animations/variants.js`.

## AIOrb Visibility

Hidden while the Hero (`#top`), the What I Do section (`#what-i-do`), **or** the My Journey section (`#journey`) is intersecting the viewport — `AIOrb` receives `hidden={heroVisible || whatIdoVisible || journeyVisible}`. All three flags come from `IntersectionObserver`s in `App.jsx`. The Hero gate avoids overlapping the robot hotspot; the WhatIDo and Journey gates keep the orb off their full-bleed pinned panels.

## Global Hotkey

`useHotkey('cmd+k', toggleAI)` in `App.jsx` (from `src/hooks/useHotkey.js`) opens the AI drawer. The hook also supports `'escape'`. Any new global shortcut belongs in `App.jsx` using this hook.

## Page Background Z-Order

- `.bg-gradient` — the two `body` radial gradients, at `z:-1`, persistent across the page
- `.noise` CSS texture at `z:2`, persistent across the page

The old static `.grid-bg` is gone — do not reintroduce.

`.noise` deliberately has **no `mix-blend-mode`** (plain 4% opacity) — overlay blending forced a full-viewport blend pass per scrolled frame; do not reintroduce it.

### `.bg-gradient` — Composited, Not Repainted

The two radial gradients that give the page its subtle lime/white glow used to live directly on `body` under `background-attachment: fixed`. A fixed-attachment background has no compositor layer of its own, so the browser **repaints** the gradient region on every scrolled frame — a real cost on weak GPUs. They now live on a dedicated `position: fixed; inset: 0; z-index: -1` sibling of `.noise` (`.bg-gradient`, rendered in `App.jsx` right before `.noise`, styled in `layout.css`). A `position: fixed` element gets its own compositor layer, so scrolling **composites** it instead of repainting it — same visual result, no per-frame paint cost. `body`'s own `background` in `tokens.css` is now just the flat `var(--bg)` fallback. **Do not move the gradients back onto `body` with `background-attachment: fixed`.**

## Layout Shell

`.shell` = `max-width: 1440px; padding: 0 24px`. All sections use it. Hero overrides to flush-left (`padding-left/right: 0; overflow: visible`). `body { overflow-x: clip }` is load-bearing — **`clip`, not `hidden`**: `hidden` makes body a scroll container which breaks ScrollTrigger's `position: fixed` pin; `clip` contains horizontal overflow without creating a scroll container. Spline canvas and `StarField`'s `100vw` full-bleed both extend past the shell intentionally.

## Nav Visibility

Driven by an `IntersectionObserver` on `#top` (Hero root). Toggles `opacity`/`y`/`pointer-events` so a hidden nav is never accidentally clickable. (Nav is currently commented out in `App.jsx` — see render-order note above.)

## Footer Mount Animation

`Footer.jsx` uses a delayed `initial/animate` fade (delay = `HERO_SEQUENCE.footer`, 5.3s) rather than `whileInView`. It participates in the hero reload sequence even though it is off-screen at page load. Do not revert it to `REVEAL` / `whileInView`.

## Project Card Visuals

Each project in `src/data/projects.js` maps to a purely CSS/SVG visualization component in `src/components/visuals/` (e.g. `VizAero.jsx`, `VizMF.jsx`). `src/components/ProjectVisual.jsx` is the switch — it selects the viz via a `VIZ` map (keyed `aero/mf/spp/ll/wb/sch`) using the `kind` prop. Adding a new project requires a new `Viz*.jsx` in `visuals/` and a `VIZ` map entry in `ProjectVisual.jsx` — no canvas or third-party deps in these components.

## Content Data Mapping

All copy lives in `src/data/` — never hardcode inside components.

| File | Exports / Used by |
|---|---|
| `nav.js` | Nav links |
| `aboutMe.js` | `ABOUT_ME_STATEMENT`, `ABOUT_ME_HIGHLIGHT`, `ABOUT_ME_EMPHASES` → `AboutMe.jsx` |
| `whatIDo.js` | `WHAT_I_DO` entries → `WhatIDo.jsx` |
| `widViz.js` | `WID_VIZ` keyed by id → `WidVisual.jsx` / `Viz*.jsx` |
| `projects.js` | Project entries → `Projects.jsx` / `ProjectVisual.jsx` |
| `agent.js` | AI persona data |
| `preloader.js` | `PRELOADER_NAME`, `STATUS_PHASES`, `getStatusLabel(progress)` → `Preloader.jsx` |
| `journey.js` | `JOURNEY` entries → `MyJourney.jsx` / `JourneyChapter` / `JourneyCounter` / `JourneyNav` |

## Common Edits

**Adding a new page section:** Add the component to the render order in `App.jsx`, add an `IntersectionObserver` if needed for AIOrb gating, add an entry to the section-id table above, add an entry to `nav.js`, and create `src/styles/<name>.css` (see `docs/design-system.md`).

**Adding a new in-page anchor link:** Use `scrollToId(id)` from `src/utils/scrollTo.js` — never use raw `scrollIntoView`.

**Adding a new global hotkey:** Add `useHotkey('<combo>', handler)` in `App.jsx` using the existing hook from `src/hooks/useHotkey.js`.

**Adding a new project card:** Add to `src/data/projects.js`, create `src/components/visuals/Viz*.jsx` (CSS/SVG only, no canvas, no third-party deps), and add a `VIZ` map entry in `ProjectVisual.jsx`.

> If project-card visuals grow into a major subsystem, promote them to `docs/visuals.md` and update the routing-table row in `CLAUDE.md`.

## Do Not

- Do not collapse `mountContent` and `revealed` into one flag — causes a triple-whammy frame spike (two WebGL contexts + Spline init + Framer entrance contending with the wipe).
- Do not change the IntersectionObserver dep arrays back to `[]` — they must include `mountContent`.
- Do not use raw `scrollIntoView` for in-page links — always route through `scrollToId`.
- Do not replace native `scrollTop` scroll with a Lenis virtual scroll container — Framer Motion's `useScroll` reads native scroll and breaks if replaced.
- Do not reintroduce `.grid-bg`.
- Do not add `mix-blend-mode` to `.noise` — forces a full-viewport blend pass per scrolled frame.
- Do not move the page background gradients back onto `body` with `background-attachment: fixed` — keep them on the composited `.bg-gradient` fixed layer.
- Do not re-gate the preloader's `revealed` flag on Spline readiness — see "Three-Flag Preloader Handoff."
- Do not remove the `visible` prop chain into `SplineScene` — without it Spline's WebGL loop never pauses off-screen.
- Do not re-point the `heroVisible` observer from `#hero-sentinel` back to `#top` — while the hero is sticky-pinned it never leaves the viewport, so an observer on `#top` would never report `false` and the WebGL pause would never fire.
- Do not remove the `.hero-about-stack .hero { z-index: 1; }` override in `hero-about-stack.css` — `.hero` inherits `z-index: 3` from the shared `.shell` class, which would otherwise paint the pinned hero above the incoming AboutMe card.
- Do not unmount `AIDrawer` on close (e.g. reverting to `{aiOpen && <AIDrawer/>}`) — it would drop chat history on every reopen; keep the `hasOpenedAI`-gated mount-once pattern.
