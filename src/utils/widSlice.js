/**
 * widSlice — pure helper for per-viz scroll-clock ranges.
 *
 * Each viz occupies a symmetric "slice" of the 0→1 progress timeline
 * centered on its snap point s = index / (n - 1), with half-width d = 1 / (n - 1).
 *
 * dissolve  trapezoid: hold at 1 for first half of the scroll gap, then
 *           crossfade over the second half — lands fully on the next viz at
 *           its snap point. dissolveIn + dissolveOut define the trapezoid:
 *             [s-d/2, s]       fade in (back half of previous segment)
 *             [s,     s+d/2]   hold at 1 (current attribute, no dissolve yet)
 *             [s+d/2, s+d]     fade out (crossfade into next attribute)
 * enter     [s-d, s]  → [0, 1]   one-directional, holds after snap
 *
 * Both arrays are clamped by useTransform — callers do not need to clamp.
 * Edge vizzes (i=0, i=n-1) have s=0 and s=1 respectively; clamp handles
 * the out-of-range side so [s-d/2] can be negative / [s+d] can exceed 1.
 */
export const widSlice = (index, n) => {
  const s = index / (n - 1)
  const d = 1 / (n - 1)
  return {
    // Trapezoid cross-dissolve — hold then fade.
    // Pass dissolveOut as the output array: useTransform(progress, dissolveIn, dissolveOut)
    dissolveIn:  [s - d / 2, s, s + d / 2, s + d],
    dissolveOut: [0, 1, 1, 0],
    // Structural enter — one-way, holds at 1
    enterIn:     [s - d, s],
    // Convenience for callers that want the snap point
    snap: s,
  }
}
