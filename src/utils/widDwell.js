/**
 * widDwell — plateau transfer function for the What I Do scroll clock.
 *
 * Maps a linear scroll progress p ∈ [0,1] onto a shaped output that is flat
 * (dwelling) near each word's snap point and eases quickly through the
 * inter-word transition. The result: the active word holds in the band for a
 * deliberate beat before the stack slides to the next.
 *
 * Snap points are fixed points of the function:
 *   widDwell(i / (n-1), n) === i / (n-1)   for all i ∈ [0, n-1]
 * This means widSlice input ranges and click-target scroll positions need no
 * adjustment — they continue to work against the shaped progress unchanged.
 *
 * @param {number} p    - linear scroll progress [0,1]
 * @param {number} n    - number of words (e.g. 5)
 * @param {number} hold - fraction [0,1) of each inter-word segment spent flat.
 *                        0.5 means half the scroll range per segment is a dwell;
 *                        the remaining half is the eased transition.
 * @returns {number} shaped progress [0,1]
 */
const smoothstep = t => t * t * (3 - 2 * t)

export const widDwell = (p, n, hold = 0.5) => {
  if (n <= 1) return p

  const seg = 1 / (n - 1)

  // Which inter-word segment are we in? Clamp so p=1.0 maps to last segment.
  const k     = Math.min(Math.floor(p / seg), n - 2)
  const local = (p - k * seg) / seg  // position within the k-th segment [0,1]

  // Each segment has a flat hold at the start (exit of word k) and end (entry
  // of word k+1). Each flat zone is hold/2 of the total segment.
  const h = hold / 2

  let t
  if      (local <= h)       t = 0
  else if (local >= 1 - h)   t = 1
  else                       t = smoothstep((local - h) / (1 - 2 * h))

  return (k + t) * seg
}
