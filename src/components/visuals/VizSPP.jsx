const ROWS = [
  ['Saanvi · Tokyo hostel', '−¥4,800', ''],
  ['Akhil · Climbing gym', '−$24.50', ''],
  ['You · Groceries (recurr.)', '', '+$112.00'],
  ['Maya · Concert tix', '−$87.20', ''],
]

export default function VizSPP() {
  return (
    <div className="viz-spp">
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>
        <span>// ledger · group · TOKYO 26</span>
        <span>USD ↔ JPY</span>
      </div>
      {ROWS.map((r, i) => (
        <div className="row-l" key={i}>
          <b>{r[0]}</b>
          <span className="neg">{r[1]}</span>
          <span className="pos">{r[2]}</span>
        </div>
      ))}
      <div className="summary">
        <span>NET SETTLEMENT · 4 → 2 transfers</span>
        <span style={{ color: 'var(--accent)' }}>OPTIMAL</span>
      </div>
    </div>
  )
}
