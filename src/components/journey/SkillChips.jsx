import { motion } from 'framer-motion'

/**
 * SkillChips — outlined, static pills. Calm border/text at rest, with a
 * hover lift to green (desktop pointer, via CSS). Reveals as the last band
 * of its scene, then simply holds — no idle motion, so the row never
 * competes with the avatar or the per-year scene visuals for attention.
 * Shared between desktop scenes and mobile.
 */
export default function SkillChips({ skills, band, reduced }) {
  const chips = (
    <ul className="journey-chips">
      {skills.map((skill) => (
        <li key={skill} className="journey-chips__item">
          <span className="journey-chips__chip">{skill}</span>
        </li>
      ))}
    </ul>
  )

  if (reduced || !band) return chips

  return (
    <motion.div style={{ opacity: band.opacity, y: band.y }}>
      {chips}
    </motion.div>
  )
}
