import { useTransform, motion } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.interface
const N    = 5
// 6 zones staggered over 0→0.9 of enter, each 0.12 wide.
// start = (i/6)*0.9, end = start + 0.12
const Z = DATA.zones.length  // 6

export default function VizInterface({ progress, index, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks unconditional ────────────────────────────────
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter    = useTransform(progress, enterIn, [0, 1], { clamp: true })

  // Per-zone opacities — declared individually (no hooks inside .map).
  const s = (i) => (i / Z) * 0.9
  const zone0op = useTransform(enter, [s(0), s(0) + 0.12], [0, 1], { clamp: true })
  const zone1op = useTransform(enter, [s(1), s(1) + 0.12], [0, 1], { clamp: true })
  const zone2op = useTransform(enter, [s(2), s(2) + 0.12], [0, 1], { clamp: true })
  const zone3op = useTransform(enter, [s(3), s(3) + 0.12], [0, 1], { clamp: true })
  const zone4op = useTransform(enter, [s(4), s(4) + 0.12], [0, 1], { clamp: true })
  const zone5op = useTransform(enter, [s(5), s(5) + 0.12], [0, 1], { clamp: true })
  const zoneOpacities = [zone0op, zone1op, zone2op, zone3op, zone4op, zone5op]

  return (
    <motion.div
      className="widviz-layer widviz-interface"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      <div className="wifc-wireframe">
        {/* Header */}
        <motion.div
          className="wifc-zone wifc-zone--header"
          style={{ opacity: isFinal ? 1 : zoneOpacities[0] }}
        >
          <span className="wifc-zone-label">{DATA.zones[0].label}</span>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          className="wifc-zone wifc-zone--sidebar"
          style={{ opacity: isFinal ? 1 : zoneOpacities[1] }}
        >
          <span className="wifc-zone-label">{DATA.zones[1].label}</span>
        </motion.div>

        {/* Main */}
        <motion.div
          className="wifc-zone wifc-zone--main"
          style={{ opacity: isFinal ? 1 : zoneOpacities[2] }}
        >
          <span className="wifc-zone-label">{DATA.zones[2].label}</span>
        </motion.div>

        {/* Card row */}
        <div className="wifc-zone wifc-zone--cards">
          {[zone3op, zone4op, zone5op].map((op, j) => (
            <motion.div
              key={j}
              className="wifc-card"
              style={{ opacity: isFinal ? 1 : op }}
            />
          ))}
        </div>
      </div>

      <div className="wifc-footer">
        <motion.span
          className="wifc-stack-label"
          style={{ opacity: isFinal ? 1 : zoneOpacities[2] }}
        >
          {DATA.stackLabel}
        </motion.span>
        <motion.span
          className="wifc-fps-label"
          style={{ opacity: isFinal ? 1 : zoneOpacities[Z - 1] }}
        >
          {DATA.fpsLabel}
        </motion.span>
      </div>
    </motion.div>
  )
}
