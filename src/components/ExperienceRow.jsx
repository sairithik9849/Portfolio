import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STAGGER_CHILD } from '../animations/variants'

export default function ExperienceRow({ e }) {
  const [open, setOpen] = useState(true)

  return (
    <motion.div className={`exec-row ${open ? 'open' : ''}`} {...STAGGER_CHILD}>
      <button className="exec-summary" onClick={() => setOpen((o) => !o)}>
        <span className="exec-idx">{e.idx}</span>
        <span className="exec-co">
          <span className="exec-co-name">{e.company}</span>
          <span className="exec-co-role">// {e.role}</span>
        </span>
        <span className={`exec-status ${e.status === 'RUNNING' ? 'live' : ''}`}>
          {e.status === 'RUNNING' && <span className="dot" style={{ marginRight: 8 }} />}
          {e.status}
        </span>
        <span className="exec-range">{e.range}</span>
        <span className="exec-loc">{e.location}</span>
        <span className="exec-toggle">{open ? '−' : '+'}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="exec-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="exec-detail-inner">
              <div className="exec-bullets">
                {e.bullets.map((b, j) => (
                  <div className="exec-bullet" key={j}>
                    <span className="exec-bullet-n">{String(j + 1).padStart(2, '0')}</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
              <div className="exec-side">
                <div className="kicker" style={{ marginBottom: 10 }}>// stack</div>
                <div className="exec-stack">
                  {e.stack.map((s) => <span key={s}>{s}</span>)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
