/**
 * Pure, framework-agnostic progress helpers.
 *
 * The avatar frame is driven by normalized scroll progress across the whole
 * sequence, decoupled from any per-entry/chapter concept.
 */

/**
 * Map normalized scroll progress [0, 1] to a fractional frame number.
 * Linear interpolation — no easing, no autoplay, no looping.
 * Reverse scroll naturally rewinds (progress decreases → frame decreases).
 *
 * @param {number} progress    Normalized scroll progress in [0, 1].
 * @param {number} totalFrames Total number of frames in the sequence.
 * @returns {number}           Fractional frame in [0, totalFrames - 1].
 */
export function progressToFrame(progress, totalFrames) {
  return Math.max(0, Math.min(progress * (totalFrames - 1), totalFrames - 1))
}

/**
 * Return a representative progress value for a given chapter.
 * Used for static fallbacks (reduced-motion, mobile static frames).
 *
 * @param {number} chapterIndex  Zero-based chapter index.
 * @param {number} chapterCount  Total number of chapters.
 * @returns {number}             Normalized progress at the chapter midpoint.
 */
export function chapterMidpointProgress(chapterIndex, chapterCount) {
  return (chapterIndex + 0.5) / chapterCount
}
