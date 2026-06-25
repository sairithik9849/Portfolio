import { motion, useMotionValue, useTransform } from 'framer-motion'
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

export default function WidVisual({ progress, agentsProgress, active = 0, reduced = false, frozen = false, index }) {
  // Always call hooks unconditionally — rules of hooks.
  const frozenIdx      = index ?? 0
  const frozenSnap     = frozenIdx / (N - 1)
  // Seeded at the snap point so frozen child vizzes resolve to their final state.
  const frozenProgress = useMotionValue(frozenSnap)

  // Fade the agents viz out over the trailing dwell, mirroring captionFade in WhatIDo.
  // frozenProgress is the fallback when agentsProgress is not passed (frozen mode) —
  // hooks must be called unconditionally, but exitFade is only consumed in the
  // non-frozen return path below where agentsProgress is always a live MotionValue.
  const exitFade = useTransform(
    agentsProgress ?? frozenProgress,
    [0.5, 1], [1, 0], { clamp: true }
  )

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
          const viz = Viz && (
            <Viz
              progress={progress}
              agentsProgress={agentsProgress}
              index={i}
              isActive={active === i}
              reduced={reduced}
              frozen={false}
            />
          )
          // Agents wrapper gets exitFade so the viz clears alongside the caption.
          // CSS opacity multiplies: wrapper(exitFade) × VizAgents(dissolve) = compound fade.
          if (entry.id === 'agents' && !reduced) {
            return (
              <motion.div key={entry.id} className="widviz-layer" style={{ opacity: exitFade }}>
                {viz}
              </motion.div>
            )
          }
          return (
            <div key={entry.id} className="widviz-layer">
              {viz}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
