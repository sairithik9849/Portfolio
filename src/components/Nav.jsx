import { NAV } from '../data/nav'

export default function Nav() {
  return (
    <nav className="nav">
      <div className="brand">
        <span className="sigil" />
        <span>SAIRITHIK / KOMURAVELLY</span>
      </div>
      <div className="nav-links">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} data-cursor="hover">
            <span className="num">{n.n}</span>
            {n.label}
          </a>
        ))}
      </div>
      <div className="nav-cta">
        <span className="status-pill">
          <span className="dot" />
          AVAILABLE / 2026
        </span>
      </div>
    </nav>
  )
}
