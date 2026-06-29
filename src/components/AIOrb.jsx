import { motion } from 'framer-motion'

export default function AIOrb({ onClick, hidden = false }) {
  return (
    <motion.button
      className="ai-orb"
      onClick={onClick}
      aria-label="Open AI agent"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      style={{ pointerEvents: hidden ? 'none' : 'auto' }}
      animate={hidden
        ? { opacity: 0, scale: 0.88, y: 0 }
        : { opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
        y: { duration: 3.5, repeat: hidden ? 0 : Infinity, ease: 'easeInOut' },
      }}
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
