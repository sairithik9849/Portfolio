import { motion, AnimatePresence, useMotionValue } from 'framer-motion'
import { WID_PANEL_REVEAL } from '../animations/variants'
import { WHAT_I_DO } from '../data/whatIDo'
import VizSystems   from './widviz/VizSystems'
import VizBackend   from './widviz/VizBackend'
import VizData      from './widviz/VizData'
import VizInterface from './widviz/VizInterface'
import VizAgents    from './widviz/VizAgents'

// Map keyed by whatIDo.js id — mirrors ProjectVisual's VIZ map.
const VIZ = {
  systems:   VizSystems,
  backend:   VizBackend,
  data:      VizData,
  interface: VizInterface,
  agents:    VizAgents,
}

const N = WHAT_I_DO.length

export default function WidVisual({ progress, active = 0, reduced = false, frozen = false, index }) {
  // Always call hooks unconditionally — rules of hooks.
  // frozenProgress is a MotionValue seeded at the snap point for the given index
  // so frozen child vizzes resolve to their final assembled state.
  const frozenIdx  = index ?? 0
  const frozenSnap = frozenIdx / (N - 1)
  const frozenProgress = useMotionValue(frozenSnap)

  const revealProps = reduced || frozen
    ? { style: { opacity: 1 } }
    : WID_PANEL_REVEAL

  if (frozen) {
    const entry = WHAT_I_DO[frozenIdx]
    const Viz   = VIZ[entry.id]
    return (
      <div className="widviz-panel widviz-panel--frozen">
        <BezelHead kicker={`// 03·0${frozenIdx + 1}`} mode={entry.word} />
        <div className="widviz-body">
          <div className="widviz-layer">
            {Viz && (
              <Viz
                progress={frozenProgress}
                index={frozenIdx}
                isActive={false}
                reduced={true}
                frozen={true}
              />
            )}
          </div>
        </div>
        {/* No widviz-foot on frozen panels — blurb lives in the parent
            .wid-mobile-blurb-item to avoid duplication. */}
      </div>
    )
  }

  return (
    <motion.div className="widviz-panel" {...revealProps}>
      <BezelCorners />
      <BezelHead
        kicker={`// 03·0${active + 1}`}
        mode={WHAT_I_DO[active]?.word ?? WHAT_I_DO[0].word}
        active={active}
      />

      {/* Five viz layers, absolutely stacked — cross-dissolved via opacity */}
      <div className="widviz-body">
        {WHAT_I_DO.map((entry, i) => {
          const Viz = VIZ[entry.id]
          return (
            <div key={entry.id} className="widviz-layer">
              {Viz && (
                <Viz
                  progress={progress}
                  index={i}
                  isActive={active === i}
                  reduced={reduced}
                  frozen={false}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer blurb — crossfades on active (~5 transitions total) */}
      <div className="widviz-foot">
        <AnimatePresence mode="wait">
          <motion.p
            key={active}
            className="widviz-blurb"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {WHAT_I_DO[active]?.blurb}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── sub-components ────────────────────────────────────────────────────────────

function BezelCorners() {
  return (
    <>
      <span className="widviz-corner widviz-corner--tl" aria-hidden="true" />
      <span className="widviz-corner widviz-corner--tr" aria-hidden="true" />
      <span className="widviz-corner widviz-corner--bl" aria-hidden="true" />
      <span className="widviz-corner widviz-corner--br" aria-hidden="true" />
    </>
  )
}

// active prop is used as AnimatePresence key to animate the kicker/mode swap.
function BezelHead({ kicker, mode, active }) {
  return (
    <div className="widviz-head">
      <AnimatePresence mode="wait">
        <motion.span
          key={`k-${active}`}
          className="widviz-kicker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {kicker}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.span
          key={`m-${active}`}
          className="widviz-mode"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {mode}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
