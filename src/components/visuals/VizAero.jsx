const PINS = [
  { x: 30, y: 38 }, { x: 60, y: 30 }, { x: 72, y: 56 },
  { x: 44, y: 64 }, { x: 22, y: 56 }, { x: 50, y: 48 },
]

export default function VizAero() {
  return (
    <div className="viz-aero">
      <div className="globe" />
      <div className="arc" style={{ left: '20%', top: '10%', width: '60%', height: '80%', transform: 'rotate(15deg)' }} />
      <div className="arc" style={{ left: '10%', top: '20%', width: '80%', height: '60%', transform: 'rotate(-22deg)' }} />
      {PINS.map((p, i) => (
        <span key={i} className="pin" style={{ left: `${p.x}%`, top: `${p.y}%` }} />
      ))}
      <div className="ticker">
        <span>FLT 1184 · KEWR→KSFO</span>
        <span><b>34,000ft</b></span>
        <span><b>478kt</b></span>
        <span>ETA 06:42z</span>
      </div>
    </div>
  )
}
