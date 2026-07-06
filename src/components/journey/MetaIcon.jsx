/**
 * MetaIcon — monoline SVG icon set for journey chapter metadata rows.
 *
 * Matches the site's existing inline-icon convention (see Hero.jsx's
 * `mf-icon` metrics: 24x24 viewBox, fill:none, stroke:currentColor,
 * strokeWidth 1.5, round joins) so metadata rows read as part of the same
 * design language rather than a one-off icon set. No emoji anywhere — this
 * is the only supported way to add a metadata glyph (see docs/journey.md).
 *
 * `currentColor` means the icon always follows the metadata row's own text
 * color — no color prop needed.
 */
const ICONS = {
  location: (
    <>
      <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  degree: (
    <>
      <path d="M12 4 3 9l9 5 9-5-9-5Z" />
      <path d="M7 11.5V16c0 1.24 2.24 2.5 5 2.5s5-1.26 5-2.5v-4.5" />
      <path d="M20 9.5v4" />
    </>
  ),
  institution: (
    <>
      <polygon points="12 2 20 7 4 7" />
      <line x1="6" y1="18" x2="6" y2="11" />
      <line x1="10" y1="18" x2="10" y2="11" />
      <line x1="14" y1="18" x2="14" y2="11" />
      <line x1="18" y1="18" x2="18" y2="11" />
      <line x1="3" y1="22" x2="21" y2="22" />
    </>
  ),
  role: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="2" y1="13" x2="22" y2="13" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="M8.2 13.5 6 22l6-3 6 3-2.2-8.5" />
    </>
  ),
  terminal: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 9l4 3-4 3" />
      <line x1="12" y1="15" x2="17" y2="15" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="3" width="18" height="6" rx="1" />
      <rect x="3" y="11" width="18" height="6" rx="1" />
      <circle cx="7" cy="6" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="7" cy="14" r="0.6" fill="currentColor" stroke="none" />
      <line x1="3" y1="19.5" x2="21" y2="19.5" />
    </>
  ),
  workflow: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <circle cx="18" cy="17" r="2.5" />
      <path d="M8.3 7.2 15.7 6.4" />
      <path d="M7.2 8.3 16.4 15.6" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5V18c0 1.66 3.58 3 8 3s8-1.34 8-3V5.5" />
      <path d="M4 11.75c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="4" cy="5" r="2" />
      <circle cx="20" cy="5" r="2" />
      <circle cx="4" cy="19" r="2" />
      <path d="M6 6.4 10.1 10.3" />
      <path d="M18 6.4 13.9 10.3" />
      <path d="M6 17.6 10.1 13.7" />
    </>
  ),
  cogbolt: (
    <>
      <path d="M12 3.5 12 6" />
      <path d="M12 18 12 20.5" />
      <path d="M20.5 12 18 12" />
      <path d="M6 12 3.5 12" />
      <path d="M17.7 6.3 15.9 8.1" />
      <path d="M8.1 15.9 6.3 17.7" />
      <path d="M17.7 17.7 15.9 15.9" />
      <path d="M8.1 8.1 6.3 6.3" />
      <circle cx="12" cy="12" r="4" />
      <path d="M13 8.5 9.5 13.5 11.5 13.5 11 15.5 14.5 10.5 12.5 10.5 13 8.5Z" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function MetaIcon({ name }) {
  const glyph = ICONS[name]
  if (!glyph) return null

  return (
    <svg
      className="journey-meta__icon"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph}
    </svg>
  )
}
