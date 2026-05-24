import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STAGGER_PARENT, STAGGER_CHILD } from '../animations/variants'
import SectionHead from './SectionHead'
import {
  RUNTIME_ENV,
  PRIOR_PROCESS,
  STACK,
  STACK_GROUPS,
  PROTOCOL,
  OFF_HOURS,
} from '../data/about'

export default function About() {
  const [selectedChip, setSelectedChip] = useState(null)
  const activeChip = STACK.find((s) => s.id === selectedChip)

  return (
    <section id="system">
      <SectionHead
        idx="03"
        title="System"
        em="Specs."
        right="// runtime configuration"
      />
      <div className="shell">
        <motion.div className="about-grid" {...STAGGER_PARENT}>

          {/* A — Runtime Environment (primary card with accent stripe) */}
          <motion.div className="about-cell about-cell--primary" {...STAGGER_CHILD}>
            <div className="kicker">{RUNTIME_ENV.kicker}</div>
            <div className="about-degree">{RUNTIME_ENV.degree}</div>
            <div className="about-school">
              {RUNTIME_ENV.school}
              <span style={{ color: 'var(--muted)' }}> · {RUNTIME_ENV.location}</span>
            </div>
            <div className="about-stat-row">
              <div className="about-stat">
                <div className="kicker">GPA</div>
                <div className="about-gpa">
                  {RUNTIME_ENV.gpa}
                  <span className="about-gpa-u">/4.0</span>
                </div>
              </div>
              <div className="about-stat">
                <div className="kicker">STATUS</div>
                <div className="about-status">{RUNTIME_ENV.status}</div>
              </div>
            </div>
            <div className="about-concurrent">{RUNTIME_ENV.concurrent}</div>
          </motion.div>

          {/* B — Process History */}
          <motion.div className="about-cell" {...STAGGER_CHILD}>
            <div className="kicker">{PRIOR_PROCESS.kicker}</div>
            <div className="about-degree">{PRIOR_PROCESS.title}</div>
            <div className="about-school">{PRIOR_PROCESS.org}</div>
            <ul className="about-log">
              {PRIOR_PROCESS.lines.map((line) => (
                <li key={line} className="about-log-line">{line}</li>
              ))}
            </ul>
          </motion.div>

          {/* C — Compiled Stack (the one focused interactive element) */}
          <motion.div className="about-cell about-cell--stack" {...STAGGER_CHILD}>
            <div className="kicker">// COMPILED STACK</div>
            <div className="about-stack-inner">
              <div className="about-chips">
                {STACK_GROUPS.map(({ key, label }) => (
                  <div key={key} className="about-chip-group">
                    <div className="kicker" style={{ marginBottom: 8 }}>{label}</div>
                    <div className="about-chip-row">
                      {STACK.filter((s) => s.group === key).map((s) => (
                        <motion.button
                          key={s.id}
                          className={`about-chip${selectedChip === s.id ? ' about-chip--active' : ''}`}
                          onHoverStart={() => setSelectedChip(s.id)}
                          onHoverEnd={() => setSelectedChip(null)}
                          onFocus={() => setSelectedChip(s.id)}
                          onBlur={() => setSelectedChip(null)}
                          whileHover={{ scale: 1.04 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                        >
                          {s.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="about-readout">
                <div className="kicker">// SELECTED</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedChip ?? 'none'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="about-readout-body"
                  >
                    {activeChip ? (
                      <>
                        <div className="about-readout-name">{activeChip.label}</div>
                        <div className="about-readout-fact">{activeChip.fact}</div>
                      </>
                    ) : (
                      <div className="about-readout-idle">// hover a node to inspect</div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* D — Development Protocol */}
          <motion.div className="about-cell about-cell--protocol" {...STAGGER_CHILD}>
            <div className="kicker">// DEV PROTOCOL</div>
            <p className="about-manifesto">
              {PROTOCOL.map(({ text, emphasis }, i) =>
                emphasis ? (
                  <span
                    key={i}
                    className="serif"
                    style={{ color: 'var(--accent-2)', fontStyle: 'italic' }}
                  >
                    {text}
                  </span>
                ) : (
                  text
                )
              )}
            </p>
            <div className="about-status-line">// status: shipping</div>
          </motion.div>

          {/* E / F / G — Off-Hours & Hardware */}
          {OFF_HOURS.map((item) => (
            <motion.div key={item.id} className="about-cell about-cell--small" {...STAGGER_CHILD}>
              <div className="kicker">{item.kicker}</div>
              <div className="about-off-headline">{item.headline}</div>
              <div className="about-off-sub">{item.sub}</div>
            </motion.div>
          ))}

        </motion.div>
      </div>
    </section>
  )
}
