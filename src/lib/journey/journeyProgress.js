/**
 * Pure, framework-agnostic progress helpers.
 *
 * Chapter switching is driven by normalized scroll progress, not by frame
 * ranges stored in data. This keeps the UI fully decoupled from the
 * engine's internal frame count.
 */

/**
 * Map normalized scroll progress [0, 1] to an active chapter index.
 * Chapters divide the progress range evenly: chapter N occupies the band
 * [N/count, (N+1)/count). Progress 1.0 clamps to the last chapter.
 *
 * @param {number} progress     Normalized scroll progress in [0, 1].
 * @param {number} chapterCount Total number of chapters.
 * @returns {number}            Active chapter index in [0, chapterCount-1].
 */
export function progressToChapter(progress, chapterCount) {
  const raw = Math.floor(progress * chapterCount)
  return Math.min(raw, chapterCount - 1)
}

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
