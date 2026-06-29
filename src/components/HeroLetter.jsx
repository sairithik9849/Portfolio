import { motion } from 'framer-motion'

export default function HeroLetter({ char, className = '' }) {
  return (
    <motion.span
      className={`char${className ? ` ${className}` : ''}`}
      whileHover={{ y: -14, color: '#c9f558' }}
      transition={{ type: 'spring', stiffness: 380, damping: 14 }}
    >
      {char}
    </motion.span>
  )
}
