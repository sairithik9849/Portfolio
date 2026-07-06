import { motion } from 'framer-motion'
import { parseDeckEmphasis } from '../../lib/journey/deckEmphasis'

/**
 * QuoteBlock — the one piece of shared grammar every journey scene commits
 * to: the hero quote (always the largest element on screen, revealed line
 * by line) and a single supporting deck line. The chapter label lives in
 * the sticky year marker instead (JourneyTimeline.jsx), grouped with the
 * year rather than the quote. Scenes vary their featured visual and
 * composition around this block — never this block's identity or its
 * dominance on screen.
 *
 * Hierarchy within the block itself: the quote's final line (each chapter's
 * "punch" line by content design) renders in --accent instead of --fg, and
 * `deck`'s one `**marked**` phrase (see src/data/journey.js) renders as a
 * gold italic `<em>` — both static color/font choices, not motion.
 *
 * `bands` supplies the { quoteLines, deck } slice of useSceneReveal's
 * output. Under `reduced`, bands are ignored and everything renders fully
 * visible/static, matching the rest of the section's reduced-motion path.
 */
export default function QuoteBlock({ quote, deck, bands, reduced }) {
  const deckSegments = parseDeckEmphasis(deck)
  const lastLineIndex = quote.length - 1

  const deckContent = deckSegments.map((segment, i) => (
    segment.emphasis
      ? <em key={i} className="journey-quote-block__deck-emphasis">{segment.text}</em>
      : <span key={i}>{segment.text}</span>
  ))

  if (reduced) {
    return (
      <div className="journey-quote-block">
        <h3 className="journey-quote-block__quote">
          {quote.map((line, i) => (
            <span
              key={line}
              className={
                i === lastLineIndex
                  ? 'journey-quote-block__line journey-quote-block__line--accent'
                  : 'journey-quote-block__line'
              }
            >
              {line}
            </span>
          ))}
        </h3>
        <p className="journey-quote-block__deck">{deckContent}</p>
      </div>
    )
  }

  return (
    <div className="journey-quote-block">
      <h3 className="journey-quote-block__quote">
        {quote.map((line, i) => (
          <motion.span
            key={line}
            className={
              i === lastLineIndex
                ? 'journey-quote-block__line journey-quote-block__line--accent'
                : 'journey-quote-block__line'
            }
            style={{ opacity: bands.quoteLines[i].opacity, y: bands.quoteLines[i].y }}
          >
            {line}
          </motion.span>
        ))}
      </h3>
      <motion.p
        className="journey-quote-block__deck"
        style={{ opacity: bands.deck.opacity, y: bands.deck.y }}
      >
        {deckContent}
      </motion.p>
    </div>
  )
}
