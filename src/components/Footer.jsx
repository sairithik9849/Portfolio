import { motion } from 'framer-motion'
import { REVEAL } from '../animations/variants'

export default function Footer({ onOpenAI }) {
  return (
    <motion.footer className="footer shell" id="contact" {...REVEAL}>
      <div className="kicker" style={{ marginBottom: 32 }}>07 — END OF FILE</div>
      <div className="big">
        Let's build<br />
        something <em>load-<br />bearing.</em>
      </div>
      <div className="links">
        <a href="mailto:skomurav@stevens.edu" data-cursor="hover">
          <span style={{ color: 'var(--accent)' }}>↗</span> skomurav@stevens.edu
        </a>
        <a href="https://github.com/sairithik9849" target="_blank" rel="noreferrer" data-cursor="hover">
          <span style={{ color: 'var(--accent)' }}>↗</span> github / sairithik9849
        </a>
        <a href="https://www.linkedin.com/in/sairithik-komuravelly-8348b124b/" target="_blank" rel="noreferrer" data-cursor="hover">
          <span style={{ color: 'var(--accent)' }}>↗</span> linkedin / komuravelly
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); onOpenAI() }} data-cursor="hover">
          <span style={{ color: 'var(--accent)' }}>↗</span> ask the agent
        </a>
      </div>
      <div className="end">
        <span>© 2026 / S.KOMURAVELLY</span>
        <span>HOBOKEN · NJ · 40°44N</span>
        <span>BUILD 0049 / v.2026.05</span>
      </div>
    </motion.footer>
  )
}
