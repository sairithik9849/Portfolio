# My Journey

Sticky-visual + scrolling-timeline section (section 04). Loaded on demand via the routing table
in `CLAUDE.md`.

**Scope:** Image-sequence rendering engine, Renderer contract, rolling decode window, Framer
`useScroll` wiring, the timeline components, and `journey.js` data. Animation variants →
`docs/animation.md`. Styling tokens → `docs/design-system.md`. The `ScrollProgressFrame` relay
this section hands off to/from → `docs/architecture.md`, "Scroll Progress Frame".

---

## Overview

`#journey` is a **sticky-visual + scrolling-timeline** section on desktop/tablet (≥ 768px): the
avatar canvas pins to the right half of the viewport while a vertical timeline (translated from
the 21st.dev Timeline component) scrolls past on the left. **One shared scroll-progress value**
drives both the avatar's frame scrub and the timeline spine's fill height, so they are always in
sync and finish together at the same scroll position — there is no chapter/frame coupling beyond
that shared source.

Each chapter renders as a bespoke **scene** (`src/components/journey/scenes/`) rather than a
uniform text block: a shared grammar (spine, sticky year marker, hero quote, deck, metadata, skill
chips — see "Scenes" below) stays constant across chapters, while each scene's featured visual and
composition is unique to that chapter's transformation. The hero quote is always the single
largest element on screen; every other band supports it.

```
scroll position ──► useScroll (Framer, target: #journey, offset ['start start','end end'])
       │                                    │
       │                                    └─► scrollYProgress (0→1) ──┬─► ImageSequenceRenderer.setProgress (avatar)
       │                                                                └─► JourneyTimeline spine fill height
       │
       ├─► ENGINE LAYER  src/lib/journey/
       │     ImageSequenceRenderer (implements Renderer contract)
       │       • rolling decode window biased by scroll direction
       │       • DPR cover-fit canvas draw
       │       • internal rAF; draws only on frame change
       │
       └─► UI LAYER     src/components/journey/
             MyJourney → useJourneyEngine (canvas only) + JourneyTimeline (spine + entries)
```

---

## File Map

| File | Purpose |
|---|---|
| `src/lib/journey/sequenceConfig.js` | Source descriptor: `basePath`, `count`, `pad`, `ext`, `decodeWindow` |
| `src/lib/journey/renderer.contract.js` | JSDoc `Renderer` typedef: `{ setProgress, resize, destroy }` |
| `src/lib/journey/journeyProgress.js` | Pure helpers: `progressToFrame`, `chapterMidpointProgress` |
| `src/lib/journey/deckEmphasis.js` | Pure helper: `parseDeckEmphasis(deck)` — splits a `**phrase**`-marked deck string into `{ text, emphasis }` segments |
| `src/lib/journey/ImageSequenceRenderer.js` | Framework-agnostic WebP + canvas engine |
| `src/hooks/useJourneyEngine.js` | React lifecycle bridge (the only place engine meets React) — returns `{ canvasRef }` only |
| `src/hooks/useSceneReveal.js` | Shared scroll-scrub reveal primitive — 7 fixed `{opacity, y}` bands (3 quote lines, deck, visual, metadata, chips), plus `SCENE_REVEAL_OFFSET` |
| `src/components/journey/MyJourney.jsx` | Orchestrator — three `useScroll` sources (progress, enter, exit), branches desktop/mobile/reduced |
| `src/components/journey/JourneyStage.jsx` | `<canvas>` element + gradient scrim |
| `src/components/journey/JourneyTimeline.jsx` | Desktop (≥768px) timeline: entries, sticky year markers, gradient spine, frame-relay translate, dispatches each chapter to its scene |
| `src/components/journey/JourneyMobile.jsx` | Mobile (≤767px) single-column timeline — its own scroll-driven spine, no avatar/pin, no featured visuals (light typographic adaptation) |
| `src/components/journey/QuoteBlock.jsx` | Shared grammar: hero quote (per line, final line accented) + deck line (one optional gold-emphasis phrase). Chapter label lives in the sticky marker instead — see `JourneyTimeline.jsx` |
| `src/components/journey/MetaList.jsx` | Shared grammar: metadata rows (monoline icon chip + mono text) |
| `src/components/journey/SkillChips.jsx` | Shared grammar: outlined skill pills, hover→green, static at rest |
| `src/components/journey/MetaIcon.jsx` | Monoline SVG icon set (`location`, `degree`, `institution`, `role`, `award`, `terminal`, `server`, `workflow`, `database`, `network`, `cogbolt`) — the only supported metadata glyph, no emoji |
| `src/components/journey/scenes/Scene{Foundation,Scale,Leap,Build,Today}.jsx` | One bespoke scene per chapter — each owns its own `useScroll` + featured visual (see "Scenes") |
| `src/components/journey/scenes/index.js` | `SCENES` registry — maps a chapter's `scene` key to its component |
| `src/data/journey.js` | `JOURNEY` array — all copy lives here, never in components |
| `src/styles/journey.css` | Section styles, incl. `--journey-gutter-x` / `--journey-sticky-offset` (imported after `widviz.css` in `global.css`) |

---

## Data Shape (`src/data/journey.js`)

```js
export const JOURNEY = [
  {
    id:       'origin',       // stable key
    year:     '2019',         // sticky marker heading, paired with label (desktop) / inline (mobile)
    label:    'The Foundation',            // green chapter label — grouped with `year` in the
                                            // sticky marker (desktop) or the header row (mobile),
                                            // not with the quote
    quote:    ['I learned', 'how software', 'thinks.'],  // hero quote, one line per array entry
    deck:     'Four years of algorithms, systems, and the habit of **building things that work**.',
    scene:    'foundation',    // selects the scene component — see scenes/index.js
    visual:   {},              // scene-specific data (e.g. { latency: { value, prefix, suffix, unit }, threadCount } for 'scale')
    metadata: [{ icon: 'location', text: 'Hyderabad, India' }, /* … */],  // icon: MetaIcon key, optional `href`
    skills:   ['Algorithms', 'Data Structures', 'Operating Systems', 'Databases'],
  },
  // … 4 more entries
]
```

No emoji anywhere in this file (or anywhere in the section) — `metadata[].icon` is the only
supported way to attach a glyph, resolved through `MetaIcon.jsx`'s monoline SVG set.

A metadata item may carry an optional `href` (currently the MGIT / Saras Analytics / Stevens
institution rows) — `MetaList.jsx` renders that item as a link that opens in a new tab
(`target="_blank" rel="noreferrer"`), with the "this is clickable" affordance (underline + `↗`)
withheld until hover so the row reads as plain text at rest, matching the rest of the list.

`deck` may wrap **one short phrase** (under ~50 characters, so it never wraps past a line or two)
in `**double-asterisks**` to mark it for gold italic emphasis — parsed by
`src/lib/journey/deckEmphasis.js`'s `parseDeckEmphasis(deck)` into `{ text, emphasis }` segments,
rendered by both `QuoteBlock.jsx` and `JourneyMobile.jsx` as a plain `<span>` / an `<em
className="journey-quote-block__deck-emphasis">`. A deck with no marker renders as plain text —
the marker is optional, not every chapter needs one.

`quote` is fixed at **3 lines** for every current chapter — `useSceneReveal` allocates exactly 3
quote bands (plus deck/visual/metadata/chips = 7 total), so a chapter needing a different line
count means updating `useSceneReveal`'s `BAND_COUNT` and its explicit `useBand` calls, not just the
data.

Entry order drives both the timeline's stacking order and the avatar's frame mapping — there is
no per-entry frame range; the avatar frame is `progressToFrame(scrollYProgress, totalFrames)`
across the whole sequence, independent of which entry is currently on screen.

> ⚠️ `year` values were inferred, not confirmed against the real dates — verify before relying on
> them.

---

## Rendering Engine (`ImageSequenceRenderer`)

Framework-agnostic ES class implementing the `Renderer` contract. Unchanged from the original
implementation — see the contract below.

```js
// src/lib/journey/renderer.contract.js (typedef only)
{
  setProgress(progress: number): void,  // [0, 1] → update target frame
  resize(): void,                       // recompute DPR backing store + redraw
  destroy(): void,                      // cancel rAF, release cache — called once on unmount
}
```

Swapping the source (WebP → WebM / Three.js) means writing a new class that satisfies this
contract and updating the `new ImageSequenceRenderer(...)` line in `useJourneyEngine.js`. Nothing
in the UI layer changes.

**Rolling decode window, DPR-scaled drawing, rAF loop** — unchanged; see the inline documentation
in `ImageSequenceRenderer.js` and `sequenceConfig.js`.

---

## React Bridge (`useJourneyEngine`)

The **only** place where the engine meets React:

- Instantiates `ImageSequenceRenderer` against a `canvasRef` on mount; calls `destroy()` on
  unmount.
- Subscribes to the shared `scrollYProgress` MotionValue via `.on('change', renderer.setProgress)`
  — zero React re-renders for frame changes, and **no chapter/index concept at all** (the
  `activeIndex`/`progressToChapter` re-render path from the old cross-fade design was removed —
  the avatar simply tracks whatever progress value it's given).
- Wires `ResizeObserver` → `renderer.resize()`.
- Wires `IntersectionObserver` on `sectionRef` → `renderer.pause()`/`resume()` so the rAF loop
  stops firing ~60×/s when the section is off-screen.
- Handles `reduced`: draws one static frame (`staticProgress`, default 0.5) and skips the scroll
  subscription entirely.

---

## Scroll Model (`MyJourney.jsx`)

Desktop (`≥ 768px`):

```
<section id="journey">                  ← position: relative; useScroll target for all three sources below
  <div class="journey-desktop">
    <div class="journey-timeline">      ← content-height wrapper, NOT shell-constrained (full-bleed)
      <div class="journey-timeline__row">  ← flex row
        <div class="journey-timeline__track">   ← left ~45%, padding-left: var(--journey-gutter-x)
          <header class="journey-header" />      shell-aligned via the gutter padding
          <JourneyTimeline />                     entries + spine (tall, natural scroll height)
        </div>
        <div class="journey-timeline__avatar">  ← right ~55%; position: sticky; top:0; height:100vh
          <JourneyStage />                          canvas + scrim
        </div>
      </div>
    </div>
  </div>
</section>
```

There is **no fixed `vh` scroll budget** (the old `--journey-scroll-length` variable is gone) —
the scroll length is however tall the five entries naturally lay out to, via
`.journey-timeline__entry`'s `padding-bottom`.

Three `useScroll` sources, all targeting `sectionRef` (`#journey`):

| Source | Offset | Drives |
|---|---|---|
| `scrollYProgress` | `['start start', 'end end']` | Avatar frame (via `useJourneyEngine`) + spine fill height (via `JourneyTimeline`). Spans exactly the sticky-avatar's pin duration, so both finish together when the pin releases — a synchronized finish, not a coincidence. |
| `sectionEnter` | `['start end', 'start start']` | Spine's inward relay-translate as the section arrives (mirrors `ScrollProgressFrame`'s `journeyEnter`). |
| `sectionExit` | `['end end', 'end start']` | Spine's outward relay-translate as the section leaves (mirrors `ScrollProgressFrame`'s `journeyExit`). |

Mobile (`≤ 767px`): `.journey-desktop` is `display: none`; `.journey-mobile` is `display: flex`.
`JourneyMobile` has its own independent `useScroll` (target: its own entries wrapper) driving a
single-column spine — no avatar, no pin, no relay (that's a desktop-only handoff with
`ScrollProgressFrame`'s SVG frame, which itself only renders at ≥981px + motion-allowed).

**Lenis compatibility:** unchanged — Lenis lerps native `scrollTop`; Framer's `useScroll` reads it
transparently; `position: sticky` works with Lenis because it doesn't replace the native scroll
container.

---

## JourneyTimeline (desktop entries + spine)

Translated from the 21st.dev Timeline component
(`https://21st.dev/@aceternity/components/timeline`) — TypeScript stripped, Tailwind utilities
moved to `journey.css`, purple→blue gradient replaced with `--accent`→`--accent-2` (see "Frame
relay" below for why).

- **Entries** are two-column: a `position: sticky` marker (`year` + `label` stacked beside the dot,
  `top: var(--journey-sticky-offset)`, fixed `width: 160px` so marker width — and therefore the
  scene column's start x — never shifts between chapters regardless of label length) beside the
  chapter's scene component (`SCENES[chapter.scene]`, see "Scenes" below). No cross-fade, no
  active/inactive state — all five entries are simultaneously in the DOM and simply scroll past,
  exactly like the reference component. The label is static/always-visible like the year — neither
  is part of a scene's scroll-scrub reveal.
- **Spine height** is measured via `ResizeObserver` on the entries wrapper (`bodyRef`) — not a
  one-shot measurement, since entry text can reflow the wrapper's height on font load or resize.
- **Spine fill** (`journey-timeline__spine-fill`) is `useTransform(progress, [0,1], [0,
  lineHeight])`, i.e. the same mechanism as the reference's `heightTransform`, just driven by the
  shared progress instead of a component-local scroll source.
- **Dot/spine alignment:** the dot's `margin-left: 13px` (in a flex row with no left margin on the
  marker itself) and the spine's `left: 19px` are both measured from the same ancestor
  (`.journey-timeline__body`'s left edge, `x: 0`) — that shared baseline is what keeps them
  centered on each other. If either the marker's flex layout or the spine's `left` changes, check
  the other.
- **`.journey-timeline__spine` must stay `position: absolute`.** Its `height` is a JS-driven
  inline style (`lineHeight` state, from the `bodyRef` ResizeObserver above). If the spine were
  ever in normal flow, that height would inflate `bodyRef`'s own measured height, which sets a
  *bigger* `lineHeight`, which grows the spine further — an unbounded feedback loop, not a subtle
  bug (it manifests as the page's scroll height exploding into the tens of millions of pixels
  within seconds). `position: absolute` is what keeps the spine's own size out of the body's
  auto-height calculation and breaks that loop.

---

## Scenes (`src/components/journey/scenes/`)

Each chapter is a cinematic **scene**, not a text block with swapped copy. Every scene shares one
grammar — spine, sticky marker (year + label), `QuoteBlock` (hero quote → deck), `MetaList`,
`SkillChips` — revealed in that fixed order via `useSceneReveal`. What varies per scene is the
**featured visual** and how it composes with the quote, plus the content that flows through a
shared **typographic hierarchy** (same system on every card, so cards stay visually consistent
while their actual content — which words are accented, what the visual is — differs):

| Tier | Register | Where |
|---|---|---|
| Quote (headline) | `--serif`, `--fg`, largest on screen; final line in `--accent` (lime) | `QuoteBlock.jsx` / `JourneyMobile.jsx` |
| Deck (story) | `--sans`, `--fg-2` reading prose, one `**marked**` phrase in `--serif` italic `--accent-2` (gold) | `QuoteBlock.jsx` / `JourneyMobile.jsx`, via `deckEmphasis.js` |
| Metadata (data) | `--mono`, `--fg-2`, `--tracking-wider` — reads as structured data, not another sentence | `MetaList.jsx` |
| Chips (auxiliary) | `--sans`, `--fg-2`, `--tracking-wide`, outlined pill, hover→`--accent` | `SkillChips.jsx` |

The lime accent on a quote's final line is a **static, non-interactive** use of `--accent` — see
the note in `docs/design-system.md`'s color-system section distinguishing it from the token's
primarily-interactive role.

| Scene | Chapter | Featured visual |
|---|---|---|
| `SceneFoundation` | origin (2019) | Monoline blueprint grid that sketches itself on via `strokeDashoffset` as you scroll (verticals, then horizontals), then a brighter "origin" crosshair — scroll-driven, static at rest |
| `SceneScale` | saras (2021) | Two "erratic" jittered threads (raw request traffic) cross-fade + converge into two calm, rhythmic threads as you scroll, resolving a "−60% latency" caption whose number **counts up 0 → −60%** in the same window the threads settle — the latency win told visually, not just stated. Scroll-driven (reverses on scroll-up), static at rest |
| `SceneLeap` | usa (2022) | A thin route arc, full field width, drawing in via `strokeDashoffset` as you scroll, with a small plane marker traveling India→United States along the same Bézier the arc is drawn with (position + tangent-angle sampled from the shared scroll progress) — horizontal space is the "crossing an ocean" metaphor |
| `SceneBuild` | stevens (2023) | Four log-style rows (tick + bar) that cascade in top to bottom, staggered, reading as an automated script/log executing |
| `SceneToday` | today (Present) | A glowing terminal cursor (`>_`) that blinks and occasionally stretches into a short line before snapping back; the **only** visual with continuous idle motion at rest — every other scene's visual is scroll-driven and holds still once revealed |

**`useSceneReveal(progress)`** (`src/hooks/useSceneReveal.js`) is the shared reveal primitive every
scene calls with its own scene-local `scrollYProgress` (`useScroll({ target: rootRef, offset:
SCENE_REVEAL_OFFSET })`, where `rootRef` is the scene's own root element). It returns exactly 7
`{ opacity, y }` bands — `quoteLines[0..2]`, `deck`, `visual`, `metadata`, `chips` — each covering a
windowed, slightly-overlapping sub-range of `[0,1]` so bands reveal in order and blend into one
another rather than popping in discretely. Because it's driven by scroll position (not a one-shot
`whileInView` trigger), scrolling back up reverses the reveal symmetrically. The chapter label
isn't part of this — it's static in the sticky marker (`JourneyTimeline.jsx`), grouped with the
year.

A scene composes `bands.visual` further for its own visual — e.g. `SceneScale` derives its metric's
scale/opacity from `bands.visual.opacity` via a second `useTransform`, so the visual's entrance is
locked to the same window as the rest of that scene's reveal without a second scroll subscription.

**Adding a 6th chapter/scene:** add the data entry to `JOURNEY` (`src/data/journey.js`) with a new
`scene` key, write `SceneWhatever.jsx` (mirror an existing scene's structure: root ref + `useScroll`
+ `useSceneReveal` + `QuoteBlock`/`MetaList`/`SkillChips` + bespoke visual), and register it in
`scenes/index.js`'s `SCENES` map.

---

## Frame Relay

The `ScrollProgressFrame` left rail (full detail: `docs/architecture.md`, "Scroll Progress Frame")
hands off to this section's spine so the two always read as **one continuous line**, never two:

1. As `#journey` arrives, the frame's left rail fades out (`leftRailOpacity` in
   `ScrollProgressFrame.jsx`) while the spine translates in from the viewport's left edge to its
   resting gutter position.
2. Through the dwell (all five entries scrolling past), the rail stays fully suppressed and the
   spine sits at rest, only its fill height changing.
3. As `#journey` leaves, the spine translates back out to the edge while the rail fades back in.

**`--journey-gutter-x`** (defined in `journey.css`) is the single source of truth for "how far
the spine's resting position is from the viewport's left edge":

```css
--journey-gutter-x: calc(max(0px, (100vw - var(--shell-max)) / 2) + var(--space-gutter));
```

It does double duty: `.journey-timeline__track` uses it as `padding-left` (so the timeline text
starts at the same x as every other section's shell-aligned content), and
`JourneyTimeline.jsx`'s `spineTransform` uses it as the relay's translate distance
(`translateX(calc(${relayFactor} * -1 * var(--journey-gutter-x)))`). Because both consumers read
the *same* CSS custom property, the relay's "at rest" endpoint and the spine's actual rest
position can never drift apart, even as `--shell-max`-based centering changes the gutter's real
pixel distance across breakpoints (1280 → 2560).

`relayFactor` (0 = settled at the gutter, 1 = at the viewport edge) is computed in
`JourneyTimeline.jsx` from the `sectionEnter`/`sectionExit` props passed down by `MyJourney.jsx`:

```js
const relayFactor = useTransform(
  [sectionEnter, sectionExit],
  ([se, sx]) => (se < 1 ? 1 - se : sx),
)
```

This is designed so the relay-in animation completes (relayFactor reaches 0) before the first
entry's sticky marker becomes meaningfully visible — by construction, `sectionEnter` reaches 1 at
the same scroll position the sticky avatar pin engages, which is right around when the header has
just scrolled past and the first entry is arriving. There is no observed overlap between "spine
still sliding in" and "an entry's dot is visible" in practice.

---

## Reduced Motion

- `useJourneyEngine`'s `reduced` branch draws one static avatar frame and skips the scroll
  subscription.
- `JourneyTimeline` / `JourneyMobile`'s `reduced` branch renders the spine fully-drawn and static
  (`journey-timeline__spine-fill--static` / `journey-mobile__spine-fill--static`, `height: 100%`,
  no `motion.div`, no scroll subscription).
- Every scene still calls its own `useScroll`/`useSceneReveal` unconditionally under `reduced`
  (rules-of-hooks — hook calls can't be conditional), but each renders a fully static/resolved
  branch instead of consuming the band values, mirroring `JourneyTimeline`'s own
  `reduced ? … : …` pattern: `SceneFoundation`'s grid renders fully drawn, `SceneScale` shows only
  the resolved smooth threads (no erratic lines) with the caption at full opacity, `SceneLeap`'s
  plane renders landed at the destination with no rotation, `SceneBuild`'s log rows render at full
  opacity, and `SceneToday`'s cursor renders steady (no blink, no stretch) — its idle loop is the
  one animation skipped entirely under reduced motion. `SkillChips` no longer has any idle motion
  to skip (removed — see "Do Not").
- `ScrollProgressFrame` under reduced motion doesn't reach the relay logic at all — it takes its
  own early-return branch to the plain top bar (see `docs/architecture.md`).

---

## Accessibility

- `<canvas>`, `.journey-scrim`, both spine elements, and every scene's featured visual are
  `aria-hidden="true"` (decorative).
- `<section id="journey">` is the accessible landmark.
- Chapter copy (year, label, quote, deck, metadata, skills) is real text content in both the
  desktop and mobile trees — nothing is canvas-rendered or image-only. The hero quote renders in
  an `<h3>`.

---

## Extending / Swapping

**Swap the animation source:** implement a new class satisfying the `Renderer` contract
(`src/lib/journey/renderer.contract.js`), update `new ImageSequenceRenderer(canvas)` in
`useJourneyEngine.js`. No UI component changes.

**Add a chapter:** add an object to `JOURNEY` in `src/data/journey.js` (see "Data Shape") and a
matching scene component registered in `scenes/index.js` (see "Scenes"). The timeline and avatar
scroll budget both grow automatically — no scroll-length constant to update.

**Change entry scroll dwell:** adjust `.journey-timeline__entry`'s `min-height` (desktop) or
`.journey-mobile__chapter`'s `padding` (mobile) in `journey.css`.

---

## Do Not

- Do not animate the avatar frame through React state — use the engine's `setProgress` and the
  MotionValue `.on('change', …)` subscription.
- Do not reintroduce chapter/active-index coupling between the avatar and the timeline — the
  shared `scrollYProgress` is the only synchronization mechanism, by design.
- Do not add a second `requestAnimationFrame` loop to this section — the engine owns its own tick.
- Do not use GSAP for any part of this section — it uses CSS `position: sticky` + Framer
  `useScroll` to keep GSAP in its two documented places. See `docs/animation.md`.
- Do not hardcode section content in components — all copy lives in `src/data/journey.js`.
- Do not change `--journey-gutter-x`'s formula in only one of `journey.css` /
  `ScrollProgressFrame.jsx` — it is a shared CSS custom property read by both; changing the
  underlying value automatically keeps them in sync, but renaming or duplicating it would not.
- Do not remove `position: absolute` from `.journey-timeline__spine` — see the runaway-height
  warning under "JourneyTimeline" above.
- Do not use emoji anywhere in this section (copy, data, or UI) — metadata glyphs go through
  `MetaIcon.jsx`'s monoline SVG set only.
- Do not add idle motion to `SkillChips` — chips are static at rest by design (hover-to-green via
  CSS only); if this changes, say so explicitly rather than reintroducing a float silently.
- Do not let a scene's featured visual dethrone the hero quote as the largest element on screen —
  the quote is `--text-display-2xl` (56px) at ≥1280px, one step above every other band in its
  scene; scene personality comes from the visual's metaphor and composition, not from competing
  with the quote for size.
