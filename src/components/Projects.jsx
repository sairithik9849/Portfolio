import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { REVEAL } from '../animations/variants'
import { PROJECTS } from '../data/projects'
import SectionHead from './SectionHead'
import ProjectVisual from './ProjectVisual'

/*
  Horizontal expanding accordion.

  Each card is a motion.article with the `layout` prop. When `active` changes,
  CSS flex recalculates (collapsed → 64 px, expanded → fills remaining space).
  Framer Motion's FLIP detects the bounding-box delta and animates with a spring —
  no manual keyframes needed.

  Inner content uses AnimatePresence mode="popLayout" so the exiting content is
  instantly removed from layout flow (like position:absolute) while it fades out,
  preventing it from pushing the expanding content during the transition.
*/

const SPRING = { layout: { type: 'spring', stiffness: 280, damping: 32 } }

export default function Projects() {
  const [active, setActive] = useState(0)

  return (
    <section id="work">
      <SectionHead
        idx="05"
        title="Featured"
        em="engineering."
        right="Six selected projects. Click to expand. Each is a different layer of the stack."
      />
      <motion.div className="shell" {...REVEAL}>
        <div className="accordion-wrap">
          <div className="accordion-projects">
            {PROJECTS.map((p, i) => {
              const isActive = active === i
              return (
                <motion.article
                  key={p.num}
                  layout
                  className="acc-card"
                  style={{ flex: isActive ? '1 1 auto' : '0 0 64px' }}
                  onClick={() => setActive(i)}
                  transition={SPRING}
                  data-cursor="hover"
                  whileHover={!isActive ? { backgroundColor: 'rgba(201,245,88,0.025)' } : undefined}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {isActive ? (
                      /*
                        Expanded view: two-column grid (info | visual).
                        Delay opacity so content only fades in after the card
                        has mostly finished expanding — avoids the cramped look.
                      */
                      <motion.div
                        key="expanded"
                        className="acc-card-expanded"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 0.18, duration: 0.28 } }}
                        exit={{ opacity: 0, transition: { duration: 0.08 } }}
                        style={{ minWidth: 0 }}
                      >
                        <div className="acc-info">
                          <div>
                            <div className="acc-num-big">{p.num}</div>
                            <h3>{p.name}</h3>
                            <div className="acc-role">// {p.role}</div>
                          </div>
                          <p className="acc-blurb">{p.blurb}</p>
                          <div>
                            <div className="acc-stack">
                              {p.stack.map((s) => <span key={s}>{s}</span>)}
                            </div>
                            <div className="acc-links">
                              <span className="link-primary">→ Case study</span>
                              <span className="link-secondary">↗ Repo</span>
                            </div>
                          </div>
                        </div>
                        <ProjectVisual kind={p.visual} p={p} />
                      </motion.div>
                    ) : (
                      /*
                        Collapsed view: project number at top, name rotated vertically at bottom.
                        Short delay so it doesn't flicker during the card shrink.
                      */
                      <motion.div
                        key="collapsed"
                        className="acc-card-collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.22 } }}
                        exit={{ opacity: 0, transition: { duration: 0.06 } }}
                      >
                        <span className="acc-collapsed-num">{p.num}</span>
                        <span className="acc-collapsed-name">{p.name}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              )
            })}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
