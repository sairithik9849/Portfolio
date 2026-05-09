import { motion } from 'framer-motion'
import { STAGGER_PARENT, STAGGER_CHILD } from '../animations/variants'
import { METRICS } from '../data/metrics'
import SectionHead from './SectionHead'

export default function Metrics() {
  return (
    <section id="metrics">
      <SectionHead
        idx="02"
        title="Metrics &"
        em="identity"
        right="A borders-only ledger. Academic, engineering, and off-hours. Each cell is independent."
      />
      <div className="shell">
        <motion.div className="metrics" {...STAGGER_PARENT}>
          {METRICS.map((m, i) => (
            <motion.div className="metric" key={i} {...STAGGER_CHILD}>
              <div className="head">
                <span>{m.kicker}</span>
                <span>↗</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {m.label}
                </div>
                <div className={`val ${m.small ? 'small' : ''}`}>
                  {m.val}<span className="unit">{m.unit}</span>
                </div>
                {m.barOn && (
                  <div className="bar">
                    {Array.from({ length: m.barTotal }).map((_, j) => (
                      <i key={j} className={j < m.barOn ? 'on' : ''} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="desc">{m.desc}</div>
                <span className="tag" style={{ marginTop: 10, display: 'inline-block' }}>// {m.tag}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
