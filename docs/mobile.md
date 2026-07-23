# Mobile & Responsive

Owner doc for the **responsive tier system**, the **pointer-capability axis**, and the
in-progress **desktop → mobile translation effort**.

- `docs/design-system.md` owns tokens, spacing, type scale, color roles.
- **This doc owns** which viewport widths exist, what each tier is derived from,
  how hover/touch is handled, and the phase-by-phase progress ledger.

If the two conflict on a breakpoint value, this doc wins.

**Status:** **Phase 0 complete** (2026-07-23). Next up: Phase 1 — Preloader + Hero.
Decisions in §3 are locked (interview, 2026-07-23).

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
| AboutMe | `about-me.css:185` | Coupled to Hero via the sticky-stack |
| WhatIDo | `WhatIDo.css:303` | Hardest translation — see §4.4 |
| Projects | `projects.css:248` | Horizontal accordion → vertical expand |

`hero-about-stack.css` gates the sticky-pin at `(min-width: 981px) and
(prefers-reduced-motion: no-preference)`. Under decision #6 this must extend down to
`768px`, which makes **Hero and AboutMe one coupled unit on tablet**.

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
(`hero/robot.css:140`) — it is the pattern to follow, co-located with its component.
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
| 1 | Preloader + Hero | Hardest. 6 CSS files, ~1039 lines. Spline, StarField, terminal, robot hotspot, manifesto metrics |
| 2 | AboutMe + `hero-about-stack.css` | Coupled to Hero on tablet — extend the sticky-stack to `≥768px` |
| 3 | WhatIDo | The vertical-scrub translation, §4.4. Highest design risk |
| 4 | Journey | Expect **verify-only** — already correct per §4.1 |
| 5 | Projects | Horizontal accordion → vertical expand |
| 6 | Footer / AIOrb / ReturnToTop / ScrollProgressFrame | Smallest surface |

Each phase is done only when §7's checklist passes.

---

## 6. Standing rules for any agent resuming this

1. **Never propose cutting content, sections, or animations for mobile.** Rejected. §1.
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
