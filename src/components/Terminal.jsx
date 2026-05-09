import { motion } from 'framer-motion'

const BODY_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.7 } },
}

const LINE_VARIANTS = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

export default function Terminal() {
  const lines = [
    { n: 1, content: <><span style={{ color: 'var(--muted)' }}>// </span>identity --resolve</>, k: true },
    { n: 2, content: <>name      = <b style={{ color: 'var(--fg)' }}>"Sairithik Komuravelly"</b></> },
    { n: 3, content: <>pron      = "Sigh-RIH-thick / Koh-moo-ruh-VEL-lee"</> },
    { n: 4, content: <>roles     = [<span style={{ color: 'var(--accent)' }}>"systems"</span>, <span style={{ color: 'var(--accent)' }}>"backend"</span>, <span style={{ color: 'var(--accent)' }}>"ai"</span>]</> },
    { n: 5, content: <>uptime    = 99.97%</> },
    { n: 6, content: <>latency   = <span style={{ color: 'var(--accent)' }}>↓60%</span> on hot-path</> },
    { n: 7, content: ' ' },
    { n: 8, content: <><span style={{ color: 'var(--muted)' }}>$ </span>./agent --boot<span className="cur" /></>, k: true },
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
