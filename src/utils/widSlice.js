/**
 * widSlice — pure helper for per-viz scroll-clock ranges.
 *
 * Each viz occupies a symmetric "slice" of the 0→1 progress timeline
 * centered on its snap point s = index / (n - 1), with half-width d = 1 / (n - 1).
 *
 * dissolve  [s-d, s, s+d] → [0, 1, 0]  full triangle, no blank gap
 * enter     [s-d, s]       → [0, 1]     one-directional, holds after snap
 *
 * Both arrays are clamped by useTransform — callers do not need to clamp.
 * Edge vizzes (i=0, i=n-1) have s=0 and s=1 respectively; clamp handles
 * the out-of-range side so [s-d] can be negative / [s+d] can exceed 1.
 */
export const widSlice = (index, n) => {
  const s = index / (n - 1)
  const d = 1 / (n - 1)
  return {
    // Triangle cross-dissolve input range
    dissolveIn:  [s - d, s, s + d],
    // Structural enter — one-way, holds at 1
    enterIn:     [s - d, s],
    // Convenience for callers that want the snap point
    snap: s,
  }
}
