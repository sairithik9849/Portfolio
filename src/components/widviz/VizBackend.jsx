import { useEffect, useRef } from 'react'
import { motion, useTransform, useMotionValue, animate } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'
import { WID_VIZ } from '../../data/widViz'

const DATA = WID_VIZ.backend
const N    = 5

// ── Layout constants (% of the 0–100 SVG / HTML field) ───────────────────────
// Pipeline is a vertically-centered band (y 24–63) with empty space above/below.
// Panel's top-fade covers ~20%, bottom-fade starts at 94% — pipeline clears both.
const SPINE_X = 26   // x% of the spine line and token travel

const STATIONS = [
  { id: 'edge',  y: 24, rank: 0 },
  { id: 'api',   y: 37, rank: 1 },
  { id: 'cache', y: 50, rank: 2 },
  { id: 'db',    y: 63, rank: 3 },
]

// Stagger bands: each station assembles 0.22 after the previous.
// rank 0 → --i 0, rank 3 → --i 0.66; all fully visible by enter = 1.
const STATION_I = rank => rank * 0.22

// Waveform: mostly flat, one spike near the right edge (MISS events).
// Drawn in the same 0–100 SVG coordinate space.
const WAVE_POINTS = '26,73 32,73 38,73 42,72 48,74 52,73 58,73 64,72 70,73'
const WAVE_CX     = '26;32;38;42;48;52;58;64;70'
const WAVE_CY     = '73;73;73;72;74;73;73;72;73'
// Readout cluster top position (% — below the pipeline, above the caption)
const READOUT_TOP = '78%'

// Hit : miss cycling — 4 hits then 1 miss, repeating.
const HIT_CYCLE = 4

export default function VizBackend({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)

  // ── Scroll clock — all hooks called unconditionally ──────────────────────
  const dissolve  = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale     = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter     = useTransform(progress, enterIn,   [0, 1],     { clamp: true })
  // Readout cluster fades in after the pipeline is fully assembled — mirrors
  // VizSystems statusOp / VizData costOp.
  const readoutOp = useTransform(enter, [0.8, 1], [0, 1], { clamp: true })

  // Token position (top %) and opacity — JS-driven MotionValues, same pattern
  // as VizSystems heal-pulse (pulseXMV/pulseYMV).
  const tokenTopMV = useMotionValue(STATIONS[0].y)
  const tokenOpMV  = useMotionValue(0)
  const tokenTop   = useTransform(tokenTopMV, v => `${v}%`)

  // DOM refs for classList flash (same pattern as wsys-node--healing / railRefs)
  const stationRefs = useRef([null, null, null, null])
  const statusRef   = useRef(null)
  const waveRef     = useRef(null)
  const counterEl   = useRef(null)
  const loopRef     = useRef(null)
  const cycleRef    = useRef(0)  // tracks position in HIT_CYCLE

  // ── Wall clock #1 — request lifecycle ────────────────────────────────────
  // Each cycle: token descends EDGE→API→CACHE; on HIT it returns; on MISS it
  // continues to DB, blips the latency line, then rises back through CACHE.
  // Cancel-flag pattern + loopRef cleanup mirrors VizSystems heal-pulse exactly.
  useEffect(() => {
    if (!isActive || isFinal) {
      animate(tokenOpMV, 0, { duration: 0.3 })
      loopRef.current?.()
      return
    }

    let cancelled = false

    const setStatus = (text, visible) => {
      if (statusRef.current) {
        statusRef.current.textContent = text
        statusRef.current.style.opacity = visible ? '1' : '0'
      }
    }

    const flashStation = (idx, className, durationMs) => {
      stationRefs.current[idx]?.classList.add(className)
      return new Promise(r => setTimeout(() => {
        stationRefs.current[idx]?.classList.remove(className)
        r()
      }, durationMs))
    }

    const runLoop = async () => {
      await animate(tokenOpMV, 1, { duration: 0.2 })

      while (!cancelled) {
        const isHit = (cycleRef.current % (HIT_CYCLE + 1)) < HIT_CYCLE
        cycleRef.current++

        // Reset token to EDGE
        tokenTopMV.set(STATIONS[0].y)
        setStatus('', false)

        // ── Descend to CACHE ─────────────────────────────────────────────
        for (let i = 0; i <= 2; i++) {
          if (cancelled) break
          await animate(tokenTopMV, STATIONS[i].y, { duration: 0.18, ease: 'easeInOut' })
        }
        if (cancelled) break

        if (isHit) {
          // ── HIT: flash CACHE, show HIT · 4ms, ascend ─────────────────
          setStatus(`${DATA.hitLabel} · ${DATA.hitMs}`, true)
          await flashStation(2, 'wbk-station--hit', 500)
          setStatus('', false)
          if (cancelled) break

          // Ascend CACHE → EDGE
          for (let i = 1; i >= 0; i--) {
            if (cancelled) break
            await animate(tokenTopMV, STATIONS[i].y, { duration: 0.18, ease: 'easeInOut' })
          }
        } else {
          // ── MISS: brief CACHE miss-flash, descend to DB ───────────────
          setStatus(DATA.missLabel, true)
          stationRefs.current[2]?.classList.add('wbk-station--miss')
          await new Promise(r => setTimeout(r, 220))
          stationRefs.current[2]?.classList.remove('wbk-station--miss')
          if (cancelled) break

          // Descend CACHE → DB
          await animate(tokenTopMV, STATIONS[3].y, { duration: 0.28, ease: 'easeInOut' })
          if (cancelled) break

          // Flash DB + show MISS · 28ms + blip the latency line
          setStatus(`${DATA.missLabel} · ${DATA.missMs}`, true)
          waveRef.current?.classList.add('wbk-wave--spike')
          await flashStation(3, 'wbk-station--hit', 700)
          waveRef.current?.classList.remove('wbk-wave--spike')
          if (cancelled) break

          // Ascend DB → CACHE (re-flash CACHE = cache fill) → EDGE
          await animate(tokenTopMV, STATIONS[2].y, { duration: 0.28, ease: 'easeInOut' })
          if (cancelled) break
          stationRefs.current[2]?.classList.add('wbk-station--hit')
          await new Promise(r => setTimeout(r, 300))
          stationRefs.current[2]?.classList.remove('wbk-station--hit')
          setStatus('', false)
          if (cancelled) break

          await animate(tokenTopMV, STATIONS[1].y, { duration: 0.18, ease: 'easeInOut' })
          if (cancelled) break
          await animate(tokenTopMV, STATIONS[0].y, { duration: 0.18, ease: 'easeInOut' })
        }

        if (!cancelled) {
          await animate(tokenOpMV, 0, { duration: 0.15 })
          await new Promise(r => setTimeout(r, isHit ? 500 : 900))
          await animate(tokenOpMV, 1, { duration: 0.15 })
        }
      }
    }

    runLoop()
    loopRef.current = () => { cancelled = true }
    return () => { cancelled = true }
    // tokenTopMV and tokenOpMV are stable MotionValue refs — intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isFinal])

  // ── Wall clock #2 — REQ counter ──────────────────────────────────────────
  // Verbatim from VizData — reuse identical pattern.
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
      {/* Single --enter subscriber — all CSS assembly inherits from here.
          Pattern identical to VizSystems (.wsys-field) and VizData (.wdat-field). */}
      <motion.div
        className="wbk-field"
        style={{ '--enter': isFinal ? 1 : enter }}
      >

        {/* ── SVG layer: spine + ticks + waveform ───────────────────────────
            preserveAspectRatio="none" stretches the 0 0 100 100 viewBox to fill
            the full-height panel — matches VizSystems / VizData convention.
            Only lines live here; nodes and token are HTML (crisp text/shapes). */}
        <svg
          className="wbk-mesh-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Vertical spine connecting EDGE to DB */}
          <path
            className="wbk-spine"
            pathLength="1"
            d={`M${SPINE_X},${STATIONS[0].y} L${SPINE_X},${STATIONS[3].y}`}
            style={{ '--i': 0 }}
          />

          {/* Short horizontal tick per station — draws with its node */}
          {STATIONS.map(s => (
            <path
              key={s.id}
              className="wbk-tick"
              pathLength="1"
              d={`M${SPINE_X},${s.y} L${SPINE_X + 5},${s.y}`}
              style={{ '--i': STATION_I(s.rank) }}
            />
          ))}

          {/* Latency waveform — mostly flat, one pre-authored spike at mid-right.
              Draws last (--i 0.85); SMIL sample dot travels its points.
              JS adds .wbk-wave--spike on MISS cycles. */}
          <polyline
            ref={waveRef}
            className="wbk-wave"
            pathLength="1"
            points={WAVE_POINTS}
            style={{ '--i': 0.85 }}
          />

          {/* Traveling sample dot — matches .wsys-pulse-dot / .wdat-pulse-dot */}
          <circle className="wbk-wave-sample" r="1.1">
            <animate attributeName="cx" values={WAVE_CX}
              dur="3s" repeatCount="indefinite" />
            <animate attributeName="cy" values={WAVE_CY}
              dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity"
              values="0;1;1;1;1;0"
              keyTimes="0;0.08;0.3;0.7;0.92;1"
              dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* ── Station nodes (HTML — crisp over non-uniform SVG) ─────────────
            Positioned at left:SPINE_X%, top:{y}% to register with SVG spine.
            transform:translate(0,-50%) centers each node on its y.
            Opacity driven by --enter + --i CSS calc (assembles top→bottom). */}
        {STATIONS.map((s, i) => (
          <div
            key={s.id}
            ref={el => { stationRefs.current[i] = el }}
            className={`wbk-station wbk-station--${s.id}`}
            style={{
              left: `${SPINE_X}%`,
              top:  `${s.y}%`,
              '--i': STATION_I(s.rank),
            }}
          >
            <span className="wbk-station-dot" />
            <span className="wbk-station-label">{DATA.stations[i].label}</span>
            <span className="wbk-station-tag">{DATA.stations[i].tag}</span>
          </div>
        ))}

        {/* ── Request token — lime ◆ diamond ────────────────────────────────
            Hidden in frozen/reduced mode; wall clock animates top% via
            tokenTopMV → tokenTop (same pattern as VizSystems heal-pulse). */}
        {!isFinal && (
          <motion.div
            className="wbk-token"
            style={{ top: tokenTop, left: `${SPINE_X}%`, opacity: tokenOpMV }}
          />
        )}

        {/* ── HIT / MISS status tag — appears near CACHE station ────────────
            JS sets textContent and opacity imperatively (no React state needed). */}
        <span
          ref={statusRef}
          className="wbk-status"
          style={{
            top:     `${STATIONS[2].y}%`,
            left:    `${SPINE_X + 12}%`,
            opacity: 0,
          }}
        >
          {isFinal ? `${DATA.hitLabel} · ${DATA.hitMs}` : ''}
        </span>

        {/* ── Centered readout cluster (below pipeline, above caption) ───────
            Numbers are centered in the field, not pinned to a corner.
            readoutOp fades them in after the pipeline assembles. */}
        <motion.div
          className="wbk-readout"
          style={{ top: READOUT_TOP, opacity: isFinal ? 1 : readoutOp }}
        >
          <span className="wbk-readout-lat-label">{DATA.latencyLabel}</span>
          <span className="wbk-readout-lat">
            <span className="p50">{DATA.p50}</span>
            {'   '}
            <span className="p99">{DATA.p99}</span>
          </span>
          <span className="wbk-readout-req">
            {DATA.reqLabel}{' '}
            <b ref={counterEl}>{isFinal ? '1,130,574' : '0'}</b>
          </span>
          <span className="wbk-readout-rps">{DATA.rpsLabel}</span>
        </motion.div>

      </motion.div>
    </motion.div>
  )
}
