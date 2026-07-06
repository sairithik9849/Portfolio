import { motion } from 'framer-motion'
import MetaIcon from './MetaIcon'

/**
 * MetaList — chapter metadata rows: a monoline icon in a small outlined chip
 * beside a bright, readable text label. An item with an `href` (currently
 * the MGIT / Saras Analytics / Stevens institution rows) renders as a link
 * that opens in a new tab, with the "clickable" affordance (underline + ↗)
 * appearing on hover only — see `.journey-meta__link` in journey.css.
 * Shared between the desktop scenes and the mobile adaptation.
 */
export default function MetaList({ items, band, reduced }) {
  const rows = (
    <ul className="journey-meta">
      {items.map((item) => (
        <li key={item.text} className="journey-meta__row">
          <span className="journey-meta__icon-chip">
            <MetaIcon name={item.icon} />
          </span>
          {item.href ? (
            <a
              className="journey-meta__link"
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              {item.text}
              <span className="journey-meta__link-arrow" aria-hidden="true">↗</span>
            </a>
          ) : (
            <span>{item.text}</span>
          )}
        </li>
      ))}
    </ul>
  )

  if (reduced || !band) return rows

  return (
    <motion.div style={{ opacity: band.opacity, y: band.y }}>
      {rows}
    </motion.div>
  )
}
