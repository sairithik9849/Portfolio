# Mobile & Responsive

Owner doc for the **responsive tier system**, the **pointer-capability axis**, and the
in-progress **desktop → mobile translation effort**.

- `docs/design-system.md` owns tokens, spacing, type scale, color roles.
- **This doc owns** which viewport widths exist, what each tier is derived from,
  how hover/touch is handled, and the phase-by-phase progress ledger.

If the two conflict on a breakpoint value, this doc wins.

**Status:** **Phase 3 in progress** (2026-08-01) — WhatIDo design locked via interview;
Stages A, B, C, and D landed (the phone rig pins/scrubs/snaps at every tier; tablet's viz
panel no longer clips Interface; all five vizzes fit the phone panel per real-device
screenshots — Chromium-verified, real-device re-check still outstanding, §5.3.13). Stages
E–F remain: reduced-motion restyle, docs correction. See §5.3 for the full decision record
and stage plan. Phase 2
complete (2026-07-31): AboutMe
section-head scale fixed and the Hero → AboutMe sticky-stack extended to every tier
(phone included), §5.2. Decisions in §3 are locked (interview, 2026-07-23; Hero interview
2026-07-24; AboutMe interview 2026-07-31; WhatIDo interview 2026-07-31).

Phase 0 was signed off with four engine-level checks deliberately deferred rather than
run: iOS Safari's renderer, `100svh` address-bar collapse, real touch momentum against
Lenis, and thermal/GPU behavior. None are reachable locally (§7.2). Everything else —
including the coarse-pointer layer — was verified via §7.1a. Fold these into Phase 1's
real-device gate; do not treat them as passed.

---

## 1. What Sai is trying to do

Make the portfolio render *and animate* correctly on phones and tablets **without
losing the desktop site's looks, animation, or feel**.

Non-negotiables, stated directly by Sai:

1. **All content ships everywhere.** No section, element, or copy is dropped on mobile.
2. **All animation ships everywhere.** Nothing becomes a static list.
3. **Perfect alignment** at small widths — no overflow, no clipping, no cramped stacks.
4. Work proceeds **top-to-bottom, one section at a time**, after a shared foundation.

> An agent resuming this work must not propose cutting Spline, the avatar sequence,
> StarField, or any section "for mobile performance." That was explicitly rejected.
> See §6.

---

## 2. The single most important reframe

**Mobile is not greenfield here. It is written but never looked at.**

The repo already contains ~20 `@media` blocks, a dedicated `JourneyMobile.jsx`, a
`gsap.matchMedia` desktop gate, and a correct `<meta name="viewport">`
(`index.html:10`). None of it was ever rendered at a mobile width.

That is the root cause of every defect in §4: the rules were written from
imagination and shipped unverified.

**The job is therefore: render what exists at 390px, find where it breaks, translate
it section by section — not "add mobile support."**

---

## 3. Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Audit + translate, not build from scratch | Mobile CSS already exists everywhere; see §2 |
| 2 | **No** multi-agent skills (`fan-out-fan-in`, `stochastic-multi-agent-consensus`, `model-chat`) | Those are discovery tools for open-ended questions. The architecture already chose. The bottleneck is rendering on a phone, which no amount of parallel reasoning substitutes for |
| 3 | Full fidelity — nothing cut | Sai's explicit requirement |
| 4 | Animations **translate**, never delete | A horizontal scrub is illegible at 390px. Keep the *beats*, change the *axis* |
| 5 | **Three tiers**: phone `<768` / tablet `768–980` / desktop `≥981` | Sai's choice over a simpler two-tier split |
| 6 | Tablet is derived from **desktop choreography, retuned** | Keeps pin/scrub/sticky mechanics; scales type, spacing, stage widths |
| 7 | `(pointer: coarse)` is a **separate axis**, independent of width | A tablet running desktop layouts has no hover. Also covers touch laptops at desktop widths |
| 8 | Ship all weight; measure before cutting | `<SpeedInsights />` is already mounted (`App.jsx:363`) and has never been read. Don't build a device-capability system for an unconfirmed problem |
| 9 | Verify layout via MCP resize; verify touch on a **real phone** | See §7 |
| 10 | Foundation phase first, then strict top-to-bottom | Prevents each section inventing its own breakpoint vocabulary — which is how the current 980/768/640/600/460 spread happened |

### 3.1 Options that were considered and rejected

Do not re-propose these without new information:

- **Mobile-lite** (drop Spline / widviz / avatar sequence) — rejected, §1.
- **Pure reflow, no bespoke work** — rejected; leaves WhatIDo and Projects as shrunken desktop.
- **Two tiers at 980px** — rejected in favour of three.
- **Two tiers at 768px** — rejected.
- **Bespoke third design per section for tablet** — rejected; tablet derives from desktop.
- **Capability-gating (`deviceMemory` / `saveData` / `effectiveType`)** — rejected as speculative; also Chromium-only, iOS Safari reports none of it.
- **Pre-emptive half-res avatar sequence** — rejected for now; revisit only if Speed Insights flags it.
- **Adding `playwright` as a devDependency** — rejected; the real-device gate is authoritative anyway.

### 3.2 The tier system

```
   0 ──────── 767 │ 768 ──────── 980 │ 981 ──────────►
   [   PHONE      ]│[   TABLET       ]│[   DESKTOP    ]
    vertical        desktop mechanics,  full
    translation     retuned scale       choreography

   ORTHOGONAL:  @media (pointer: coarse), (hover: none)
                applies at ANY width — converts hover → tap/scroll-triggered
```

**Every tier-defining `@media` width in `src/styles/` must be `768px` or `981px`.**
Intra-tier refinements (e.g. `@media (max-width: 460px)` inside the phone tier) are
allowed and are *not* violations — they refine within a tier, they don't define one.

### Exact boundary form — `767/768`, never `768/769`

```css
@media (max-width: 767px)                        { /* phone   */ }
@media (min-width: 768px) and (max-width: 980px) { /* tablet  */ }
@media (min-width: 981px)                        { /* desktop */ }
```

768px belongs to **tablet**. Two conventions coexisted before Phase 0.5 — half the
repo used `max-width: 768px` / `min-width: 769px` (768 = phone), the other half used
`max-width: 767px` / `min-width: 768px` (768 = tablet). At exactly 768px — iPad
portrait, the likeliest tablet width — both matched at once, so the hero rendered
phone styles while the shell and Journey rendered tablet, and the `min-width: 769px`
height-combined blocks covered nothing at all.

Normalized in Phase 0.5. If you add a breakpoint, use the three forms above verbatim.
Audit with:

```bash
grep -rn "min-width: 769px\|max-width: 768px" src/styles   # must return nothing
```

**Constraint — do not try to "tokenize" this.** CSS custom properties cannot be read
inside `@media` queries. The tier system is a documented convention enforced by
review. Do **not** add PostCSS, Sass, or a build plugin to work around this.

---

## 4. Ground truth: current state of the code

Verified 2026-07-23. Re-verify line numbers before relying on them.

### 4.1 Journey is already correct — use it as the reference

`MyJourney.jsx` renders `<JourneyMobile>` unconditionally and `.journey-desktop` is
hidden by default (`journey.css:32`), opting in at `min-width: 768px`, with a
`768–980` retune block at `journey.css:794`.

That is **exactly** the target architecture from §3.2. Journey is the reference
implementation, not an outlier. Expect Phase 4 to be verify-only.

### 4.2 Sections that must move

These use `≤980px` as their mobile cutoff. Under the tier system their cutoff drops
to `≤767px` and each gains a `768–980` retune block.

| Section | Mobile block | Notes |
|---|---|---|
| Layout shell | `layout.css:99` | Shared — belongs to Phase 0 |
| Hero | `hero/shell.css:283` | Also `hero/robot.css:127`, `hero/terminal.css:483`, `hero/manifesto.css:381` |
| AboutMe | ✅ done, §5.2 | Coupled to Hero via the sticky-stack |
| WhatIDo | `WhatIDo.css:303` | Hardest translation — see §4.4 |
| Projects | `projects.css:248` | Horizontal accordion → vertical expand |

`hero-about-stack.css` now gates the sticky-pin at `(prefers-reduced-motion:
no-preference)` only — width-independent, per §5.2. **Hero and AboutMe are one
coupled unit at every tier**, not just tablet/desktop.

### 4.3 CONFIRMED BUG — WhatIDo collapses on iPad landscape

Live defect on `main` as of 2026-07-23. Not hypothetical.

```
WhatIDo.jsx:37   DESKTOP_QUERY = '(min-width: 981px) and (pointer: fine)
                                  and (prefers-reduced-motion: no-preference)'
WhatIDo.css:303  fallback      = @media (max-width: 980px),
                                        (prefers-reduced-motion: reduce)
WhatIDo.css:72   .wid-stack    { position: absolute; top: 0; left: 0 }
WhatIDo.css:63   .wid-left     { /* height set dynamically in JS */ }
```

At **1024px + coarse pointer** (iPad landscape, touch laptop):

- the GSAP pin does **not** run — `DESKTOP_QUERY` requires `pointer: fine`;
- the CSS fallback does **not** apply — width > 980 and motion is not reduced.

Result: `.wid-stack--base` and `.wid-stack--ko` both sit absolute at top-left inside
a `.wid-left` whose height is never set, so the word stacks collapse and overlap.

The fallback's `prefers-reduced-motion` arm exists for precisely this failure mode
(see the comment above `WhatIDo.css:303`). The `pointer: coarse` arm was never added.

**Fix:** add `(pointer: coarse)` as a third arm to the `WhatIDo.css:303` selector list.
Scheduled as Phase 0.3.

### 4.4 What WhatIDo currently does on mobile (the biggest translation)

`WhatIDo.css:303` currently *deletes* the section's signature interaction:

```css
.wid-band                                { display: none }  /* knockout band     */
.wid-stack--ko                           { display: none }  /* knockout text     */
.widviz-panel:not(.widviz-panel--frozen) { display: none }  /* LIVE viz panel    */
.wid-stack                               { transform: none !important }
/* GSAP pin killed; replaced by .wid-mobile-blurbs — a static stacked list  */
```

Frozen (non-animating) viz panels still render inside the mobile blurbs, so the
visualizations *appear* but do not animate.

Per decision #4 this must become a **vertical** equivalent, not a static list:
a vertical pin + scrub, with the viz panel sticky and swapping per active word.

```
target — phone (390px)
┌────────────────────┐
│  sticky viz panel  │  ← swaps as active word changes
├────────────────────┤
│  SYSTEMS   ◄ active│
│  backend           │  ← scrubs on vertical scroll
│  interface         │
└────────────────────┘
```

Note `DESKTOP_QUERY` already contains `(pointer: fine)`. Any tablet work must keep
that guard coherent with the CSS fallback — that mismatch is exactly bug §4.3.

### 4.5 Hover inventory (needs the `(pointer: coarse)` treatment)

28 `:hover` rules total. Only **one** coarse-pointer block exists today
(`hero/robot.css:185`) — it is the pattern to follow, co-located with its component.
Do **not** create a global `responsive.css`; keep pointer rules next to the styles
they override.

| File | `:hover` count |
|---|---|
| `hero/terminal.css` | 6 |
| `hero/manifesto.css` | 5 |
| `ai.css` | 4 |
| `return-to-top.css` | 3 |
| `journey.css` | 3 |
| `hero/shell.css` | 2 |
| `about-me.css` | 2 |
| `hero/robot.css` | 1 (already has a coarse block) |
| `footer.css` | 1 |
| `WhatIDo.css` | 1 |

### 4.6 Orphan breakpoints — intentionally left alone

`preloader.css:254` (600px), `hero/manifesto.css:391` (460px),
`hero/identity.css:116` (640px). All three sit **inside** the phone tier, so they are
intra-tier refinements, not tier violations. Leave them.

### 4.7 Mobile payload (shipping as-is per decision #8)

| Asset | Cost | Current mobile behavior |
|---|---|---|
| Spline robot | ~600 KB runtime + WebGL context + shader compile | **Already ships to phones** — `hero/robot.css:127` sets `.hero-spline { opacity: 1 }`. Lazy-loaded via `SplineScene.jsx` |
| Avatar sequence | `public/avatar/` — 193 `.webp` frames, **5.2 MB** | Windowed at ±24 frames (`src/lib/journey/sequenceConfig.js`), so it streams; a full scrub pulls all 5.2 MB |
| StarField | box-shadow raster — paint-bound on mobile GPUs | Ships |

Before proposing any cut: read the **mobile** LCP / INP / CLS percentiles in Vercel
Speed Insights. It is already mounted and has never been checked.

---

## 5. Phase plan

Foundation first, then strict top-to-bottom. Check items off as they land.

### Phase 0 — Foundation (no new dependencies)

- [x] **0.0** Added a `docs/mobile.md` row to the CLAUDE.md routing table
- [x] **0.1** `docs/design-system.md` — added a "Breakpoint Tiers" section after
      "Layout Shell": tier diagram, the 768/981-only rule, pointer-capability axis,
      and the do-not-tokenize constraint
- [x] **0.2** `.claude/skills/visual-verify/SKILL.md` — matrix is now 390/768/1280/
      1440/1920/2560 (all required); added the "hover at mobile widths is false"
      warning; added Step 6 real-device gate; report template gained `sm`/`md` and
      real-device rows; frontmatter description updated
- [x] **0.3** `src/styles/WhatIDo.css` — added the `(pointer: coarse)` arm and
      rewrote the comment to state the DESKTOP_QUERY mirroring rule (bug §4.3 fixed)
- [x] **0.4** `src/styles/layout.css` — split the shared `≤980` block into
      tablet `768–980` (desktop structure retuned) + phone `≤767`
- [x] **0.5** *(discovered during 0.4's audit, not in the original plan)* —
      normalized the `768/769` off-by-one across `hero/shell.css`,
      `hero/terminal.css`, `hero/manifesto.css`, `hero/identity.css`, `ai.css`,
      `return-to-top.css`. 12 blocks: `min-width: 769px` → `768px`,
      `max-width: 768px` → `767px`. Strictly a 768px-only change — cannot affect
      767 or 769. See §3.2 "Exact boundary form"

- [x] **0.6** *(regression caught during Phase 0 verification)* —
      `src/styles/about-me.css` now hides its own `.section-head .right`. 0.4
      restored that element for the tablet tier, but AboutMe keeps a two-column
      head at ≤980, so its third child wrapped to a second row at 72px wide.
      The file that narrows the grid owns its third child. Revisit in Phase 2.

### Phase 0 verification result (2026-07-23)

`npm run lint` → 0. `npm run build` → passes.

Tier integrity — **exactly one tier matched at every width tested** (390 / 768 /
1280 / 1440 / 1920 / 2560). At 768 the old convention is provably broken:
`(max-width: 768px)` → `true` while `(min-width: 769px)` → `false`.

Section-head across the tiers:

| Width | `#about` | `#what-i-do` | `#work` |
|---|---|---|---|
| 390 (phone) | 2-col, `.right` none | — | — |
| 768 (tablet) | 2-col, `.right` none *(0.6)* | 3-col, `.right` empty (w 0) | **3-col, `.right` w 200** ✓ |
| 1280–2560 (desktop) | 3-col `96px 1fr auto` | 3-col | 3-col, `.right` w 280 |

**Measurement note.** CSS media queries match against viewport width *including*
the scrollbar; `documentElement.clientWidth` excludes it. At a 768px window,
media queries see 768 but `clientWidth` reports 753. Same discrepancy documented
at `ScrollProgressFrame.jsx:32`. Probe with `matchMedia`, not `clientWidth`.

### Baseline horizontal overflow (pre-existing — Phase 1–6 backlog)

Measured on `main` + Phase 0. Not caused by Phase 0: every rule changed here
matches identically at 375px before and after.

| Width | `scrollWidth − clientWidth` |
|---|---|
| 375 (phone) | **243px**, 19 outermost offenders |
| 753 (tablet) | 154px |
| 1280 / 1920 / 2560 | 0px |
| 1440 | 21px — `.shell` `max-width: 1440px` vs. a scrollbar-reduced 1425px viewport |

Worst offenders at phone width, by section:

| Element | Section | Overflow |
|---|---|---|
| `a` (social link) | `#contact` | +173px |
| `.wsys-cell` ×3 | `#what-i-do` | +138px |
| `.meta-social` | `#top` | +104px |
| `.wbk-graph` | `#what-i-do` | +84px |
| `.wbk-node-labels` | `#what-i-do` | +51px |

Re-measure with the probe in §7.1 after each phase; the number must trend to 0.

### Known dead rule

`.row` (12→6 column grid, `layout.css`) **matches no element on the rendered
page** — `document.querySelector('.row')` returns null. It survives in
`layout.css` as unused CSS. Confirm and delete during a later phase rather than
carrying it through six tier migrations.

### Phases 1–6 — section by section

| Phase | Scope | Notes |
|---|---|---|
| ✅ 1 | Preloader + Hero | **Done 2026-07-24.** See §5.1 |
| ✅ 2 | AboutMe + `hero-about-stack.css` | **Done 2026-07-31.** See §5.2 |
| 🔨 3 | WhatIDo | **Designed 2026-07-31 — see §5.3.** Stages A-C done, Stage D in progress |
| 4 | Journey | Expect **verify-only** — already correct per §4.1 |
| 5 | Projects | Horizontal accordion → vertical expand |
| 6 | Footer / AIOrb / ReturnToTop / ScrollProgressFrame | Smallest surface. **AIOrb phone treatment already shipped early, out of order — see below.** |

Each phase is done only when §7's checklist passes.

### 5.1 Phase 1 result (2026-07-24) — Preloader + Hero

Hero interview (grill-me, 2026-07-24) drove the design against two reference mockups
(phone = robot-alignment reference; tablet = retuned desktop). Locked sub-decisions:
robot on phone is a **centered band at z:3 above the cards**, silhouette tuned to clear
card text; **tablet = retuned desktop** (robot right, terminal absolute over it, 4-col
metrics, `height:100svh`); sticky-pin **deferred to Phase 2**; phone H1 fits each word on
one line; phone meta-row restacks (role+email / socials icon-only); metrics stay 2×2 on
phone (the ≤460 1-col rule was removed); the stuck touch AI-chip is hidden; hero hovers
gained `(pointer: coarse)` fallbacks.

**Update (2026-07-29):** phone meta-row revised from a single row to two —
matrix/role text on its own line (`white-space: nowrap` + `--tracking-open`
guarantees one line at any phone width down to 320px), GitHub/LinkedIn/Resume
with labels restored on the line below (all three fit on one line; icon-only
and the hidden Resume button were dropped). Email stays hidden. Change is
CSS-only in `hero/shell.css`'s phone block — no markup or breakpoint added.

Files changed: `hero/shell.css` (tier split, `display:contents` flow-reorder
metrics→terminal→CTA, ~18px gutter, meta-row restack), `hero/identity.css` (phone/tablet
H1), `hero/manifesto.css` (metrics tiers, centered phone CTA, coarse fallbacks),
`hero/robot.css` (phone band z:3, coarse chip fix), `hero/terminal.css` (tier split,
coarse fallbacks). `preloader.css` verify-only (unchanged). `Hero.jsx` unchanged.

**Update (2026-07-29):** `preloader.css` is no longer verify-only. Added a
mobile/tablet-only advisory line (`BEST EXPERIENCED ON DESKTOP`, gold shimmer,
`src/data/preloader.js`'s `PRELOADER_NOTICE`), stacked above the box loader and
hidden at `min-width: 981px` (the desktop-tier boundary). Centering ownership moved
from `.preloader-boxes-wrap` up to a new `.preloader-center-stack` flex column so the
notice + box + reflection form one centered cluster; on desktop the notice is
`display:none`, leaving the box wrap centered exactly as before. Files:
`Preloader.jsx`, `preloader.css`, `data/preloader.js`.

**Update (2026-07-29):** the Spline robot tracked touch drags on phone/tablet —
Spline's own canvas listener saw native touch `pointermove` directly, a path
`Hero.jsx`'s mouse-only forwarding filter never covered. Fixed with one rule in
`hero/robot.css`'s existing coarse-pointer block: `.hero-spline { pointer-events:
none }`. Tap-to-open and the periodic forward-gaze (`aimForward`) are unaffected
— see "Touch" in `docs/hero.md`. CSS-only, `Hero.jsx` unchanged.

Verification (`npm run lint` → 0, `npm run build` → passes) via §7.1a computed-style /
`getBoundingClientRect` assertions:

| Row | Result | Proof |
|---|---|---|
| phone 390 (×844/667/932) | H1 50.7px no mid-word break; meta 2-col + socials row; metrics 2×2; order metrics→terminal→CTA; gutter 19.5px; **hero overflow 0** (the 8px is StarField's documented `100vw` full-bleed) | computed-style |
| robot band | in reserved gap; clears terminal (+37/+11/+50px at 844/667/932); 0–26px metrics overlap | rect |
| tablet 768 / 980 | `relative` `100svh`; 3-zone meta; 4-col metrics; terminal `absolute` right, clears metrics +13/+105px; CTA within viewport | computed-style |
| desktop 1280 / 1440 | `sticky` intact; H1 = base `9.6vw`; grids unchanged (**no regression**) | computed-style |
| coarse pointer (CDP) | `.robot-agent-cta` opacity 0 / pointer-events none (stuck-chip bug fixed); term-link accent | computed-style |
| reduced-motion | h1 opacity 1 (instant); order + reserved gap intact | rect |

**Deferred to the real-device gate (§7.2), not yet passed:** the robot silhouette vs.
the metric numbers/labels (WebGL doesn't render in headless Playwright, and the band's
head position is pose/`svh`-drift sensitive); `100svh` address-bar collapse; touch
momentum. Verify on a real iPhone + Android before treating Phase 1 as fully signed off.

### 5.1.1 Real-device defect found — first-load freeze on iOS Safari (2026-07-29)

The real-device gate (§7.2) is exactly what surfaced this: on a real iPhone, first cold
load, the curtain lifted cleanly but the hero cascade then froze for a beat and popped in
all at once instead of animating phase by phase.

**Cause:** `requestIdleCallback` does not exist in iOS Safari (WebKit ships it behind an
off-by-default flag). The two idle-deferral sites in `App.jsx` (`sectionsMounted`, the
Lenis/`ScrollTrigger` init) both fell back to `setTimeout(cb, 0)` — the next macrotask, not
idle time — so the below-fold mount and Lenis init landed on top of the Hero cascade's
opening beats right after `heroStarted`. `docs/architecture.md`'s "Staged Hero Mount" claim
that this work is idle-deferred was true on desktop Chrome and false on iOS Safari — the
phone never got the benefit the staging was meant to provide.

**Fix:** `src/utils/scheduleIdle.js` — same idle-first behavior, but a real non-zero
`setTimeout` fallback (600ms / 1000ms) instead of `0`. Confirmed via Playwright with
`requestIdleCallback` deleted pre-navigation: before the fix, two cascade phases that
should land ~350ms apart landed on the same millisecond, 7+ seconds after load; after the
fix, phases were spread across their intended beats. Desktop regression-checked at 1440
(`requestIdleCallback` present, unaffected). See `docs/architecture.md` "Staged Hero Mount"
and its new "Do Not" entry for detail.

**Still needs the real iPhone/Android re-check (§7.2)** — this fix has only been verified via
Playwright with the API deleted, which exercises the same fallback code path but not real
device timing.

### 5.2 Phase 2 result (2026-07-31) — AboutMe section head + universal sticky-stack

AboutMe interview (grill-me, 2026-07-31) drove two changes: the section-head scale/spacing
defect (screenshot-driven) and extending the Hero → AboutMe sticky-stack to every tier,
including phone — a bigger scope than §3's original "tablet only" framing (decision #6),
superseded by this interview.

**Section head.** `layout.css`'s tier blocks narrowed the index *column* per tier (96px →
80px tablet → 72px phone) but never scaled the index/title *font* — both stayed at the
desktop `--text-display-5xl`/`--text-display-2xl` (96px/56px) at every width, so the index
glyphs overflowed their column and collided with the title. Fixed by adding font-size and
padding overrides to the existing tier blocks (desktop unchanged; tablet: idx 72px/title
42px/gap 20px; phone: idx 52px/title 30px/gap 14px — same ~1.7× idx:title ratio as desktop,
column width = idx font size). `about-me.css` had also re-declared the grid at `.about-me
.section-head` (higher specificity than `layout.css`'s tier rules, silently shadowing them)
and a redundant `@media (max-width: 980px)` override with a `.right { display: none }` patch
from Phase 0.6 — all deleted; `layout.css` now owns section-head sizing at every tier, with
no per-section duplication.

**Found after initial ship (user report, 2026-07-31): the phone/tablet padding-top above was
silently a no-op.** `about-me.css`'s own `.about-me .section-head { padding-top: 0 }` (two
classes) outranks `layout.css`'s tier-scoped `.section-head { padding-top: … }` (one class)
regardless of media query, so the heading had **zero** top clearance at every tier — read as
the progress-frame's birth line "sticking to" the heading. Desktop needs that `0` (`.about-me`'s
own `clamp(40px,7vh,80px)` top padding already provides the clearance there); phone/tablet
zero `.about-me`'s own top padding instead (see the `≤980px` block below) specifically so
`section-head` should own that spacing — it just wasn't reaching it. Fixed by scoping the `0`
to `@media (min-width: 981px)`, letting the tier padding-top values (72px phone / 96px tablet)
apply as originally intended.

**Sticky-stack, extended to every tier.** User-stated constraint: the phone hero must **not**
be compressed to fit one screen — it stays taller than the viewport exactly as Phase 1 shipped
it (`height: auto; min-height: 100svh`, `hero/shell.css:324`). Desktop/tablet's `top: 0` sticky
works because `.hero` is exactly `100svh` there; applying `top: 0` to a taller phone hero would
lock it at the first scroll pixel and make everything below the fold unreachable (a sticky
element's own overflow can't be scrolled into view once it's stuck).

Fix: `top: var(--hero-pin-top, 0px)`, where `--hero-pin-top` is written by a new `App.jsx`
effect — `min(0, document.documentElement.clientHeight − hero.offsetHeight)`, via a
`ResizeObserver` on `#top` plus a `resize` listener (same measurement pattern as
`ScrollProgressFrame.jsx`'s `useViewportSize`, not a new one). This computes to `~0px` on
desktop/tablet (byte-identical old behavior) and a negative offset on phone sized to the
hero's overflow, so the hero scrolls normally through all its content and only locks once its
bottom edge — the Discover Me CTA — reaches the viewport bottom, matching desktop's
choreography with no retuning of Phase 1's verified hero content.

The pin's gate dropped its width condition entirely: `hero-about-stack.css`,
`ScrollProgressFrame.jsx`'s `FRAME_MEDIA_QUERY`, and `App.jsx`'s `pinQuery` all moved from
`(min-width: 981px) and (prefers-reduced-motion: no-preference)` to
`(prefers-reduced-motion: no-preference)` — one shared rule now: motion allowed = pin + card
+ SVG progress frame at every tier; reduced motion = normal flow + flat progress bar
everywhere. `ScrollProgressFrame`'s `frameMode` state/effect was deleted outright (net ~12
lines) since its geometry was already viewport-relative, not desktop-specific. `App.jsx`'s
`heroVisible` observer (`#top` vs `#hero-sentinel`) now switches on the same reduced-motion-only
query, so StarField/Spline still pause correctly once the phone hero is pinned and scrolled
past.

**Correction (see §5.2.2 below):** that last sentence was verified only for the *pause* transition.
The same `#top`/sentinel + pin-`matchMedia` switch left `heroVisible` `false` from first paint on
phone — StarField and MatrixText were frozen, not paused-then-working, from the moment the preloader
lifted. `App.jsx` no longer has a `pinQuery` for `heroVisible` at all; §5.2.2 has the fix.

Files: `src/styles/layout.css`, `src/styles/about-me.css`, `src/styles/hero-about-stack.css`,
`src/App.jsx`, `src/components/ScrollProgressFrame.jsx`, `src/styles/scroll-progress-frame.css`.

**Verification status:** lint/build clean. Playwright resize matrix (390/768/1280/1440),
coarse-pointer (§7.1a), and reduced-motion all pass — including a scroll simulation at 390
confirming the lock triggers exactly when the CTA reaches the viewport bottom
(`--hero-pin-top: -483px` on a 1327px-tall hero in an 844px viewport, math exact) and desktop
rows are byte-identical to pre-Phase-2. Real Android still needed; real iPhone found the defect
below.

### 5.2.1 Real-device defect found — progress-frame birth line detached from the card on iOS Safari (2026-07-31)

The real-device gate (§7.2) is exactly what surfaced this, same as §5.1.1: on a real iPhone, the
gold progress-frame line that's supposed to stay glued to the About Me card's rising top edge
during the birth phase visibly detached and lagged behind the card mid-scroll, snapping back into
alignment only once the card finished rising and the pin resolved.

**Cause:** `ScrollProgressFrame.jsx`'s birth-phase transform used a CSS `vh` unit
(`translateY: (1 − birthProgress) · 100vh`) while every other measurement in the same component —
the SVG's own dimensions, `buildFrameGeometry`'s insets and corner radius — uses the *measured*
`document.documentElement.clientHeight` via `useViewportSize`'s `ResizeObserver`. On mobile Safari
these two are not the same number: `vh` always reflects the "large" viewport (address bar fully
collapsed), independent of whether the address bar is actually showing at that instant, while
`clientHeight` reflects the real, currently-visible height. Desktop has no dynamic browser chrome,
so `vh` and `clientHeight` never diverge there — the bug is phone-only and was invisible to every
Playwright check in §5.2, none of which can emulate a collapsing address bar.

**Fix:** swapped the `vh`-based `birthOffsetVh` for a pixel-based `birthOffsetPx` using the same
`height` value (from `useViewportSize`) that the rest of the component already uses — one shared
measurement source instead of two that quietly disagree. Same pattern as the `min-height: 100vh →
100svh` fix already made to `.about-me` in `hero-about-stack.css` during this phase; this is the
same class of bug, just missed on the first pass because it lives in a `useMotionTemplate` string,
not a CSS file.

**Still needs re-verification on the real iPhone** — this fix has only been reasoned through and
lint/build-checked, not yet re-tested against a real collapsing address bar (§7.2 is authoritative
for this exact failure mode).

### 5.2.2 Real-device defect found — StarField and MatrixText frozen from first paint on phone (2026-08-01)

The real-device gate (§7.2) surfaced this too: on a real iPhone (Safari and Chrome iOS both — same
WebKit render engine), the star field never drifted and the bracketed role string in the meta-row
(`MatrixText`) never scrambled, from the moment the preloader lifted. Only the Spline robot
responded to touch, since it re-renders off its own pointer events rather than `heroVisible`.

**Cause:** `App.jsx`'s `heroVisible` observer read `entry.isIntersecting` on `#hero-sentinel`. On
phone `.hero` is deliberately taller than the viewport (`height: auto` — §5.2's sticky-stack
section), so the sentinel's *starting* position at scroll 0 already sits below the fold —
`isIntersecting` was `false` before the user ever scrolled, and `heroVisible` never went true.
`§5.2`'s claim that "`heroVisible` observer (`#top` vs `#hero-sentinel`) ... still pause[s]
correctly once the phone hero is pinned and scrolled past" (line ~496 above) was verified only for
the pause transition, never for the initial state — that gap is this bug. Desktop never showed it
because `.hero` there is exactly `100svh`, so the sentinel starts at the fold edge and already
intersects at scroll 0.

**Fix:** read `entry.boundingClientRect.top > 0` instead of `entry.isIntersecting` — "has the
Hero/AboutMe boundary not yet scrolled above the viewport top" holds at every tier and under both
motion preferences, so the previous `#top`-vs-sentinel switch on the reduced-motion `matchMedia`
is gone entirely (same `top` idiom the `returnVisible` observer already used). See "Spline
Visibility Gating" in `docs/architecture.md` for the full before/after.

**Paired change:** `StarField.jsx` gained a phone-tier (`<768px`) geometry override —
`STAR_SPREAD` 2400→520, `LAYERS` counts scaled by the same ratio (240/450/110→52/98/24) so
on-screen density is unchanged; only off-screen stars are dropped. `.starfield__layer` gained
`will-change: transform` so the per-frame drift composites on Safari instead of risking a CPU
repaint of ~350–1600 box-shadow points. Neither is required by the freeze fix above — bundled in
because unfreezing the drift is what makes the phone raster cost pay rent for the first time.

**Deliberately not touched:** `.terminal`'s phone `backdrop-filter` (`hero/terminal.css`) sits over
the now-drifting stars and may re-blur per frame on iOS — Terminal is the hero's one documented
surviving glass surface (`docs/hero.md`), so this needs real-device evidence before changing, not
a preemptive edit.

**Still needs re-verification on the real iPhone** — reasoned through and lint/build-checked only.

### 5.3 Phase 3 design record (2026-07-31) — WhatIDo

Interview via `grill-me`, 2026-07-31. This section is the **design record**, written before
implementation. Update it with a "result" subsection as stages land.

#### 5.3.1 Ground truth corrections found during the interview

Four things §4.4 and `docs/what-i-do.md` got wrong or omitted. Re-verify before trusting
either doc on this section:

1. **`docs/what-i-do.md` is stale on the scroll clock.** It documents `SCROLL_PER_WORD = 780`
   and a single progress track. Actual: `SCROLL_PER_WORD = 1100`, plus a second track —
   `AGENTS_DWELL_PX = 800`, an `agentsProgress` MotionValue, and `captionFade`/`exitFade`
   derived from it. Any mobile rig must reproduce **two** progress signals, not one.
   Scheduled for correction in Stage F.

2. **The mobile "mess" has one dominant cause, and it is not the layout.**
   `WhatIDo.css:352` hides only `.widviz-panel:not(--frozen)`. The *frozen* panels keep
   `.widviz-panel`'s base rule — `position:absolute; left:var(--viz-left);
   right:max(0px,50vw−720px); top:0; height:100vh`. `.wid-mobile-blurb-item` is not
   positioned, so all five frozen vizzes stack on top of each other inside `.wid-stage`
   (the nearest `position:relative`), crushed into a ~147px-wide column starting at 243px
   on a 390px phone. `.wid-mobile-viz` has **zero** CSS. This accounts for most of the
   §5 baseline overflow — `.wsys-cell ×3` (+138px) and `.wbk-graph` (+84px) are those
   elements being squeezed into 147px, not intrinsic overflow.

3. **Two ancestor rules will break any pinned or sticky phone rig.** `.wid-stage`'s
   `clip-path: inset(0 0 -100vh 0)` (`WhatIDo.css:56`) makes it a containing block for
   `position: fixed` descendants; `.wid-left`'s `overflow: hidden` (mobile block) kills
   `position: sticky`. Both must be scoped to `≥768px`.

4. **`lenis.velocity` means something different on touch.** `lenis.mjs:649-672` — with
   `syncTouch: false` (our config, `App.jsx:172-176`) native touch scroll takes the
   `onNativeScroll` path, where `velocity = animatedScroll − lastScroll`, a **raw
   per-event pixel delta** (30–80px on a flick), zeroed only by a hardcoded 400ms
   timeout. The wheel path produces a *smoothed lerp* velocity. `SETTLE_VELOCITY_MAX =
   0.05` was tuned against the latter, so the settle snap's threshold is meaningless on
   touch. This is why decision 5 below replaces the trigger.

#### 5.3.2 The mechanic decision — GSAP everywhere, decided by measurement

Four options were compared in detail: split the width/pointer axes, sticky + Framer
`useScroll` everywhere, GSAP everywhere, and split by width only. Evidence gathered:

- `ScrollTrigger.js:971` — `pinType` resolves to `"fixed"` for a viewport scroller, with
  **no touch special-case** in 3.x. The pin uses `position: fixed` on iOS.
- `ScrollTrigger.js:2038,397` — `_ignoreMobileResize` auto-enables when
  `Observer.isTouch === 1`, and the refresh threshold is `|Δ innerHeight| > 25%`. An iOS
  address bar is ~8–10%, so **GSAP already mitigates the address-bar refresh**. Note it
  does *not* auto-enable on iPad-with-trackpad or touch laptops (`isTouch === 2`).
- `framer-motion/…/scroll/track.mjs:46,53` — `useScroll` is event-driven, not rAF-polled,
  and shares one listener per container. Its cost is comparable to ScrollTrigger's.
- `App.jsx:187` — `gsap.ticker` already runs a continuous rAF for Lenis's whole page
  lifetime. Removing WhatIDo's ScrollTrigger would not reclaim it.

**Resolved by running the pin on real hardware** (worktree spike, both gates stripped from
`DESKTOP_QUERY` with the CSS fallback mirrored): the pin held on a real device. Decision is
**GSAP at every tier** — one mechanic, one code path, smallest diff, and animation fidelity
identical to desktop by construction.

> Do not re-propose sticky + `useScroll` for this section without new device evidence. It
> was not rejected on theory; the pin was tested and passed.

#### 5.3.3 Locked decisions

| # | Decision | Rationale / consequence |
|---|---|---|
| 1 | **Two layouts only** — vertical stack `<768`, side-by-side `≥768` | Tablet keeps §3 decision #6. Verified dimensionally at 768: band is `min(50vw,720px)−24` = 360px, longest word INTERFACE at `8.25vw` renders ~342px |
| 2 | **Phone layout: word window on top, viz below, caption at bottom** | Supersedes §4.4's sketch, which had the viz above the words |
| 3 | **Word window: 3 rows**, lime band on row 1, hard clip above, `mask-image` fade below | ~129px at `clamp(40px, 12vw, 64px)`. 3 rows over 2 buys back the desktop "see what's coming" read for 43px |
| 4 | **Caption clamps to 5 lines** + a real `<button aria-expanded>` to expand | Blurbs run 170–410 chars — a content-sized caption swings 134px between DATA and SYSTEMS and would resize the viz box *during* the cross-dissolve |
| 4a | Expanded caption **overlays the viz** (viz dims, keeps playing), **auto-collapses on any scroll** | The longest blurb is ~224px in a 461px field, so it fits with no internal scrolling — therefore **no scroll lock is needed at all**. See 5.3.4 |
| 5 | **Snap on touch: keep the JS settle snap, retrigger it from the native `scrollend` event** | CSS `scroll-snap` was chosen first but is incompatible with the pin — snap anchors must sit in the scrolling flow, and `pin:true` takes the section out of flow. `scrollend` (Safari 17.4+, Chrome 114+) is a strictly better trigger than the broken velocity threshold (5.3.1 #4) and reuses all existing machinery including the three guards |
| 6 | **Runway on phone = 1.0 × measured viewport height per word** | ~750px/word, ~3750px total, 5 screens — vs 6.9 screens if desktop's fixed 1100px were carried over. `≥768` keeps 1100/800 unchanged. Measure via `clientHeight`, **never `vh`** (§5.2.1) |
| 7 | **Viz aspect: per-viz call, nothing scaled down** | See the table in 5.3.5 |
| 8 | **All five vizzes stay mounted; layers outside `active ± 1` get `content-visibility: hidden`** | See 5.3.6 — this is the real mobile perf win |
| 9 | **Drop `will-change` from `.wdat-dot` on touch** | 110 elements × `will-change: transform, opacity` = 110 promoted compositor layers. The hint is redundant on an element already transforming every frame. No dots removed |
| 10 | **Reduced motion: normal document flow, five stacked blocks, frozen vizzes, full uncla­mped copy** | A pinned section is itself disorienting for the users this setting exists for. `.wid-mobile-blurbs` survives, restyled to the new design language |

#### 5.3.4 The caption budget

Measured against `src/data/whatIDo.js` at 390px width:

| word | blurb chars | ≈ lines | ≈ height |
|---|---|---|---|
| SYSTEMS | 410 | ~10 | ~224px |
| AGENTS | 331 | ~8 | ~180px |
| BACKEND | 283 | ~7 | ~157px |
| INTERFACE | 213 | ~5 | ~112px |
| DATA | 170 | ~4 | ~90px |

Clamping at **5 lines** is deliberate: it is exactly INTERFACE's natural height, so
INTERFACE and DATA never show the expand affordance and only the three long blurbs clamp.

Resulting budget on a 750px `svh` phone:

```
word window (3 rows)  ~129px
caption (5 lines)     ~112px
padding / gaps        ~ 48px
─────────────────────────────
viz field              461px   ← every viz fits: Interface's stage is 340×260,
                                 Agents' mobile field 300px, Data's 375px
```

#### 5.3.5 Per-viz portrait behavior

Every viz uses `preserveAspectRatio="none"`, so they fill the box but **distort** when the
aspect changes. That is invisible on some compositions and obvious on others:

| viz | native geometry | in a 342×461 portrait box | action |
|---|---|---|---|
| **Agents** | viewBox **100×150, already portrait** (`VizAgents.jsx:14`) | aspect 0.67 vs 0.74 — near match; already has a `≤980px` block | **none** |
| **Interface** | fixed `340×260px` stage (`interface.css:43`) | 340 fits inside 342 natively | **none** |
| **Data** | 0–100 square viewBox | stretches ~1.4× vertically; a noise field and a smoothstep curve are aspect-tolerant by nature | **none** (but see decision 9) |
| **Backend** | nodes at `{x:30…70}` | CACHE/DB land 137px apart while carrying `REDIS`/`POSTGRES` tags — the **labels** collide, not the nodes | shrink + stack `.wbk-node-label`/`.wbk-node-tag` in `backend.css` |
| **Systems** | `.wsys-grid` `repeat(2,1fr)` × 3, plus EKG and the node sphere | 6 cells at ~167px each; the sphere goes oval under `none` | **the one real design pass** — aspect-lock the sphere, verify the grid |

> **Backend is a CSS-only fix, not a data change.** An earlier draft of this plan proposed
> widening the node `x` coordinates in `widViz.js`. That is wrong: those coords are applied
> as **inline styles** (`VizBackend.jsx:457`) and the connecting edges are SVG `d` strings
> in the same file, both shared with desktop. Editing them is a desktop regression, and CSS
> can move the nodes but not the edge paths, so the two would desync.

#### 5.3.6 The mobile viz-perf finding

The three rAF vizzes are already cheap when idle — all early-return before any DOM work
(`VizData.jsx:107`, `VizAgents.jsx:496`, `VizSystems.jsx:180`). Two idle loops is ~120
no-op callbacks/sec, negligible. **Mounting fewer components therefore saves almost
nothing** while adding mid-scroll React mounts.

The real cost is CSS keyframe animations, which have no early-return:

| file | `animation:` declarations | explicitly `paused` |
|---|---|---|
| `agents.css` | 16 | **0** |
| `interface.css` | 7 | 3 |
| `backend.css` | 2 | 1 |
| `systems.css` | 2 | **0** |
| `data.css` | 1 | **0** |
| **total** | **28** | 4 |

**24 ungated animations tick on every mounted viz, including layers sitting at
`opacity: 0`.** The fix keeps all five mounted and stops the far ones rendering:

```css
.widviz-layer[data-far] { content-visibility: hidden; }
```

`active ± 1` is always sufficient — `widSlice`'s dissolve trapezoid spans `1.5 × d` where
`d = 1/(N−1)`, so at most **two** layers are ever above zero opacity. No mount churn, no
rAF restart, no lost internal state, cross-dissolve unaffected.

`content-visibility` only landed in Safari 18, so it is paired with a `display: none`
fallback behind `@supports` for iOS 17. **Scoped to `≤980px` / coarse pointer** so desktop
rendering is untouched per §7.4; it can be widened to desktop later once verified there.

#### 5.3.7 Stage plan

| stage | scope |
|---|---|
| **A** | ✅ done, §5.3.8 — Standalone fixes: frozen-panel positioning (5.3.1 #2), scope `clip-path`/`overflow` to `≥768` (#3), `data-far` + `content-visibility` gating, `.wdat-dot` `will-change` |
| **B** | ✅ done, §5.3.10 — The phone rig: `MOTION_QUERY`, viewport-derived runway, 3-row window, caption clamp + expand overlay, `scrollend` snap. CSS fallback gate narrowed here (moved up from E, see §5.3.10 correction 2) |
| **C** | ✅ done, §5.3.12 — Tablet retune `768–980`: audited, container geometry needed no changes; found and fixed a real Interface overflow at tablet width |
| **D** | ✅ done, §5.3.13 — Per-viz fit: Systems, Backend, Interface **phone**, Agents, **Data (scope addition — see §5.3.13)** |
| **E** | Reduced-motion **restyle only** — the gate narrowing this bullet originally described happened in Stage B instead |
| **F** | Docs: correct `docs/what-i-do.md` (5.3.1 #1), add the phone rig, write the §5.3 result subsection |

Stage A is deliberately self-consistent: the existing mobile fallback stays live
throughout, so the phone renders the static list with **correctly positioned** frozen
panels rather than a half-migrated layout.

#### 5.3.8 Stage A result (2026-07-31) — foundation fixes

`npm run lint` → 0. `npm run build` → passes. Verified via §7.1 resize matrix, §7.1a CDP
coarse-pointer emulation, and the reduced-motion branch.

| row | result | proof |
|---|---|---|
| sm 390 | ✓ 5 frozen panels at `x:24 w:327 h:420`, `position:relative`, stacked in flow (was: all five piled at `x:243 w:~147`). `clipPath:none`, `willChange:auto`, `docOverflow:0` | computed-style + **screenshot** |
| md 768 | ✓ frozen `x:24 w:705`; `clipPath` applies; live panel `display:none`; `willChange:auto`; `docOverflow:0` | computed-style |
| lg 1280 | ✓ **regression** — live panel `x:688 w:577 h:900`, band `block`, `willChange:transform, opacity`, `clipPath` applies | computed-style |
| xl 1440 | ✓ **regression** — live panel `x:768 w:657 h:900`, all desktop values unchanged | computed-style |
| 2xl 1920 | ✓ **regression** — live panel `x:1008 w:657` | computed-style |
| 4k 2560 | ✓ **regression** — live panel `x:1328 w:657` | computed-style |
| coarse pointer (1024×768) | ✓ §4.3 holds: `stackPos:static`, `leftHeight:276`. `farContentVis:"hidden"` — the content-visibility gate is live. `willChange:auto` | computed-style (CDP) |
| reduced motion (1440) | ✓ Lenis absent, stacks `static`, 5 frozen panels `x:24 w:1377` in flow, no blank render | computed-style |
| real iPhone / Android | **not run** — §7.2, required before Phase 3 is called done | — |

Desktop rows are byte-identical because every rule added is scoped away from desktop:
`content-visibility` and the `will-change` reset are behind `≤980px`/coarse, the frozen-panel
override only affects elements desktop already hides via `.wid-mobile-blurbs { display:none }`,
and `clip-path` was scoped to `≥768px` — which includes every desktop width.

**Two corrections to the sections above, found by this verification:**

1. **§5.3.5 was wrong about Interface.** It claimed the viz needs no action because its
   `340×260` stage fits a phone panel. It does not: `interface.css:50` applies a base
   `transform: scale(1.35)`, so the real footprint is **459×351**. Measured at 390px it
   renders `x:-33 w:441`, spilling off both edges of a 327px panel, with
   `.wifc-raw-track` reaching 613px wide. The `@media (max-height:900px) and
   (min-width:981px)` block at `interface.css:670` *reduces* it to 1.15 for laptops, so
   nothing constrains it below 981px. **Interface moves from "no action" to a phone
   `scale()` rule in Stage D.** Pre-existing, not caused by Stage A — Stage A merely gave
   the panel correct geometry for the first time, which made it measurable.

2. **§5.3.5 was pessimistic about Systems.** The 2×3 `.wsys-grid` renders legibly at
   ~167px per cell at 390px (screenshot-confirmed). Stage D's Systems pass is therefore
   likely **sphere-aspect only**, not a grid re-layout. Confirm before scoping that work.

**Deferred from Stage A on purpose:** scoping `.wid-left`'s `overflow: hidden`. It lives
inside the fallback block that Stage E narrows to `(prefers-reduced-motion: reduce)` alone,
so scoping it now would add a rule only to delete it later.

#### 5.3.9 Carried assumptions

Not separately decided; correct these if wrong:

- ~~SectionHead scrolls away above the pinned cluster on phone.~~ **Reversed in
  Stage B** — see §5.3.10 correction 1.
- Tapping a word scrolls to that word's snap position (replacing the current
  `scrollIntoView` fallback on `.wid-mobile-blurb-item`, which becomes reduced-motion-only).
  **Confirmed in Stage B** — `scrollToIndexRef` is populated at every tier now, so this
  fell out for free.
- The caption's expand control is a real `<button aria-expanded>`, not a styled `div`.
  **Confirmed in Stage B.**

#### 5.3.10 Stage B result (2026-08-01) — the phone rig

`npm run lint` → 0, `npm run build` → passes. Verified via §7.1 resize matrix (390 / 768 /
1280 / 1440 / 1920 / 2560), §7.1a CDP coarse-pointer emulation, and the reduced-motion
branch — all via computed-style + `getBoundingClientRect` assertions (§7.1b: screenshots
still stall under GSAP's ticker; one screenshot at 390 succeeded and is recorded below as
a secondary check).

**Two corrections made to this design record, both decided before implementation:**

1. **§5.3.9's first assumption is reversed, by Sai's explicit call (grill-me follow-up,
   2026-08-01).** SectionHead stays inside the pinned box on phone — it does **not**
   scroll away. Reason: the pin targets the `<section>`, and the live `.widviz-panel` /
   `.wid-caption` are absolute children of the *section*, not `.wid-stage` — pinning the
   stage instead would unpin them, which would have been a bigger structural change than
   the head's ~77px cost. Revised phone field budget at a 750px `clientHeight`: head ~77
   / word window ~133 / caption ~140–160 / margins ~16 → viz field ≈ 364–384px, not
   §5.3.4's 461px. Confirmed by measurement in a real 844px-tall viewport: field rendered
   at 495px (stage 77.6–210.7, panel 210.7–706.2, caption 706.2–844.4) — taller than the
   750px-based estimate because the field is `flex: 1 1 auto` and simply takes whatever
   remains, per decision 7 ("nothing scaled down"). Per-viz fit against this field is
   still Stage D's job — this stage only had to prove the field lives in the flex column
   with the right neighbors, not that every viz fits it well (see the Agents finding
   below).

2. **The CSS fallback gate had to narrow in Stage B, not Stage E as §5.3.7 originally
   scheduled.** The old `@media (max-width: 980px), (pointer: coarse), (prefers-reduced-
   motion: reduce)` fallback set `.wid-stack { position: static; transform: none
   !important }` — which would have killed the pin's visuals on every tier the new
   `MOTION_QUERY` now covers. `WhatIDo.css`'s fallback gate is now `@media (prefers-
   reduced-motion: reduce)` alone; Stage E's remaining job is only the *restyle* of that
   block (decision 10), not the gate width. Side effect, expected and confirmed: tablet
   768–980 and coarse-pointer ≥981 (iPad landscape) now get the desktop side-by-side
   layout **and** a live pin — bug §4.3 is closed structurally, not by a matching-arms
   patch. Verified directly: at 1024×768 with CDP touch emulation, `.wid-stack--base`'s
   transform advanced from `matrix(1,0,0,1,0,0)`-equivalent to `matrix(1,0,0,1,0,
   -155.438)` as the caption text changed word, with a live `pin-spacer` present — the
   word stacks no longer collapse there. Retuning tablet/coarse-desktop scale is Stage
   C's job.

**A third bug found and fixed during verification, not anticipated in the design
record:** `global.css` imports `WhatIDo.css` *before* `widviz/shell.css`. Shell.css's
unconditional `.widviz-panel { position: absolute; ... }` has the same specificity
(one class) as this stage's phone-scoped `@media (max-width: 767px) { .widviz-panel {
position: relative; ... } }` — at equal specificity, source order decides, and the
later file (shell.css) was winning regardless of the media query, leaving the live
panel at `width:0 height:0` on phone. Fixed by raising the phone override's selector to
`.what-i-do .widviz-panel:not(.widviz-panel--frozen)` — two classes plus a `:not()`
beats shell.css's one-class rule outright, and the `:not()` keeps the extra specificity
from also out-competing shell.css's own `.widviz-panel--frozen` override (which must
keep sizing the reduced-motion fallback's frozen panels). Same *class* of bug as the
`about-me.css`/`layout.css` shadowing found in §5.2 — cross-file equal-specificity
overrides are a recurring hazard in this codebase; **check import order in
`global.css` before assuming a same-file-looking override will win.**

**Implementation, matching the plan exactly** (`src/components/WhatIDo.jsx`,
`src/styles/WhatIDo.css`, no other files):

- `DESKTOP_QUERY` → `MOTION_QUERY = '(prefers-reduced-motion: no-preference)'`, one
  `mm.add` arm. The existing 150ms debounced resize rebuild re-derives phone vs.
  ≥768px geometry for free on a tier crossing — no second arm added.
- `setup()` now measures `isPhone` (`!matchMedia('(min-width:768px)').matches`) and
  `viewportH` (`document.documentElement.clientHeight` — never `vh`, per §5.2.1) and
  branches: `.wid-left` height/marginTop for the 3-row window (decision 3), and
  `perWord`/`dwellPx` swap to `viewportH` for the runway (decision 6). ≥768px math is
  byte-identical to before (`SCROLL_PER_WORD`/`AGENTS_DWELL_PX` unchanged).
- `attemptSettle` hoisted out of `onUpdate` (pure move) so `onScrollEnd` can call it.
  `useScrollEnd = matchMedia('(pointer: coarse)').matches && 'onscrollend' in window`
  gates a native `scrollend` listener that retriggers `attemptSettle` directly,
  bypassing the velocity re-check that's meaningless on touch (§5.3.1 #4). All three
  settle guards survive: progress-range check (now in `onScrollEnd`), `!st.isActive`
  bail, `onLeave`/`onLeaveBack` → `clearSnapState`. No GSAP `snap`, no scrub lerp, no
  second `ScrollTrigger`.
- Caption clamp/expand: `captionClamped`/`captionExpanded` state, a `measureCaption`
  ref callback (fires per `AnimatePresence` remount, comparing `scrollHeight` vs.
  `clientHeight`), and a scroll-triggered auto-collapse effect (`{ once: true }`). No
  scroll lock — confirmed unnecessary by measurement (see below).
- `WhatIDo.css`: fallback gate narrowed (correction 2); new `@media (max-width: 767px)`
  block un-absolutes `.widviz-panel`/`.wid-caption` into the section's existing flex
  column (no DOM reorder needed — the child order was already stage → panel → caption),
  adds the 3-row mask-fade to `.wid-left`, `-webkit-line-clamp: 5` + the overlay-scrim
  expanded state to the caption, and a base `.wid-caption-more { display: none }` so the
  button can never surface outside the phone block even on a measurement fluke.

**Verification table:**

| row | result | proof |
|---|---|---|
| sm 390 | ✓ section `minHeight:844px` (=`100svh`); `.wid-left` height `133.14px` = `bandH+2·wordH`, `overflow:hidden`, mask-image present; live panel `position:relative`, in flow between stage (77.6–210.7) and caption (706.2–844.4), no overlap; `.wid-mobile-blurbs display:none`; `scrollWidth===clientWidth` (375); scroll-simulated 3000px into the pin — stack transform advanced 0→−172px, caption text changed word; tapped `+ more` — `aria-expanded` true, `data-expanded` set, caption `position:absolute`; dispatched `scroll` — auto-collapsed | computed-style + `getBoundingClientRect`, **1 screenshot** (AGENTS mid-pin — head/band/viz/caption all present and ordered correctly; Agents viz content doesn't fill the full field height and its right-edge label clips — flagged for Stage D, not a Stage B regression, see below) |
| md 768 | ✓ band `360px` (`min(50vw,720px)−24` at 768 = exactly 360, matches decision 1's dimensional check); live panel `position:absolute` (unretuned desktop layout, expected — Stage C's input); `clip-path` applies; no horizontal overflow | computed-style |
| lg 1280 | ✓ **regression, byte-identical to §5.3.8**: panel `x:688 w:577`; band `display:block`; `.wid-stack--base` `willChange:transform`; `clipPath` applies; no `.wid-caption-more` in DOM | computed-style |
| xl 1440 | ✓ **regression** — panel `x:768 w:657` | computed-style |
| 2xl 1920 | ✓ **regression** — panel `x:1008 w:657` | computed-style |
| 4k 2560 | ✓ **regression** — panel `x:1328 w:657` | computed-style |
| coarse pointer (1024×768, CDP) | ✓ §4.3 closed structurally: `pin-spacer` present, section `position:fixed` once pinned, `.wid-stack--base` transform live-advances (`matrix(1,0,0,1,0,-155.438)` after a scroll) with caption text changing word — not the static/collapsed state bug §4.3 described; `farContentVis:"hidden"` still holds | computed-style (CDP touch emulation) |
| reduced motion (1440) | ✓ no `pin-spacer`; `.wid-stack--base` `position:static`; 5 `.widviz-panel--frozen` present; `.wid-mobile-blurbs display:flex`; no `.wid-caption-more`; page not blank | computed-style |
| real iPhone / real Android | **partially run, 2026-08-01** — see §5.3.11 below; found and fixed one real bug, one row still open |

**Known finding, deferred to Stage D on purpose (not a Stage B defect):** at 390px, the
Agents viz (Orchestrator Core) doesn't fill the ~495px field height and its rightmost
node label (`DISCOVERY`) clips at the field's right edge. §5.3.5's per-viz table didn't
cover Agents explicitly (it already has a `≤980px` block, so was assumed done) — Stage D
should re-check it against the field width now that phone geometry is real and
measurable, the same way Stage A's verification corrected the table's Interface and
Systems entries (§5.3.8 corrections 1–2).

**Not touched, confirmed still correct:** `widviz/shell.css`'s `data-far` gate and
`data.css`'s `will-change` reset keep their `(max-width: 980px), (pointer: coarse)`
scope. `WidVisual.jsx`, `widSlice.js`, `whatIDo.js`, `widViz.js` unchanged.

#### 5.3.11 Real-device defect found and fixed — `100svh` collapsing under `position:fixed` (2026-08-01)

The real-device gate (§7.2) — run by Sai on a real iPhone 14 Pro — surfaced exactly the
failure mode §7.1 predicted was unprovable locally: `.what-i-do`'s `min-height: 100svh`
came up short of the true viewport once GSAP pinned the element to `position: fixed`.
Two screenshots showed the symptom: the live viz field rendered short enough that its
own content (VizSystems' status grid, VizData's dot field) visually bled upward into the
word-window rows above it, and the caption — flush after a too-short panel — sat well
above the screen's true bottom edge with a large dead gap beneath it. Chromium/CDP
touch emulation (used throughout this stage's verification) could not have caught this:
it's the WebKit engine specifically, not a pointer/touch/width difference, so §7.1's
own "cannot prove locally" list already named it (`100svh` collapse against the address
bar).

**Fix:** same pattern as §5.2.1 (the progress-frame birth-line bug) — stop trusting a
CSS viewport-unit value under `position:fixed` and override it with the JS-measured
`clientHeight` pixel value already computed for the runway. `setup()`'s phone branch
now sets `section.style.minHeight = ${viewportH}px` (cleared to `''` in `stKiller()` on
teardown/tier-cross); the CSS `min-height: 100svh` rule stays as the pre-JS/no-JS
fallback only. Verified in Chromium: `section.style.minHeight` reads exactly
`"844px"` at an 844px viewport, and `.wid-caption`'s bottom edge now lands at exactly
844 (viewport height) with zero gap beneath it — Chromium already computed this
correctly before the fix, so this doesn't change anything measurable there; it targets
Safari's specific handling, which only the next real-device pass can confirm.

Two more changes landed from the same reports, both requested directly (uneven
spacing, not just the overlap):

- **`.what-i-do .widviz-panel:not(.widviz-panel--frozen)` gained `overflow: hidden`.**
  Defensive, independent of the height fix: Stage D's per-viz mobile-fit work (Interface's
  `scale(1.35)`, and now confirmed Systems/Data too, not just the previously-flagged
  Agents) isn't done yet, so anything still too tall for the box is clipped instead of
  bleeding into neighboring rows.
- **`.what-i-do` gained `gap: 16px`** (phone-scoped) between SectionHead / word window /
  viz field / caption, for even breathing room between the four stacked pieces.

**Still open:** the fix is unverified on the actual failing device — it addresses the
documented risk category and is checkable in Chromium only up to the point where
Chromium already agreed with the CSS value. Re-run §7.2 on the same iPhone before
calling this closed. `scrollend` against real touch momentum and the pin's
`pinType:"fixed"` under real iOS Safari are also still unconfirmed — no report of a
defect there yet, but that is "not tested," not "passed."

#### 5.3.12 Stage C result (2026-08-01) — tablet retune

`npm run lint` → 0, `npm run build` → passes. Verified via live measurement
(`getBoundingClientRect` + computed-style) at 768 / 900 / 980, §7.1a coarse-pointer
(900×700, CDP touch emulation), and reduced-motion (900×700) — plus a regression check
at 1280 / 1440 / 390 to confirm the fix below is scoped correctly.

**Container geometry needed no changes.** §5.3.3 decision 1 already verified the
word/band fit dimensionally at 768 (band 360px, INTERFACE renders ~342px); both
`--band-w` and the word's `8.25vw` font-size scale linearly with viewport width in the
768–980 range (neither hits its clamp ceiling until 1440px+), so that ~5% margin holds
at every width in the tier, not just 768. Live-measured at 768: Backend's node labels,
Data's field, and Systems' grid all render fully inside `.widviz-panel`'s bounds with no
overflow — their geometry is percentage/inline-style driven, so it scales with the panel
naturally. Caption, section-head, and stage gaps were already tablet-correct from Phase
0/2. Net: no edits to `WhatIDo.css` or `WhatIDo.jsx` layout code this stage.

**Confirmed bug, fixed: Interface overflows the tablet viz panel.** `.wifc-stage` is a
fixed `340×260px` box with a base `transform: scale(1.35)` (`interface.css:50`) — real
footprint `459×351px`. The tablet panel (`--viz-left`/`--band-w` split) is only
321–442px wide across the whole range. Live-measured at 768px: the scaled card rendered
from x:376 to x:809 in a 768px-wide viewport — bleeding ~56px left into the word/caption
column and clipping ~40px off the right edge (`html`'s `overflow-x: clip`, tokens.css:87,
hides this without adding scrollWidth, which is why the §5 baseline's
`scrollWidth − clientWidth` probe didn't previously catch it — it has to be checked per
element, not just at the document level). This reproduces whenever Interface is active
or within ±1 of active (visible during the DATA→INTERFACE and INTERFACE→AGENTS
cross-dissolves), i.e. for a real fraction of every tablet scroll-through, not an edge
case. Same root cause as §5.3.8 correction 1's phone finding — just never checked at
tablet width until this stage's audit.

**Fix:** `interface.css` gained one tablet-scoped rule after the existing laptop-height
block:

```css
@media (min-width: 768px) and (max-width: 980px) {
  .wifc-stage { transform: scale(0.8); }
}
```

`0.8` gives a `272×208px` card — fits the narrowest (768px) panel with margin, and stays
flat (no responsive complexity) up through 980px where there's only more room. Verified
contained inside `.widviz-panel` at 768 / 900 / 980. Regression-checked: 1280/1440 still
resolve the pre-existing laptop-height `scale(1.15)` rule (`391×299px`, unaffected — my
rule's `max-width: 980px` excludes them); 390 still shows the original unscaled
`452×351px` footprint bleeding off-screen, confirming Stage D's phone fix (§5.3.8
correction 1) is untouched and still needed — this stage only closed the tablet half of
that finding.

**A second bug found and fixed during this stage's verification, unrelated to the
Interface fix:** resizing the viewport while scrolled mid-pin threw `ReferenceError:
Cannot access 'attemptSettle' before initialization` in `WhatIDo.jsx`. Root cause:
`attemptSettle` was declared `const attemptSettle = () => {...}` *after* the
`ScrollTrigger.create()` call, but `ScrollTrigger.create()` runs a synchronous internal
refresh that fires `onUpdate` immediately — normally harmless, since `self.progress`
is `0` on first mount (the `self.progress > 0` guard skips the `attemptSettle` reference
entirely) — except on the resize-driven rebuild path (`WhatIDo.jsx`'s debounced
`resize` listener calls `stKiller(); setup()` unconditionally), where the user can
already be scrolled mid-pin (`self.progress` strictly between 0 and 1), and `onUpdate`
reads the `attemptSettle` identifier before its `const` initializer has run — a
temporal-dead-zone throw, not a logic bug. This fires on any real resize while scrolled
into the section, including a **device rotation** — directly relevant to this mobile
effort, not a desktop-only edge case. Reproduced by resizing 768→900→980 while scrolled
into the pin; fixed by changing the declaration to a hoisted `function attemptSettle() {
... }` (function declarations are hoisted with their value, not just the binding, so
the identifier is safely callable from the moment `setup()`'s block starts — it still
isn't actually *invoked* until a real timer/event fires later, by which point `st` is
assigned). Re-ran the same 768→900→980 mid-pin resize sequence after the fix: 0 console
errors, Interface stays correctly contained at every step. No other functions in
`setup()` had this ordering problem — `clearSnapState` is already declared before
`ScrollTrigger.create()`, and `onScrollEnd`/`scrollToIndex` are only ever referenced
asynchronously (event listener registration, click handlers), never during the
synchronous refresh.

**Verification table:**

| row | result | proof |
|---|---|---|
| md 768 | ✓ Interface `.wifc-stage` contained (`x:464 w:257`, panel `x:432 w:321`); Backend/Data/Systems already fit; `docOverflow:0` | computed-style |
| 900 | ✓ Interface contained (`x:556 w:272`, panel `x:498 w:387`) | computed-style |
| 980 | ✓ Interface contained (`x:616 w:272`, panel `x:538 w:427`) | computed-style |
| coarse pointer (900×700, CDP) | ✓ pin-spacer present (bug §4.3 still closed at tablet+coarse), panel `w:387`, `docOverflow:0`, 0 console errors | computed-style (CDP touch emulation) |
| reduced motion (900×700) | ✓ `.wid-mobile-blurbs` `display:flex`, 5 frozen panels, `docOverflow:0` | computed-style |
| lg 1280 / xl 1440 (regression) | ✓ **unaffected** — still resolve the pre-existing laptop-height `scale(1.15)` (`391×299`), confirming the new rule's `max-width:980px` excludes desktop | computed-style |
| sm 390 (regression) | ✓ **unaffected** — still the original unscaled `452×351` footprint, confirming phone is untouched (Stage D still owns that fix) | computed-style |
| mid-pin resize (768→900→980) | ✓ 0 console errors after the `attemptSettle` hoisting fix (was: `ReferenceError` on every resize while scrolled into the pin, incl. device rotation) | console + computed-style |
| real iPhone / Android | **not run** — §7.2, required before Phase 3 is called done | — |

Files changed: `src/styles/widviz/interface.css` (tablet scale rule),
`src/components/WhatIDo.jsx` (`attemptSettle` hoisting fix only — no behavior change to
the settle-snap logic itself).

#### 5.3.13 Stage D result (2026-08-01) — per-viz phone fit

Driven by real-device evidence, not the design record: Sai supplied five iPhone 14
Pro screenshots (Systems, Backend, Data, Interface, Agents), all taken through
`npm run dev -- --host` on the same phone as the Stage B/C real-device passes. Every
one showed desktop-sized content clipped by the panel's `overflow: hidden`
(`WhatIDo.css:402`, added in Stage B as a holding measure naming Stage D as the
fix's owner) — not the aspect-distortion §5.3.5 predicted.

**Scope addition: Data.** §5.3.5/§5.3.7 assumed Data needed no phone work (aspect-
tolerant SVG). The screenshot showed otherwise — `.wdat-meta` (the ROWS/stage
readouts) was missing entirely, pushed out of the panel. Root cause: `data.css`'s
`.wdat-field { height: clamp(300px, 50vh, 520px) }` is sized off the *viewport*,
not the panel — same class of bug as §5.2.1 and §5.3.11 (a viewport unit standing
in for a measured box). Data joins Stage D as a fifth fix.

**Two root causes, not one.** Every viz's box was already the panel's own width
(`inset: 0` / `width: 100%`) — none had a native fixed size to scale down like
Interface's `.wifc-stage` (340×260, `scale(1.35)` base). Fixing each meant first
correcting what made the box wrong, then reaching for the scale lever already
proven in Systems (`--wsys-dashboard-scale`) and Interface (tablet `scale(0.8)`,
Stage C):

- **Systems** (`systems.css`) — `.widviz-systems`'s `padding: 4vh 0 20vh` +
  `justify-content: center` is sized for desktop's tall scroll track; on the phone
  rig's short flex slot it centered the (taller) dashboard and clipped both ends.
  Fixed: `justify-content: flex-start`, minimal top padding, phone
  `--wsys-dashboard-scale: 0.7`.
- **Data** (`data.css`) — identical root cause via `vh` instead of centering
  padding. Fixed: `.wdat-field`/`.wdat-layout` become `flex: 1 1 auto; min-height:
  0` on phone, so the field's height is the panel's real remaining space, not a
  viewport fraction — a mathematically exact fit (bottom edge always equals the
  panel's), not a tuned scale value.
- **Agents** (`agents.css`) — `@media (max-width: 980px) { .wagnt-field { height:
  300px } }` predates the phone rig; written when ≤980px only ever meant the
  static frozen fallback, it also matched the live pinned panel and forced a
  squat fixed-height box regardless of the panel's real ~330×420px slot. Merged
  into the frozen-only rule (`.widviz-panel--frozen .wagnt-field`, which already
  existed for this exact case); the live field now uses its original responsive
  inset rule. Added a phone `scale(0.85)` safety margin, since the fixed 100×150
  portrait viewBox (`preserveAspectRatio="none"`) still stretches to whatever
  aspect the recovered field ends up with.
- **Interface** (`interface.css`) — third `.wifc-stage` scale arm, `scale(0.75)`,
  mirroring the tablet `scale(0.8)` fix with extra margin for phone's tighter and
  more variable panel width.
- **Backend** (`backend.css`) — the one case where the box already fit
  (`.wbk-field` measured 330×419 inside a 335×425 panel in Chromium) but looked
  "jam-packed" anyway: node positions are `%`-of-field (shared with desktop data,
  not edited — §5.3.5's standing note), but each node's label group extends by a
  *fixed* px offset. On desktop's 577–657px panel that's a small fraction and
  stays inside the field; on the ~330px phone panel the same offset is large
  enough that CACHE's leftward label and DB's rightward label (`widViz.js` x:30/
  x:70) bleed past the field's own edge. `transform: scale(0.72)` on `.wbk-field`,
  centered in the (unscaled) panel, opens real margin on both sides for that
  overflow to land in rather than run off the panel.

**A regression found and fixed during verification, not anticipated in the design
record:** the first pass scoped every phone rule to the viz's own class (e.g.
`.widviz-systems`, `.wbk-field`), which is shared between the live pinned panel
and the frozen static-fallback panel (`.widviz-panel--frozen`) used by
`.wid-mobile-blurbs`. That leaked every scale/layout change into the frozen list
too — confirmed via computed-style (`.widviz-panel--frozen .wagnt-field` showed
`scale(0.85)` it should never have had). Fixed by prefixing every phone rule with
`.widviz-panel:not(.widviz-panel--frozen)`, the same scoping `WhatIDo.css` already
uses for its own phone-only panel overrides. Re-verified frozen panels are
byte-identical to pre-Stage-D (§7.4's reduced-motion row below).

**A measurement hazard fixed pre-emptively, not found as a live bug:**
`VizData.jsx`, `VizBackend.jsx`, and `VizAgents.jsx` each convert a measured field
size (%-based coordinates → px) using `getBoundingClientRect`, which returns the
*visual* (post-transform) rect. Under the new phone-scoped `transform: scale()`
on their fields, that would silently double-apply the scale — once via the CSS
transform, once via the now-shrunk measurement feeding position math. Switched to
`offsetWidth`/`offsetHeight` (layout box, immune to transforms) — the same value
their `ResizeObserver` `contentRect` already reports, so this only changes the
*first-paint* measurement before the observer's first callback fires.

**Verification table** (390×844, live panel unless noted):

| row | result | proof |
|---|---|---|
| sm 390 | ✓ all 5 vizzes' outermost content rect contained inside `.widviz-panel` (335×425 at this viewport): Systems dashboard `303×521` vs panel `355×668` edges; Backend field `306×606`; Interface stage `311×551`; Agents field `316×623`; Data field+meta bottom `665` vs panel bottom `668` (flex-exact, not scale-tuned); `docOverflow: 0` | computed-style |
| sm 320 (narrow-phone regression) | ✓ same containment holds at the narrowest supported width — panel `285×583`, all 5 vizzes' rects inside it; `docOverflow: 0` | computed-style |
| md 768 / 900 / 980 (regression) | ✓ **unaffected** — `.wifc-stage` still resolves the Stage C tablet `scale(0.8)`; `.wbk-field`/`.wagnt-field` transforms `none`; Systems/Data `justify-content` still `center` (unscoped from the new phone rules) | computed-style |
| lg 1280 (regression) | ✓ **byte-identical** — panel `x:688 w:577 h:900` matches §5.3.8's baseline exactly; `.wifc-stage` still resolves the laptop-height `scale(1.15)`; Backend/Agents transforms `none` | computed-style |
| coarse pointer (1024×768, CDP) | ✓ §4.3 still closed: `position:fixed` once pinned, `.wid-stack--base` transform live-advances between scroll positions with a real touch-emulated scroll | computed-style (CDP touch emulation) |
| reduced motion (390×844) | ✓ frozen panels byte-identical to pre-Stage-D: `.widviz-systems` `justify-content:center`, `--wsys-dashboard-scale:1`; `.wbk-field`/`.wagnt-field` transform `none`; `.wifc-stage` still base `scale(1.35)`; `.wdat-field` still `422px` (`50vh` at 844); `.wid-mobile-blurbs display:flex`; `docOverflow:0` | computed-style |
| mid-pin resize (900→980→1024, CDP touch) | ✓ 0 console errors — the `attemptSettle` TDZ class of bug (§5.3.12) did not recur | console |
| real iPhone / real Android | **not run against this fix** — §7.2, required before Stage D is called done. The five screenshots that drove this stage are the "before" state; Chromium's measured containment has generous margin (Systems 147px vertical slack, Backend/Interface/Agents 15–20% scale headroom) precisely because Chromium already under-predicted the severity seen on the real device once (§5.3 itself), so these values are a starting point, not a guarantee | — |

`npm run lint` → 0. `npm run build` → passes (pre-existing chunk-size warnings only,
unrelated — Spline/physics chunks, untouched).

Files changed: `src/styles/widviz/systems.css`, `backend.css`, `interface.css`,
`agents.css`, `data.css` (phone-scoped rules); `src/components/VizData.jsx`,
`VizBackend.jsx`, `VizAgents.jsx` (`getBoundingClientRect` → `offsetWidth`/
`offsetHeight`, one line each). No changes to `src/data/`, `widSlice.js`,
`WidVisual.jsx`, or `WhatIDo.jsx`.

---

## 6. Standing rules for any agent resuming this

1. **Never propose cutting content, sections, or animations for mobile.** Rejected. §1.
   **One standing, user-approved exception: AIOrb is not rendered on phone
   (`<768px`)**, decided outside phase order via a grill-me interview
   (2026-07-31) — performance + visual real-estate call. Do not "fix" this
   back. See `docs/architecture.md`'s "AIOrb Visibility" for the mechanism.
   Hero/Footer AI-chat CTAs are unaffected and still work on phone. Tablet
   and desktop are unaffected.
2. **Translate, don't delete.** If a desktop interaction can't work as-is on a phone,
   re-choreograph it on the vertical axis. `display: none` is not a mobile strategy.
3. **Every `@media` width is `768px` or `981px`.** Intra-tier refinements excepted.
4. **Never tokenize breakpoints.** CSS vars don't work in `@media`. No build plugins.
5. **Width and pointer are different axes.** Adding a width breakpoint does not fix a
   hover problem, and vice versa. Bug §4.3 is what happens when they're conflated.
6. **No new dependencies for verification.** Real device is the gate.
7. **Don't spawn multi-agent skills for this work.** §3, decision 2.
8. Standard repo rules still apply: JavaScript only, Framer Motion for component
   animation, GSAP only in its two existing sites, animate `transform`/`opacity`
   only, content stays in `src/data/`.

---

## 7. Verification protocol

Split by what each method can actually prove.

### 7.1 Fast loop — MCP Playwright (layout only)

`mcp__playwright__browser_resize` at **390 / 768 / 1280 / 1440 / 1920 / 2560**.

Proves: alignment, overflow, wrapping, type scale, stacking order, spacing.

`browser_resize` alone does **not** change pointer type — the browser still reports
`pointer: fine` at 390px, so **any hover state visible in a resize-only mobile
screenshot is false**. Use the CDP method below for anything pointer-dependent.

**Cannot prove by any local method — these are the only rows that truly need §7.2:**

- iOS Safari's rendering engine
- `100svh` collapse against the address bar
- real touch momentum interacting with Lenis
- thermal / GPU behavior under sustained animation

### 7.1a Coarse-pointer emulation via CDP *(corrects an earlier claim)*

An earlier revision of this doc stated the coarse-pointer layer could not be verified
locally. **That was wrong.** `browser_run_code_unsafe` exposes `page`, and a CDP session
off it flips both `pointer: coarse` and `hover: none` — the same mechanism as DevTools
device mode. Verified working on this project 2026-07-23 (it is what proved fix §4.3).

```js
async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  await page.reload();              // required — re-evaluates gsap.matchMedia
  await page.waitForTimeout(5000);  // preloader floor + idle-mounted sections
  /* then assert on computed styles */
}
```

Still do **not** add Playwright as a dependency (§3.1 rejection stands) — CDP needs none.

Gotchas: reload after enabling touch, or stale ScrollTriggers survive. Below-fold
sections mount on `requestIdleCallback`, so they are briefly absent after reload —
wait and scroll before treating `absent` as a finding.

### 7.1b Screenshots can stall

`browser_take_screenshot` fails with `Timeout 5000ms exceeded — waiting for fonts to
load` when GSAP's ticker keeps the renderer busy; it stalled 3× consecutively during
Phase 0 after one successful capture. Prefer computed-style and
`getBoundingClientRect` assertions — more precise, cheaper, and immune to this. If
screenshots fail, say which rows have pixel proof and which have computed-style proof.

### 7.2 Gate — real device (authoritative)

```bash
npm run dev:clean          # repo rule: kills stale 5173/5174 first
npm run dev -- --host      # then open the LAN URL on a real phone
```

Required once per phase, on a real iPhone **and** a real Android, before that phase
is called done. This is the only source of truth for everything in the "cannot
prove" list above.

### 7.3 `visual-verify` skill deltas (Phase 0.2)

The skill's PowerShell dev-server block was already fixed to bash + `curl`. Still
outstanding:

- breakpoint matrix (currently `SKILL.md:43–50`) is desktop-only → add 390 and 768
- `SKILL.md:54` treats mobile widths as an optional caller-specified extra → make
  them first-class
- add the §7.1 warning that hover states at mobile widths are false
- add the §7.2 real-device gate as a required step
- Step 5 report template (`SKILL.md:90–94`) has desktop-only rows → add mobile rows

### 7.4 Per-phase done checklist

```
phone   (390)         — ✓/✗
tablet  (768)         — ✓/✗
desktop (1280)        — ✓/✗   ← regression check, must be unchanged
desktop (1440)        — ✓/✗   ← regression check, must be unchanged
coarse pointer (§7.1a)— ✓/✗   ← CDP touch emulation, automatable
reduced-motion        — ✓/✗
real iPhone           — ✓/✗   ← iOS Safari engine / svh / momentum only
real Android          — ✓/✗
```

State for each row whether the proof is a **screenshot** or a **computed-style
assertion**. Never let one stand in for the other silently.

Desktop rows are **regression checks**. This effort must not change desktop
rendering; if a desktop row differs from before, that is a bug in the change, not an
improvement.

---

## 8. Resuming

1. Read §1 and §3 — what Sai wants and what is already decided. Do not relitigate.
2. Read §6 — the standing rules.
3. Find the first unchecked box in §5.
4. Re-verify the relevant `file:line` references in §4 (they may have drifted).
5. Follow §7 before claiming anything is done.

Interview that produced this: 2026-07-23, via the `grill-me` skill.
Update this doc — especially the §5 checkboxes and §4 ground truth — as phases land.
