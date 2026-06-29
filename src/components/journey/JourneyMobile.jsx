/**
 * JourneyMobile — simplified journey layout for narrow viewports (≤ 767px).
 *
 * No sticky pinning. Each chapter reads comfortably as natural scroll content.
 * Shown via CSS (display:block on ≤767px, display:none on ≥768px) — the
 * desktop layout is hidden on mobile and vice versa, so only one tree is
 * ever visible at a time.
 */
export default function JourneyMobile({ chapters }) {
  return (
    <div className="journey-mobile" aria-label="Journey timeline">
      {chapters.map((ch) => (
        <article key={ch.id} className="journey-mobile__chapter">
          <header className="journey-mobile__header">
            <span className="journey-mobile__num kicker">{ch.chapterNumber}</span>
            <span className="journey-mobile__nav-title kicker">
              {ch.navigationTitle}
            </span>
          </header>
          <h2 className="journey-mobile__title">{ch.title}</h2>
          <p className="journey-mobile__body">{ch.body}</p>
        </article>
      ))}
    </div>
  )
}
