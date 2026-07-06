import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import QuoteBlock from '../QuoteBlock'
import MetaList from '../MetaList'
import SkillChips from '../SkillChips'
import { useSceneReveal, SCENE_REVEAL_OFFSET } from '../../../hooks/useSceneReveal'

// A quiet, faint drafting-grid field — the origin scene's featured visual.
// Cheap to draw (a handful of evenly-spaced lines), always static at rest;
// only its overall opacity is scrub-driven, via `bands.visual`. The origin
// crosshair fades in brighter than the grid itself so it reads as the one
// point the whole spine effectively grows from, not just more grid noise.
const GRID_LINES_X = [0, 20, 40, 60, 80, 100]
const GRID_LINES_Y = [0, 25, 50, 75, 100]

/**
 * SceneFoundation — "the quiet origin." Cramped, heavy top whitespace: the
 * chapter that started everything gets the smallest, most humble footprint.
 * A faint blueprint grid sketches itself on as you scroll — verticals then
 * horizontals, each line drawing via strokeDashoffset (the same pathLength
 * technique SceneLeap's route arc uses) — then one crosshair mark anchors
 * the exact origin point the spine effectively grows from.
 */
export default function SceneFoundation({ chapter, reduced }) {
  const rootRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: rootRef, offset: SCENE_REVEAL_OFFSET })
  const bands = useSceneReveal(scrollYProgress)
  // Verticals draw first, horizontals a beat later, the origin mark last —
  // reads as a grid compiling itself rather than one flat fade-in.
  const xDraw = useTransform(bands.visual.opacity, [0, 0.55], [1, 0])
  const yDraw = useTransform(bands.visual.opacity, [0.2, 0.75], [1, 0])
  const originOpacity = useTransform(bands.visual.opacity, [0.6, 1], [0, 0.65])

  return (
    <div className="journey-timeline__content journey-scene journey-scene--foundation" ref={rootRef}>
      <div className="journey-scene__visual journey-scene__visual--foundation" aria-hidden="true">
        <svg viewBox="0 0 100 60" preserveAspectRatio="none">
          {reduced ? (
            <GridLines />
          ) : (
            <GridLines xDashOffset={xDraw} yDashOffset={yDraw} />
          )}
          {reduced ? (
            <OriginMark opacity={0.65} />
          ) : (
            <motion.g style={{ opacity: originOpacity }}>
              <OriginMark opacity={1} />
            </motion.g>
          )}
        </svg>
      </div>

      <QuoteBlock
        quote={chapter.quote}
        deck={chapter.deck}
        bands={bands}
        reduced={reduced}
      />

      <MetaList items={chapter.metadata} band={bands.metadata} reduced={reduced} />
      <SkillChips skills={chapter.skills} band={bands.chips} reduced={reduced} />
    </div>
  )
}

// `xDashOffset`/`yDashOffset` are undefined under reduced motion, in which
// case plain `<line>`s render fully drawn — stroke-dashoffset defaults to 0,
// which is "fully visible" for the dasharray:1 1 / pathLength:1 pairing set
// in `.journey-grid-line` (journey.css).
function GridLines({ xDashOffset, yDashOffset }) {
  const Vert = xDashOffset ? motion.line : 'line'
  const Horiz = yDashOffset ? motion.line : 'line'
  return (
    <>
      {GRID_LINES_X.map((x) => (
        <Vert
          key={`x-${x}`}
          className="journey-grid-line"
          x1={x} y1="0" x2={x} y2="60"
          pathLength="1"
          style={xDashOffset ? { strokeDashoffset: xDashOffset } : undefined}
        />
      ))}
      {GRID_LINES_Y.map((y) => (
        <Horiz
          key={`y-${y}`}
          className="journey-grid-line"
          x1="0" y1={y * 0.6} x2="100" y2={y * 0.6}
          pathLength="1"
          style={yDashOffset ? { strokeDashoffset: yDashOffset } : undefined}
        />
      ))}
    </>
  )
}

function OriginMark({ opacity }) {
  return (
    <g style={{ opacity }}>
      <circle cx="20" cy="15" r="1.5" fill="var(--accent)" />
      <line x1="20" y1="7" x2="20" y2="23" stroke="var(--accent)" strokeWidth="0.4" />
      <line x1="12" y1="15" x2="28" y2="15" stroke="var(--accent)" strokeWidth="0.4" />
    </g>
  )
}
