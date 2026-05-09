import { motion } from 'framer-motion'
import { REVEAL } from '../animations/variants'

export default function SectionHead({ idx, title, em, right }) {
  return (
    <motion.div className="section-head shell" {...REVEAL}>
      <div className="idx">{idx}</div>
      <div className="title">
        {title} <em>{em}</em>
      </div>
      <div className="right">{right}</div>
    </motion.div>
  )
}
