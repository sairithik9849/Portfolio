import { useEffect, useRef } from 'react'
import { motion, useTransform } from 'framer-motion'
import { widSlice } from '../../utils/widSlice'

const N = 5

// ── Arc helper for deploy donut ───────────────────────────────────────────────
const arc = (cx, cy, r, a0, a1) => {
  const r0 = a0 * Math.PI / 180
  const r1 = a1 * Math.PI / 180
  const x0 = cx + r * Math.cos(r0), y0 = cy + r * Math.sin(r0)
  const x1 = cx + r * Math.cos(r1), y1 = cy + r * Math.sin(r1)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`
}

export default function VizSystems({ progress, index, isActive, reduced, frozen }) {
  const isFinal = reduced || frozen

  const { dissolveIn, enterIn } = widSlice(index, N)
  const dissolve = useTransform(progress, dissolveIn, [0, 1, 0], { clamp: true })
  const scale    = useTransform(dissolve, [0, 1], [0.985, 1])
  const enter    = useTransform(progress, enterIn,  [0, 1],    { clamp: true })

  // ── Cell refs ──────────────────────────────────────────────────────────────
  const dashRef = useRef(null)

  // CPU
  const cpuCellRef  = useRef(null)
  const cpuBadgeRef = useRef(null)
  const cpuValRef   = useRef(null)
  const coreRefs    = useRef([])

  // Memory
  const memCellRef  = useRef(null)
  const memBadgeRef = useRef(null)
  const memFillRef  = useRef(null)
  const memValRef   = useRef(null)

  // Queue
  const qCellRef  = useRef(null)
  const qBadgeRef = useRef(null)
  const qBarRefs  = useRef([])
  const qValRef   = useRef(null)

  // Error rate
  const errCellRef  = useRef(null)
  const errBadgeRef = useRef(null)
  const errPolyRef  = useRef(null)
  const errValRef   = useRef(null)

  // Uptime
  const upCellRef    = useRef(null)
  const upBadgeRef   = useRef(null)
  const upDisplayRef = useRef(null)

  // Deploy
  const depCellRef  = useRef(null)
  const depBadgeRef = useRef(null)
  const depArcV1Ref = useRef(null)
  const depArcV2Ref = useRef(null)
  const depValRef   = useRef(null)

  // Status + log
  const statusRef = useRef(null)
  const logRef    = useRef(null)

  // isActiveRef so the RAF closure always reads the latest value without
  // being in its dependency array (would reset accumulated sim state).
  const isActiveRef = useRef(isActive)
  useEffect(() => { isActiveRef.current = isActive }, [isActive])

  // ── Main animation RAF ────────────────────────────────────────────────────
  useEffect(() => {
    if (isFinal) return

    let cancelled = false

    // ── CPU state ──
    const CPU_TARGETS   = [52, 40, 65, 35]
    const cpuCurrents   = [52, 40, 65, 35]

    // ── Memory state ──
    let memFill    = 44
    let memGC      = false

    // ── Queue state ──
    const Q_BARS   = 6
    let qFills     = new Array(Q_BARS).fill(0)
    let qFillIdx   = 0
    let qTimer     = 0

    // ── Error EKG state ──
    const EKG_PTS  = 22
    let ekgBuf     = new Array(EKG_PTS).fill(2)
    let ekgTimer   = 0

    // ── Uptime state ──
    let upSec      = 8 * 3600 + 23 * 60 + 14
    let upTimer    = 0

    // ── Deploy state ──
    let depV2      = 18    // % of traffic on v2 canary
    let depTimer   = 0

    // ── Incident state machine ──
    let incTimer    = 0
    let incDuration = 9000 + Math.random() * 4000
    let incActive   = false
    let incTarget   = -1

    const INC_CELLS = [
      { cell: cpuCellRef,  badge: cpuBadgeRef,  label: 'CPU'      },
      { cell: memCellRef,  badge: memBadgeRef,  label: 'MEMORY'   },
      { cell: qCellRef,    badge: qBadgeRef,    label: 'QUEUE'    },
      { cell: errCellRef,  badge: errBadgeRef,  label: 'ERR RATE' },
      { cell: depCellRef,  badge: depBadgeRef,  label: 'DEPLOY'   },
    ]

    // ── Helpers ──────────────────────────────────────────────────────────────
    const log = (msg, alert = false) => {
      const el = logRef.current
      if (!el) return
      const row = document.createElement('div')
      row.className = 'wsys-log-entry' + (alert ? ' wsys-log-entry--alert' : '')
      row.textContent = msg
      el.appendChild(row)
      while (el.children.length > 4) el.removeChild(el.firstChild)
    }

    const ekgPoints = () =>
      ekgBuf.map((v, i) =>
        `${((i / (EKG_PTS - 1)) * 100).toFixed(1)},${(40 - Math.min(v, 35) / 35 * 38).toFixed(1)}`
      ).join(' ')

    const setBadge = (ref, text, ok) => {
      if (!ref.current) return
      ref.current.textContent = text
      ref.current.className   = ok ? 'wsys-badge wsys-badge--ok' : 'wsys-badge wsys-badge--incident'
    }

    const triggerIncident = () => {
      incTarget = Math.floor(Math.random() * INC_CELLS.length)
      const c   = INC_CELLS[incTarget]
      incActive = true
      c.cell.current?.classList.add('wsys-cell--incident')
      setBadge(c.badge, 'ALERT', false)
      if (statusRef.current) statusRef.current.textContent = 'INCIDENT DETECTED'
      log(`✗ ${c.label} anomaly — paging on-call`, true)
    }

    const resolveIncident = () => {
      const c   = INC_CELLS[incTarget]
      c.cell.current?.classList.remove('wsys-cell--incident')
      setBadge(c.badge, 'OK', true)
      if (statusRef.current) statusRef.current.textContent = 'ALL SYSTEMS NOMINAL'
      log(`✓ ${c.label} recovered — auto-heal complete`)
      incActive   = false
      incTarget   = -1
      incDuration = 9000 + Math.random() * 5000
    }

    // ── Initial log ──
    log('✓ boot sequence complete')
    log('✓ 50 workstations registered')
    log('✓ compliance checks passed')

    // ── CPU target update (runs off dt, not setInterval) ──
    let cpuTargetTimer = 0
    const refreshCPUTargets = () => {
      for (let i = 0; i < 4; i++) CPU_TARGETS[i] = 18 + Math.random() * 68
    }

    let lastT = performance.now()

    const tick = t => {
      if (cancelled) return
      // Idle when the panel isn't the active snap — reset lastT to avoid a
      // large dt spike on resume, then reschedule without doing any DOM work.
      if (!isActiveRef.current) {
        lastT = t
        requestAnimationFrame(tick)
        return
      }
      const dt = Math.min(t - lastT, 50)
      lastT = t

      // ── CPU ──
      cpuTargetTimer += dt
      if (cpuTargetTimer > 2200) { cpuTargetTimer = 0; refreshCPUTargets() }
      let cpuSum = 0
      for (let i = 0; i < 4; i++) {
        cpuCurrents[i] += (CPU_TARGETS[i] - cpuCurrents[i]) * 0.025
        cpuSum += cpuCurrents[i]
        if (coreRefs.current[i]) coreRefs.current[i].style.height = `${cpuCurrents[i].toFixed(1)}%`
      }
      if (cpuValRef.current) cpuValRef.current.textContent = `${(cpuSum / 4).toFixed(0)}%`

      // ── Memory ──
      if (!memGC) {
        memFill += dt * 0.00085
        if (memFill >= 80) {
          memGC = true
          log('✓ GC sweep — heap compacted')
        }
      } else {
        memFill = Math.max(31, memFill - dt * 0.11)
        if (memFill <= 32) memGC = false
      }
      if (memFillRef.current) memFillRef.current.style.width = `${memFill.toFixed(1)}%`
      if (memValRef.current)  memValRef.current.textContent  = `${memFill.toFixed(0)}%`

      // ── Queue ──
      qTimer += dt
      if (qTimer > 380) {
        qTimer = 0
        if (qFillIdx < Q_BARS) {
          qFills[qFillIdx] = Math.min(100, qFills[qFillIdx] + 28 + Math.random() * 30)
          if (qFills[qFillIdx] >= 88) qFillIdx++
        } else {
          qFills = new Array(Q_BARS).fill(0)
          qFillIdx = 0
          log('✓ batch dispatched — workers assigned')
        }
        for (let i = 0; i < Q_BARS; i++) {
          if (qBarRefs.current[i]) qBarRefs.current[i].style.height = `${qFills[i].toFixed(0)}%`
        }
        const avg = qFills.reduce((a, b) => a + b, 0) / Q_BARS
        if (qValRef.current) qValRef.current.textContent = `${avg.toFixed(0)}%`
      }

      // ── Error EKG ──
      ekgTimer += dt
      if (ekgTimer > 180) {
        ekgTimer = 0
        const isErrInc = incActive && incTarget === 3
        const val = isErrInc ? 12 + Math.random() * 20 : 1 + Math.random() * 2.8
        ekgBuf.shift()
        ekgBuf.push(val)
        if (errPolyRef.current) {
          errPolyRef.current.setAttribute('points', ekgPoints())
          errPolyRef.current.className.baseVal =
            isErrInc ? 'wsys-ekg-line wsys-ekg-line--alert' : 'wsys-ekg-line'
        }
        if (errValRef.current) errValRef.current.textContent = `${val.toFixed(1)}%`
      }

      // ── Uptime ──
      upTimer += dt
      if (upTimer > 1000) {
        upTimer = 0
        upSec++
        const h = String(Math.floor(upSec / 3600)).padStart(2, '0')
        const m = String(Math.floor((upSec % 3600) / 60)).padStart(2, '0')
        const s = String(upSec % 60).padStart(2, '0')
        if (upDisplayRef.current) upDisplayRef.current.textContent = `${h}:${m}:${s}`
      }

      // ── Deploy canary ──
      depTimer += dt
      if (depTimer > 550) {
        depTimer = 0
        depV2 = Math.min(90, depV2 + 0.28)
        if (depV2 >= 90) depV2 = 14
        const v1deg = (1 - depV2 / 100) * 360
        const v2deg = (depV2 / 100) * 360
        if (depArcV1Ref.current && v1deg > 4)
          depArcV1Ref.current.setAttribute('d', arc(25, 25, 17, -90, -90 + v1deg - 3))
        if (depArcV2Ref.current && v2deg > 4)
          depArcV2Ref.current.setAttribute('d', arc(25, 25, 17, -90 + v1deg + 3, -90 + 360 - 1))
        if (depValRef.current) depValRef.current.textContent = `v2 · ${depV2.toFixed(0)}%`
      }

      // ── Incident machine ──
      incTimer += dt
      if (!incActive && incTimer > incDuration) {
        incTimer = 0
        triggerIncident()
      } else if (incActive && incTimer > 3600) {
        incTimer = 0
        resolveIncident()
      }

      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
    return () => { cancelled = true }
  }, [isFinal])

  // Initial uptime display
  const initUp = '08:23:14'

  return (
    <motion.div
      className="widviz-layer widviz-systems"
      style={{ opacity: isFinal ? 1 : dissolve, scale: isFinal ? 1 : scale }}
    >
      <motion.div
        ref={dashRef}
        className="wsys-dashboard"
        style={{ '--enter': isFinal ? 1 : enter }}
      >

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="wsys-dash-header">
          <span className="wsys-dash-kicker">INFRA STATUS</span>
          <span ref={statusRef} className="wsys-dash-nominal">ALL SYSTEMS NOMINAL</span>
          <span className="wsys-dash-uptime">99.98% ↑</span>
        </div>

        {/* ── 6-cell grid ─────────────────────────────────────────────────── */}
        <div className="wsys-grid">

          {/* CPU */}
          <div ref={cpuCellRef} className="wsys-cell" style={{ '--i': 0 }}>
            <div className="wsys-cell-head">
              <span className="wsys-cell-label">CPU</span>
              <span ref={cpuBadgeRef} className="wsys-badge wsys-badge--ok">OK</span>
            </div>
            <div className="wsys-cores">
              {[52, 40, 65, 35].map((init, i) => (
                <div key={i} className="wsys-core-track">
                  <div
                    ref={el => { coreRefs.current[i] = el }}
                    className="wsys-core-bar"
                    style={{ height: `${init}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="wsys-cell-foot">
              <span ref={cpuValRef} className="wsys-val">48%</span>
              <span className="wsys-unit">4 cores</span>
            </div>
          </div>

          {/* MEMORY */}
          <div ref={memCellRef} className="wsys-cell" style={{ '--i': 1 }}>
            <div className="wsys-cell-head">
              <span className="wsys-cell-label">MEMORY</span>
              <span ref={memBadgeRef} className="wsys-badge wsys-badge--ok">OK</span>
            </div>
            <div className="wsys-mem-wrap">
              <div className="wsys-mem-top">
                <span className="wsys-mem-sub">HEAP</span>
                <span ref={memValRef} className="wsys-val-sm">44%</span>
              </div>
              <div className="wsys-mem-track">
                <div ref={memFillRef} className="wsys-mem-fill" style={{ width: '44%' }} />
              </div>
              <div className="wsys-mem-scale">
                <span>0</span><span>8 GB</span>
              </div>
            </div>
            <div className="wsys-cell-foot">
              <span className="wsys-unit">GC AUTO</span>
            </div>
          </div>

          {/* QUEUE */}
          <div ref={qCellRef} className="wsys-cell" style={{ '--i': 2 }}>
            <div className="wsys-cell-head">
              <span className="wsys-cell-label">QUEUE</span>
              <span ref={qBadgeRef} className="wsys-badge wsys-badge--ok">OK</span>
            </div>
            <div className="wsys-queue-bars">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="wsys-queue-track">
                  <div
                    ref={el => { qBarRefs.current[i] = el }}
                    className="wsys-queue-bar"
                    style={{ height: '0%' }}
                  />
                </div>
              ))}
            </div>
            <div className="wsys-cell-foot">
              <span ref={qValRef} className="wsys-val">0%</span>
              <span className="wsys-unit">depth</span>
            </div>
          </div>

          {/* ERR RATE */}
          <div ref={errCellRef} className="wsys-cell" style={{ '--i': 3 }}>
            <div className="wsys-cell-head">
              <span className="wsys-cell-label">ERR RATE</span>
              <span ref={errBadgeRef} className="wsys-badge wsys-badge--ok">OK</span>
            </div>
            <svg className="wsys-ekg-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
              <polyline
                ref={errPolyRef}
                className="wsys-ekg-line"
                points={Array.from({ length: 22 }, (_, i) =>
                  `${((i / 21) * 100).toFixed(1)},37`
                ).join(' ')}
              />
            </svg>
            <div className="wsys-cell-foot">
              <span ref={errValRef} className="wsys-val">1.4%</span>
              <span className="wsys-unit">p99</span>
            </div>
          </div>

          {/* UPTIME */}
          <div ref={upCellRef} className="wsys-cell" style={{ '--i': 4 }}>
            <div className="wsys-cell-head">
              <span className="wsys-cell-label">UPTIME</span>
              <span ref={upBadgeRef} className="wsys-badge wsys-badge--ok">OK</span>
            </div>
            <div className="wsys-uptime-wrap">
              <div ref={upDisplayRef} className="wsys-uptime-counter">{initUp}</div>
              <div className="wsys-uptime-sub">HH · MM · SS</div>
            </div>
            <div className="wsys-cell-foot">
              <span className="wsys-val">50</span>
              <span className="wsys-unit">hosts</span>
            </div>
          </div>

          {/* DEPLOY */}
          <div ref={depCellRef} className="wsys-cell" style={{ '--i': 5 }}>
            <div className="wsys-cell-head">
              <span className="wsys-cell-label">DEPLOY</span>
              <span ref={depBadgeRef} className="wsys-badge wsys-badge--ok">OK</span>
            </div>
            <div className="wsys-deploy-wrap">
              <svg className="wsys-deploy-svg" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="17" fill="none"
                  stroke="var(--muted-2)" strokeWidth="3.5" />
                <path ref={depArcV1Ref} className="wsys-arc wsys-arc--v1"
                  fill="none" strokeWidth="3.5" strokeLinecap="round"
                  d={arc(25, 25, 17, -90, -90 + (82 / 100) * 360 - 3)} />
                <path ref={depArcV2Ref} className="wsys-arc wsys-arc--v2"
                  fill="none" strokeWidth="3.5" strokeLinecap="round"
                  d={arc(25, 25, 17, -90 + (82 / 100) * 360 + 3, 269)} />
                <text x="25" y="23" textAnchor="middle" className="wsys-deploy-inner-label">CANARY</text>
                <text x="25" y="33" textAnchor="middle" className="wsys-deploy-inner-sub">ROLLOUT</text>
              </svg>
              <div ref={depValRef} className="wsys-deploy-val">v2 · 18%</div>
            </div>
          </div>

        </div>

        {/* ── Event log ──────────────────────────────────────────────────── */}
        <div ref={logRef} className="wsys-log" />

      </motion.div>
    </motion.div>
  )
}
