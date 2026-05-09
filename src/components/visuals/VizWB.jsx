// Computed once at module load — static snapshot of the 220-point constellation
const DOTS = Array.from({ length: 220 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 80 + 10,
  r: Math.random() * 1.4 + 0.4,
}))

export default function VizWB() {
  return (
    <div className="viz-wb">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M -10 80 Q 50 50 110 80" stroke="rgba(237,237,223,0.12)" fill="none" />
        <path d="M -10 90 Q 50 65 110 90" stroke="rgba(237,237,223,0.06)" fill="none" />
        {DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill={i % 9 === 0 ? 'var(--accent)' : 'rgba(237,237,223,0.55)'}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', top: 14, right: 14, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
        24,184 PTS · 60s
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 14, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>
        ◉ ALT 21.3km · drift NE
      </div>
    </div>
  )
}
