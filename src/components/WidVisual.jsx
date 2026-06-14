import { motion, useMotionValue } from 'framer-motion'
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
  const frozenIdx      = index ?? 0
  const frozenSnap     = frozenIdx / (N - 1)
  // Seeded at the snap point so frozen child vizzes resolve to their final state.
  const frozenProgress = useMotionValue(frozenSnap)

  const revealProps = reduced || frozen
    ? { style: { opacity: 1 } }
    : WID_PANEL_REVEAL

  if (frozen) {
    const entry = WHAT_I_DO[frozenIdx]
    const Viz   = VIZ[entry.id]
    return (
      <div className="widviz-panel widviz-panel--frozen" aria-hidden="true">
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
        {/* No kicker on frozen panels — the parent .wid-mobile-blurb-item
            already provides the // 0N index label via .wid-readout-idx. */}
      </div>
    )
  }

  return (
    <motion.div className="widviz-panel" aria-hidden="true" {...revealProps}>
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
    </motion.div>
  )
}
