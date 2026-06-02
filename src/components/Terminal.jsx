import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const BODY_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

const LINE_VARIANTS = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

const BOOT_TEXT = './agent --boot'
const BOOT_DELAY_MS = 900
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
    {
      n: 2,
      content: (
        <>
          name_pron    = "Sigh-RIH-thick / Koh-moo-ruh-VEL-lee"
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
    { n: 3, content: <>friends_call_me = <b style={{ color: 'var(--fg)' }}>"Sai"</b></> },
    { n: 4, content: <>roles    = [<span style={{ color: 'var(--accent)' }}>"Software Engineer"</span>, <span style={{ color: 'var(--accent)' }}>"System Administrator"</span>]</> },
    { n: 5, content: ' ' },
    { n: 6, content: <TypedBoot />, k: true },
  ]

  return (
    <div className="terminal">
      <div className="bar">
        <div className="lights">
          <span /><span /><span />
        </div>
        <span className="bar-title">~/sairithik · <span className="bar-shell">zsh</span></span>
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
