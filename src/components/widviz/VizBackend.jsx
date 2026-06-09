import { useTransform, motion, useMotionValue, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.backend
const N    = 5

// ── Layout constants (% of 0–100 SVG field) ──────────────────────────────────
const RAILS = [
  { id: 'edge',  y: 30, rank: 0 },
  { id: 'api',   y: 39, rank: 1 },
  { id: 'cache', y: 48, rank: 2 },
  { id: 'db',    y: 57, rank: 3 },
]
const RAIL_X0 = 14, RAIL_X1 = 86
const LANE_HIT  = 40
const LANE_MISS = 64
const WAVE_D  = 'M30,72 L35,70 L40,71 L45,68 L50,73 L55,70 L60,71 L65,70 L68,69'
const WAVE_CX = '30;35;40;45;50;55;60;65;68'
const WAVE_CY = '72;70;71;68;73;70;71;70;69'

export default function VizBackend({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── scroll clock — all hooks called unconditionally ───────────────────────
  const dissolve  = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale     = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter     = useTransform(progress, enterIn,   [0, 1],     { clamp: true })
  const readoutOp = useTransform(enter, [0.8, 1], [0, 1],         { clamp: true })

  // Probe position/opacity — MotionValues + derived CSS-string transforms
  const probeXMV  = useMotionValue(LANE_HIT)
  const probeYMV  = useMotionValue(RAILS[0].y)
  const probeOpMV = useMotionValue(0)
  const probeLeft = useTransform(probeXMV, v => `${v}%`)
  const probeTop  = useTransform(probeYMV, v => `${v}%`)

  // Rail DOM refs for classList flash on hit/miss
  const railRefs  = useRef([null, null, null, null])
  const counterEl = useRef(null)
  const loopRef   = useRef(null)
  const isHitRef  = useRef(true)

  // ── Wall clock #1 — focal probe ───────────────────────────────────────────
  useEffect(() => {
    if (!isActive || isFinal) {
      animate(probeOpMV, 0, { duration: 0.3 })
      loopRef.current?.()
      return
    }

    let cancelled = false

    const runLoop = async () => {
      await animate(probeOpMV, 1, { duration: 0.2 })

      while (!cancelled) {
        const isHit = isHitRef.current
        isHitRef.current = !isHitRef.current
        const dur = isHit ? 0.2 : 0.28
        const seq = isHit
          ? [RAILS[0], RAILS[1], RAILS[2]]
          : [RAILS[0], RAILS[1], RAILS[2], RAILS[3]]
        const flashIdx = isHit ? 2 : 3

        // Snap probe to correct lane, then descend
        await animate(probeXMV, isHit ? LANE_HIT : LANE_MISS, { duration: 0 })
        for (const rail of seq) {
          if (cancelled) break
          await animate(probeYMV, rail.y, { duration: dur, ease: 'easeInOut' })
        }

        if (!cancelled) {
          railRefs.current[flashIdx]?.classList.add('wbk-rail--hit')
          await new Promise(r => setTimeout(r, isHit ? 600 : 900))
          railRefs.current[flashIdx]?.classList.remove('wbk-rail--hit')
        }

        // Ascend back to EDGE
        for (const rail of [...seq].reverse().slice(1)) {
          if (cancelled) break
          await animate(probeYMV, rail.y, { duration: dur, ease: 'easeInOut' })
        }
      }
    }

    runLoop()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
    // probeXMV, probeYMV, probeOpMV are stable MotionValue refs — omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isFinal])

  // ── Wall clock #2 — req counter ───────────────────────────────────────────
  useEffect(() => {
    if (!isActive || isFinal) return
    let cancelled = false
    let val = 0

    const tick = () => {
      if (cancelled) return
      val = (val + Math.floor(Math.random() * 2400 + 800)) % 9_999_999
      if (counterEl.current) counterEl.current.textContent = val.toLocaleString()
      setTimeout(tick, 180 + Math.random() * 120)
    }
    tick()
    return () => { cancelled = true }
  }, [isActive, isFinal])

  return (
    <motion.div
      className="widviz-layer widviz-backend"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      <motion.div
        className="wbk-field"
        style={{ '--enter': isFinal ? 1 : enter }}
      >
        {/* ── SVG field: rails + traffic + waveform ──────────────────────── */}
        <svg
          className="wbk-mesh-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {RAILS.map((rail, i) => (
            <path
              key={rail.id}
              ref={el => { railRefs.current[i] = el }}
              className={`wbk-rail${rail.id === 'cache' ? ' wbk-rail--cache' : ''}`}
              pathLength="1"
              d={`M${RAIL_X0},${rail.y} L${RAIL_X1},${rail.y}`}
              style={{ '--i': rail.rank * 0.25 }}
            />
          ))}

          {RAILS.map(rail =>
            [0, 1].map(k => (
              <circle
                key={`${rail.id}-${k}`}
                className={`wbk-flow-dot${rail.id === 'cache' ? ' wbk-flow-dot--cache' : ''}`}
                r="0.9"
                cy={rail.y}
              >
                <animate
                  attributeName="cx"
                  from={RAIL_X0} to={RAIL_X1}
                  dur="2.8s"
                  repeatCount="indefinite"
                  begin={`${(rail.rank * 0.35 + k * 1.4).toFixed(2)}s`}
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.08;0.92;1"
                  dur="2.8s"
                  repeatCount="indefinite"
                  begin={`${(rail.rank * 0.35 + k * 1.4).toFixed(2)}s`}
                />
              </circle>
            ))
          )}

          <path
            className="wbk-wave"
            pathLength="1"
            d={WAVE_D}
            style={{ '--i': 0.9 }}
          />

          <circle className="wbk-wave-sample" r="1.2">
            <animate attributeName="cx" values={WAVE_CX} dur="3s" repeatCount="indefinite" />
            <animate attributeName="cy" values={WAVE_CY} dur="3s" repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0;1;1;1;1;0"
              keyTimes="0;0.08;0.3;0.7;0.92;1"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* ── Rail labels ─────────────────────────────────────────────────── */}
        {RAILS.map((rail, i) => (
          <span
            key={rail.id}
            className={`wbk-rail-label${rail.id === 'cache' ? ' wbk-rail-label--cache' : ''}`}
            style={{ top: `${rail.y}%`, left: '8px', '--i': rail.rank * 0.25 }}
          >
            {DATA.layers[i]}
            {rail.id === 'cache' && (
              <span className="wbk-rail-tag">{DATA.cacheTag}</span>
            )}
          </span>
        ))}

        {/* ── Focal probe ─────────────────────────────────────────────────── */}
        {!isFinal && (
          <motion.div
            className="wbk-probe"
            style={{ opacity: probeOpMV, left: probeLeft, top: probeTop }}
          />
        )}

        {/* ── Waveform latency meta ────────────────────────────────────────── */}
        <motion.div
          className="wbk-pmeta"
          style={{ opacity: isFinal ? 1 : readoutOp, top: '62%' }}
        >
          <span>{DATA.p50}</span>&nbsp;&nbsp;<span>{DATA.p99}</span>
        </motion.div>

        {/* ── Corner readouts ──────────────────────────────────────────────── */}
        <motion.div
          className="wbk-counter"
          style={{ opacity: isFinal ? 1 : readoutOp }}
        >
          {DATA.reqLabel} <b ref={counterEl}>{isFinal ? '9,418,002' : '0'}</b>
        </motion.div>
        <motion.div
          className="wbk-rps"
          style={{ opacity: isFinal ? 1 : readoutOp }}
        >
          {DATA.rpsLabel}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
