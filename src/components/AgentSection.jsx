import { motion } from 'framer-motion'
import { REVEAL } from '../animations/variants'
import SectionHead from './SectionHead'

const CAPABILITIES = [
  ['RAG over CV + projects',   'ENABLED'],
  ['Code sample retrieval',    'ENABLED'],
  ['Structured JSON output',   'ENABLED'],
  ['Calendar / contact handoff', 'STAGED'],
  ['Voice mode',               'PLANNED'],
]

export default function AgentSection({ onOpenAI }) {
  return (
    <section id="agent">
      <SectionHead
        idx="03"
        title="The agent."
        em="Query my brain."
        right="A retrieval-augmented LLM surface trained on my work, writing, and projects. Ask it anything."
      />
      <div className="shell" style={{ paddingBottom: 48 }}>
        <motion.div className="agent-matrix" {...REVEAL}>
          <div className="panel">
            <div className="kicker" style={{ marginBottom: 18 }}>03.A — INTERFACE</div>
            <div className="serif" style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 18 }}>
              A glassmorphic side-drawer that <em style={{ color: 'var(--muted)' }}>thinks out loud.</em>
            </div>
            <p style={{ color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.6, maxWidth: '46ch', margin: 0 }}>
              Conversation bubbles for the soft answer; structured data — JSON, ledger
              cards, code — for the hard one. Electric lime accent for the agent's voice;
              deep charcoal for the room.
            </p>
            <button
              className="agent-open-btn"
              onClick={onOpenAI}
            >
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: 13 }}>›</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Open the agent
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11 }}>⌘K</span>
            </button>
          </div>
          <div className="panel">
            <div className="kicker" style={{ marginBottom: 18 }}>03.B — CAPABILITY MATRIX</div>
            <table>
              <tbody>
                {CAPABILITIES.map(([label, status]) => (
                  <tr key={label}>
                    <td style={{ color: 'var(--fg-2)' }}>{label}</td>
                    <td style={{ color: status === 'ENABLED' ? 'var(--accent)' : 'var(--muted)' }}>{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
