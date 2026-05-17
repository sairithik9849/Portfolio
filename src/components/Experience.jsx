import { motion } from 'framer-motion'
import { STAGGER_PARENT } from '../animations/variants'
import { EXPERIENCE } from '../data/experience'
import SectionHead from './SectionHead'
import ExperienceRow from './ExperienceRow'

export default function Experience() {
  return (
    <section id="experience">
      <SectionHead
        idx="03"
        title="Execution"
        em="log."
        right="A reverse-chronological systems trail. Each entry is a process — uptime, throughput, and what shipped."
      />
      <div className="shell">
        <motion.div className="exec-log" {...STAGGER_PARENT}>
          <div className="exec-log-head">
            <span>// PROCESS</span>
            <span>STATUS</span>
            <span>RANGE</span>
            <span>LOCATION</span>
          </div>
          {EXPERIENCE.map((e) => (
            <ExperienceRow key={e.idx} e={e} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
