import { useTransform, motion, useMotionValue, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA    = WID_VIZ.backend
const N       = 5
const LAYER_H = 44  // px per layer row — must match .wbk-layer height in CSS

// ── Sparkline geometry ────────────────────────────────────────────────────────
const SPK_W = 88, SPK_H = 28
const SPARK_PTS = '4,24 14,18 24,22 34,10 44,14 54,8 64,12 74,6 84,10 84,4'

// Layer Y centers: 8px top pad + i*(LAYER_H+4) + LAYER_H/2
const layerY = (i) => 8 + i * (LAYER_H + 4) + LAYER_H / 2

const HIT_Y_SEQ  = [layerY(0), layerY(1), layerY(2), layerY(1), layerY(0)]
const MISS_Y_SEQ = [layerY(0), layerY(1), layerY(2), layerY(3), layerY(2), layerY(1), layerY(0)]

export default function VizBackend({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks called unconditionally ───────────────────────
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter    = useTransform(progress, enterIn,  [0, 1],    { clamp: true })

  // Per-layer fade: each of 4 layers appears over a 0.25 window of enter.
  const layer0op = useTransform(enter, [0,    0.25], [0, 1], { clamp: true })
  const layer1op = useTransform(enter, [0.25, 0.5],  [0, 1], { clamp: true })
  const layer2op = useTransform(enter, [0.5,  0.75], [0, 1], { clamp: true })
  const layer3op = useTransform(enter, [0.75, 1.0],  [0, 1], { clamp: true })
  const layerOpacities = [layer0op, layer1op, layer2op, layer3op]

  // ── wall clock (ambient packet) ───────────────────────────────────────────
  const packetY    = useMotionValue(layerY(0))
  const packetOpMV = useMotionValue(0)
  const isHitRef   = useRef(true)
  const loopRef    = useRef(null)

  useEffect(() => {
    if (!isActive || isFinal) {
      animate(packetOpMV, 0, { duration: 0.3 })
      loopRef.current?.()
      return
    }

    let cancelled = false

    const runLoop = async () => {
      await animate(packetOpMV, 1, { duration: 0.2 })

      while (!cancelled) {
        const isHit = isHitRef.current
        isHitRef.current = !isHitRef.current
        const seq = isHit ? HIT_Y_SEQ : MISS_Y_SEQ
        const dur = isHit ? 0.22      : 0.28

        for (const y of seq) {
          if (cancelled) break
          await animate(packetY, y, { duration: dur, ease: 'easeInOut' })
        }

        if (!cancelled) await new Promise(r => setTimeout(r, isHit ? 600 : 900))
      }
    }

    runLoop()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
    // packetY and packetOpMV are stable MotionValue refs — omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isFinal])

  return (
    <motion.div
      className="widviz-layer widviz-backend"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      {/* ── Layer stack ───────────────────────────────────────────────── */}
      <div className="wbk-layers">
        {DATA.layers.map((label, i) => (
          <motion.div
            key={label}
            className={`wbk-layer wbk-layer--${label.toLowerCase()}`}
            style={{ opacity: isFinal ? 1 : layerOpacities[i] }}
          >
            <span className="wbk-layer-label">{label}</span>
            {label === 'CACHE' && (
              <span className="wbk-layer-tag">REDIS</span>
            )}
          </motion.div>
        ))}

        {/* Animated packet — wall clock only */}
        {!isFinal && (
          <motion.div
            className="wbk-packet"
            style={{ y: packetY, opacity: packetOpMV }}
          />
        )}
      </div>

      {/* ── Sparkline corner ─────────────────────────────────────────── */}
      <motion.div
        className="wbk-spark"
        style={{ opacity: isFinal ? 1 : enter }}
      >
        <div className="wbk-spark-label">{DATA.sparkLabel}</div>
        <svg viewBox={`0 0 ${SPK_W} ${SPK_H}`} className="wbk-spark-svg">
          <polyline
            points={SPARK_PTS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <div className="wbk-spark-meta">
          <span>{DATA.p50}</span>
          <span>{DATA.p99}</span>
        </div>
      </motion.div>

      {/* ── Bottom throughput label ───────────────────────────────────── */}
      <motion.div
        className="wbk-rps"
        style={{ opacity: isFinal ? 1 : layer3op }}
      >
        {DATA.rpsLabel}
      </motion.div>
    </motion.div>
  )
}
