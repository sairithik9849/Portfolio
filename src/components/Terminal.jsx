import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const BODY_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.7 } },
}

const LINE_VARIANTS = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

const BOOT_TEXT = './agent --boot'
const BOOT_DELAY_MS = 1800
const BOOT_STEP_MS = 55

function TypedBoot() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const start = setTimeout(() => {
      const id = setInterval(() => {
        setN((prev) => {
          if (prev >= BOOT_TEXT.length) {
            clearInterval(id)
            return prev
          }
          return prev + 1
        })
      }, BOOT_STEP_MS)
    }, BOOT_DELAY_MS)
    return () => clearTimeout(start)
  }, [])
  return (
    <>
      <span style={{ color: 'var(--muted)' }}>$ </span>
      {BOOT_TEXT.slice(0, n)}
      <span className="cur" />
    </>
  )
}

export default function Terminal() {
  const audioRef = useRef(null)

  const pronounce = () => {
    try {
      if (!audioRef.current) audioRef.current = new Audio('/pronounce.mp3')
      audioRef.current.currentTime = 0
      const p = audioRef.current.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch {
      /* silent — audio file may not exist yet */
    }
  }

  const lines = [
    { n: 1, content: <><span style={{ color: 'var(--muted)' }}>// </span>identity --resolve</>, k: true },
    { n: 2, content: <>name    = <b style={{ color: 'var(--fg)' }}>"Sairithik Komuravelly"</b> <span style={{ color: 'var(--muted)' }}>   // can't pronounce it? just call me Sai</span> </> },
    {
      n: 3,
      content: (
        <>
          pron    = "Sigh-RIH-thick / Koh-moo-ruh-VEL-lee"
          <button
            type="button"
            className="play"
            onClick={pronounce}
            data-cursor="hover"
            aria-label="Play name pronunciation"
            title="Play pronunciation"
          >
            ▶
          </button>
        </>
      ),
    },
    {
      n: 4,
      content: (
        <>
          alias   = <span style={{ color: 'var(--accent)' }}>"Sai"</span>
        </>
      ),
    },
    { n: 5, content: <>role    = "Software Engineer & System Administrator"</> },
    { n: 6, content: <>focus   = [<span style={{ color: 'var(--accent)' }}>"systems"</span>, <span style={{ color: 'var(--accent)' }}>"backend"</span>, <span style={{ color: 'var(--accent)' }}>"ai"</span>]</> },
    { n: 7, content: ' ' },
    { n: 8, content: <><span style={{ color: 'var(--muted)' }}>// mission</span> — build at the seam between low-level systems</> },
    { n: 9, content: <>and modern interface. scaled API infra · <span style={{ color: 'var(--accent)' }}>10M+</span> daily tx · <span style={{ color: 'var(--accent)' }}>↓60%</span> latency.</> },
    { n: 10, content: ' ' },
    { n: 11, content: <TypedBoot />, k: true },
  ]

  return (
    <div className="terminal">
      <div className="bar">
        <div className="lights">
          <span /><span /><span />
        </div>
        <span>~/sairithik · zsh</span>
        <span>0049</span>
      </div>
      <motion.div className="body" initial="hidden" animate="show" variants={BODY_VARIANTS}>
        {lines.map((l) => (
          <motion.div key={l.n} className={`ln ${l.k ? 'k' : ''}`} variants={LINE_VARIANTS}>
            <span className="n">{String(l.n).padStart(2, '0')}</span>
            <span>{l.content}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
