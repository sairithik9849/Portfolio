/**
 * Pure parser for the `**phrase**` emphasis marker used in `deck` strings
 * (see src/data/journey.js). Keeps the marker itself out of the rendered
 * components — QuoteBlock.jsx and JourneyMobile.jsx both consume the
 * returned segments to render an `<em>` for the marked phrase and plain
 * text everywhere else.
 */

/**
 * Split a deck string on `**...**` into an ordered list of segments.
 * String.split with a capturing group interleaves [plain, captured, plain,
 * captured, ...], so every odd index is a captured (emphasized) phrase.
 *
 * @param {string} deck  Deck copy, with at most one `**phrase**` marker.
 * @returns {{ text: string, emphasis: boolean }[]}
 */
export function parseDeckEmphasis(deck) {
  return deck
    .split(/\*\*(.+?)\*\*/g)
    .map((text, i) => ({ text, emphasis: i % 2 === 1 }))
    .filter((segment) => segment.text.length > 0)
}
