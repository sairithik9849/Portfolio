const W = 360, H = 160

const EXP_POINTS = Array.from({ length: 31 }, (_, i) => {
  const x = ((i / 30) * W).toFixed(1)
  const y = (H - Math.min(H - 4, Math.pow(1.18, i) * 0.6)).toFixed(1)
  return `${x},${y}`
}).join(' ')

const LIN_POINTS = Array.from({ length: 31 }, (_, i) => {
  const x = ((i / 30) * W).toFixed(1)
  const y = (H - (i / 30) * (H * 0.35)).toFixed(1)
  return `${x},${y}`
}).join(' ')

export default function VizMF() {
  return (
    <div className="viz-mf">
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
        <span>// time complexity</span>
        <span>N → ∞</span>
      </div>
      <div className="chart" style={{ marginTop: 10 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1="0" x2={W} y1={H * (1 - t)} y2={H * (1 - t)} stroke="rgba(237,237,223,0.06)" />
          ))}
          <polyline points={EXP_POINTS} fill="none" stroke="rgba(255,139,110,0.6)" strokeWidth="1.5" strokeDasharray="3 3" />
          <polyline points={LIN_POINTS} fill="none" stroke="var(--accent)" strokeWidth="2" />
          <text x="6" y="14" fill="rgba(255,139,110,0.7)" fontSize="9" fontFamily="JetBrains Mono">O(2ⁿ)  before</text>
          <text x={W - 110} y={H - 6} fill="var(--accent)" fontSize="9" fontFamily="JetBrains Mono">O(N)  after</text>
        </svg>
      </div>
      <div className="legend">
        <span className="a">— legacy enumeration</span>
        <span className="b">— linear-pass compiler</span>
      </div>
      <div style={{ marginTop: 14, padding: '10px', border: '1px solid var(--line)', color: 'var(--fg-2)' }}>
        EXEC PLAN <span style={{ color: 'var(--muted)' }}>·</span> hash-group → project → emit · <span style={{ color: 'var(--accent)' }}>−60% p99</span>
      </div>
    </div>
  )
}
