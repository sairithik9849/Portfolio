import { useEffect, useRef } from 'react'
import { motion, useTransform, useMotionValue, animate } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.systems
const N    = 5
const ROWS = DATA.dotRows  // 7
const COLS = DATA.dotCols  // 7
const DOTS = ROWS * COLS   // 49

// Dot positions (col/row) for the heal-pulse target sequence.
const DOT_POSITIONS = Array.from({ length: DOTS }, (_, k) => ({
  col: k % COLS,
  row: Math.floor(k / COLS),
}))

// Dot indices visited by the heal cycle.
const HEAL_TARGETS = DATA.healTargets  // e.g. [16, 32]

export default function VizSystems({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks called unconditionally ───────────────────────
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter    = useTransform(progress, enterIn, [0, 1], { clamp: true })

  // viz-0 whileInView entrance (s=0 means enter=1 at progress=0 — use local).
  const localEnter = useMotionValue(isFinal ? 1 : 0)

  // The enter value to use: index 0 uses localEnter; others use scroll enter.
  // Declare both, select below — hooks must be unconditional.
  const activeEnter = index === 0 && !isFinal ? localEnter : enter

  // Status opacity: fades in over the last 20% of enter.
  const statusOp = useTransform(activeEnter, [0.8, 1], [0, 1], { clamp: true })

  // Pulse ring translated positions (% strings).
  const pulseXMV = useMotionValue(50)
  const pulseYMV = useMotionValue(50)
  const pulseX   = useTransform(pulseXMV, v => `${v}%`)
  const pulseY   = useTransform(pulseYMV, v => `${v}%`)
  const pulseOpMV = useMotionValue(0)

  // ── viz-0 whileInView assembly ────────────────────────────────────────────
  const gridRef      = useRef(null)
  const hasPlayedRef = useRef(false)

  useEffect(() => {
    if (index !== 0 || isFinal) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayedRef.current) {
          hasPlayedRef.current = true
          animate(localEnter, 1, { duration: 1.1, ease: [0.22, 1, 0.36, 1] })
        }
      },
      { threshold: 0.2 },
    )
    if (gridRef.current) obs.observe(gridRef.current)
    return () => obs.disconnect()
    // localEnter is a stable MotionValue ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isFinal])

  // ── wall clock (heal pulse) ───────────────────────────────────────────────
  const loopRef = useRef(null)

  useEffect(() => {
    if (!isActive || isFinal) {
      animate(pulseOpMV, 0, { duration: 0.3 })
      loopRef.current?.()
      return
    }

    let cancelled = false

    const runLoop = async () => {
      await animate(pulseOpMV, 1, { duration: 0.2 })

      while (!cancelled) {
        for (const dotIdx of HEAL_TARGETS) {
          if (cancelled) break
          const dot  = DOT_POSITIONS[dotIdx]
          const xPct = ((dot.col + 0.5) / COLS) * 100
          const yPct = ((dot.row + 0.5) / ROWS) * 100

          await Promise.all([
            animate(pulseXMV, xPct, { duration: 0.4, ease: 'easeInOut' }),
            animate(pulseYMV, yPct, { duration: 0.4, ease: 'easeInOut' }),
          ])

          if (!cancelled) await new Promise(r => setTimeout(r, 1400))
        }
      }
    }

    runLoop()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
    // pulseOpMV, pulseXMV, pulseYMV are stable MotionValue refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isFinal])

  return (
    <motion.div
      className="widviz-layer widviz-systems"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      {/* Dot grid — one MotionValue subscriber drives CSS --enter;
          49 dots compute per-dot opacity in CSS via --i. */}
      <div style={{ position: 'relative', flex: 1 }} ref={gridRef}>
        <motion.div
          className="wsys-grid"
          style={{ '--enter': activeEnter }}
        >
          {Array.from({ length: DOTS }, (_, k) => (
            <span
              key={k}
              className="wsys-dot"
              style={{ '--i': k / DOTS }}
            />
          ))}
        </motion.div>

        {/* Heal-pulse ring — wall clock; pre-computed transform to avoid
            conditional useTransform (hooks must run unconditionally). */}
        {!isFinal && (
          <motion.div
            className="wsys-pulse"
            style={{ opacity: pulseOpMV, left: pulseX, top: pulseY }}
          />
        )}
      </div>

      <div className="wsys-status">
        <span className="wsys-status-label">{DATA.statusLabel}</span>
        <motion.span
          className="wsys-status-val"
          style={{ opacity: isFinal ? 1 : statusOp }}
        >
          {DATA.aliveLabel}
        </motion.span>
      </div>
    </motion.div>
  )
}
