import { motion } from 'framer-motion'

export default function AIOrb({ onClick }) {
  return (
    <motion.button
      className="ai-orb"
      onClick={onClick}
      aria-label="Open AI agent"
      data-cursor="hover"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="core" />
      <span className="label">
        ASK · LLM v0.4
        <span className="big">Talk to my AI agent</span>
      </span>
    </motion.button>
  )
}
