import { useTransform } from 'framer-motion'

// Shared useScroll offset every Scene*.jsx passes with its own root ref —
// the scrub window runs while the scene's top travels from 85% down the
// viewport to 15% down it, so the reveal finishes while the scene still has
// most of its own min-height left to hold as fully-visible reading time.
export const SCENE_REVEAL_OFFSET = ['start 0.85', 'start 0.15']

// Fixed band count every journey scene shares: the hero quote's three lines,
// the deck line, the featured visual, metadata, and skill chips. The chapter
// label lives in the sticky year marker now (JourneyTimeline.jsx), not in a
// scrubbed band — it's static/always-visible there, like the year beside it.
// Kept as a literal (not derived from data) so useBand is always called the
// same number of times in the same order across renders — see useSceneReveal.
const BAND_COUNT = 7

// Splits [0,1] into BAND_COUNT windows, each overlapping half of its
// neighbor's span, so consecutive bands blend into one another instead of
// popping in as discrete steps.
function bandWindow(index) {
  const step = 1 / BAND_COUNT
  const overlap = step * 0.5
  const start = Math.max(0, index * step - overlap)
  const end = Math.min(1, (index + 1) * step + overlap)
  return [start, end]
}

// One band's { opacity, y } pair — reveals across the first 60% of its
// window so it settles before the next band starts moving, then holds.
function useBand(progress, index) {
  const [start, end] = bandWindow(index)
  const mid = start + (end - start) * 0.6
  const opacity = useTransform(progress, [start, mid], [0, 1])
  const y = useTransform(progress, [start, mid], [16, 0])
  return { opacity, y }
}

/**
 * useSceneReveal — the shared scroll-scrub reveal primitive every journey
 * scene composes with. `progress` is the scene-local scrollYProgress (each
 * Scene*.jsx owns its own useScroll against its own root ref). Reveals in
 * order — quote line 1-3, deck, visual, metadata, chips — and reverses
 * symmetrically on scroll-up, since it's driven by scroll position rather
 * than a one-shot viewport trigger.
 */
export function useSceneReveal(progress) {
  const quote1 = useBand(progress, 0)
  const quote2 = useBand(progress, 1)
  const quote3 = useBand(progress, 2)
  const deck = useBand(progress, 3)
  const visual = useBand(progress, 4)
  const metadata = useBand(progress, 5)
  const chips = useBand(progress, 6)

  return {
    quoteLines: [quote1, quote2, quote3],
    deck,
    visual,
    metadata,
    chips,
  }
}
