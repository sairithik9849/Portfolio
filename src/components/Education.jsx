import { motion } from 'framer-motion'
import { STAGGER_PARENT, STAGGER_CHILD } from '../animations/variants'
import { EDUCATION } from '../data/education'
import SectionHead from './SectionHead'

export default function Education() {
  return (
    <section id="education">
      <SectionHead
        idx="06"
        title="Education"
        em="ledger."
        right="Two entries. Both 4.0. Same institution — different surfaces."
      />
      <div className="shell">
        <motion.div className="edu-grid" {...STAGGER_PARENT}>
          {EDUCATION.map((e) => (
            <motion.article
              key={e.idx}
              className={`edu-card ${e.primary ? 'primary' : ''}`}
              {...STAGGER_CHILD}
            >
              <div className="edu-head">
                <span className="kicker">{e.idx}</span>
                <span className="kicker">{e.range}</span>
              </div>
              <div className="edu-degree">{e.degree}</div>
              <div className="edu-school">
                {e.school} <span style={{ color: 'var(--muted)' }}>· {e.location}</span>
              </div>
              <div className="edu-stat-row">
                <div className="edu-stat">
                  <div className="kicker">GPA</div>
                  <div className="edu-gpa">{e.gpa}<span className="edu-gpa-u">/4.0</span></div>
                </div>
                <div className="edu-stat">
                  <div className="kicker">STATUS</div>
                  <div className="edu-status">{e.primary ? 'IN PROGRESS' : 'COMPLETED'}</div>
                </div>
              </div>
              <div className="edu-note">{e.note}</div>
              <div className="edu-courses">
                <div className="kicker" style={{ marginBottom: 8 }}>// CORE COURSEWORK</div>
                <div className="edu-course-list">
                  {e.courses.map((c) => <span key={c}>{c}</span>)}
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
