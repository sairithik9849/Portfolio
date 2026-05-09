export default function VizLL() {
  return (
    <div className="viz-ll">
      <div className="road" style={{ left: 0, right: 0, top: '42%', height: 6 }} />
      <div className="road" style={{ top: 0, bottom: 0, left: '38%', width: 6 }} />
      <div className="road" style={{ left: 0, right: 0, top: '72%', height: 3 }} />
      <span className="pin"     style={{ left: '22%', top: '24%' }} />
      <span className="pin alt" style={{ left: '56%', top: '20%' }} />
      <span className="pin"     style={{ left: '70%', top: '56%' }} />
      <span className="pin alt" style={{ left: '30%', top: '66%' }} />
      <span className="pin"     style={{ left: '50%', top: '80%' }} />
      <div className="label" style={{ left: '24%', top: '14%' }}>YARD SALE · SAT 9A</div>
      <div className="label" style={{ left: '58%', top: '60%' }}>BLOCK PARTY · 7TH ST</div>
      <div className="label" style={{ left: '32%', top: '74%' }}>LOST CAT · TABBY</div>
      <div style={{ position: 'absolute', left: 14, bottom: 12, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.12em' }}>
        // 0.4 mi radius · 26 active posts
      </div>
    </div>
  )
}
