import { SEQUENCE_CONFIG } from './sequenceConfig.js'
import { progressToFrame } from './journeyProgress.js'

/**
 * ImageSequenceRenderer
 *
 * Framework-agnostic rendering engine that plays a WebP image sequence
 * scrubbed by scroll progress on an HTML canvas. Implements the Renderer
 * contract defined in renderer.contract.js.
 *
 * Responsibilities:
 *  - Rolling decode window biased toward the current scroll direction.
 *  - Cover-fit draw preserving aspect ratio, DPR-scaled for crisp Retina output.
 *  - Internal rAF loop that draws only when the target frame changes.
 *  - Graceful fallback: if the exact target frame isn't decoded yet, the
 *    nearest decoded frame is drawn so there are no blank flashes.
 */
export class ImageSequenceRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {typeof SEQUENCE_CONFIG} config
   */
  constructor(canvas, config = SEQUENCE_CONFIG) {
    this._canvas      = canvas
    this._ctx         = canvas.getContext('2d', { alpha: false })
    this._config      = config
    /** @type {Map<number, HTMLImageElement>} frameIndex → decoded Image */
    this._cache       = new Map()
    /** @type {Set<number>} frameIndex → decode in-flight */
    this._decoding    = new Set()
    this._progress    = 0
    this._targetFrame = 0
    this._lastDrawn   = -1
    this._rafId       = null
    this._destroyed   = false
    this._paused      = false
    this._direction   = 1  // 1 = forward, -1 = backward
    // Cached canvas dimensions — updated by _applyDpr() and resize().
    // _drawFrame reads these to avoid a forced layout per frame.
    this._cw          = 0
    this._ch          = 0

    this._applyDpr()
    this._startRaf()
    // Prime the initial window around frame 0 so the first visible frame
    // is available immediately (or as soon as decode completes).
    this._primeWindow(0)
  }

  // ─── Public API (Renderer contract) ──────────────────────────────────────────

  /**
   * Receive normalized scroll progress [0, 1].
   * Updates the target frame; the rAF loop handles drawing asynchronously.
   * @param {number} progress
   */
  setProgress(progress) {
    if (this._destroyed) return
    const clamped = Math.max(0, Math.min(1, progress))
    this._direction   = clamped >= this._progress ? 1 : -1
    this._progress    = clamped
    this._targetFrame = Math.round(progressToFrame(clamped, this._config.count))
    // _primeWindow is coalesced into the rAF tick so Lenis sub-frame
    // change events don't trigger redundant eviction scans + sorts.
  }

  /**
   * Recompute the canvas backing store and redraw the current frame.
   * Call this from a ResizeObserver.
   */
  resize() {
    if (this._destroyed) return
    this._applyDpr()
    // Force a redraw by invalidating lastDrawn.
    this._lastDrawn = -1
  }

  /**
   * Suspend the rAF loop. Safe to call when the section scrolls off-screen.
   * Drawing resumes automatically on the next `resume()` call.
   */
  pause() {
    if (this._paused || this._destroyed) return
    this._paused = true
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  /**
   * Restart the rAF loop after a `pause()` call.
   * Immediately re-primes the decode window so frames are ready when visible.
   */
  resume() {
    if (!this._paused || this._destroyed) return
    this._paused = false
    this._primeWindow(this._targetFrame)
    this._startRaf()
  }

  /** Cancel rAF, disconnect, and release the image cache. */
  destroy() {
    this._destroyed = true
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    this._cache.clear()
    this._decoding.clear()
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  /**
   * Set the canvas backing store to physical pixels and reset the CTM.
   * Idempotent: calling multiple times does not accumulate scale.
   */
  _applyDpr() {
    const canvas = this._canvas
    // Clamp to 2x — a full-viewport canvas backing store at an uncapped 3x
    // DPR is ~9x the pixel count of 1x for no visible gain on a photo sequence.
    const dpr    = Math.min(window.devicePixelRatio || 1, 2)
    const w      = canvas.clientWidth
    const h      = canvas.clientHeight
    if (w === 0 || h === 0) return
    // Cache the CSS dimensions so _drawFrame can read them without a
    // per-frame forced layout (clientWidth/Height trigger style flush).
    this._cw = w
    this._ch = h
    canvas.width  = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    // setTransform resets the CTM completely, then scales up so subsequent
    // draw calls use CSS pixel coordinates.
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  _startRaf() {
    const tick = () => {
      if (this._destroyed) return
      if (this._targetFrame !== this._lastDrawn) {
        // _primeWindow is coalesced here so Lenis sub-frame change events
        // (multiple per rAF cycle) don't trigger redundant eviction scans.
        this._primeWindow(this._targetFrame)
        this._drawFrame(this._targetFrame)
      }
      this._rafId = requestAnimationFrame(tick)
    }
    this._rafId = requestAnimationFrame(tick)
  }

  /**
   * Draw `frameIndex` to the canvas using a cover-fit strategy.
   * Falls back to the nearest decoded frame if the exact frame isn't ready.
   */
  _drawFrame(frameIndex) {
    const img = this._getNearestDecoded(frameIndex)
    if (!img) return  // nothing decoded yet — will retry on the next rAF tick

    const ctx = this._ctx
    // Use cached dimensions from _applyDpr() — avoids a forced layout read
    // (clientWidth/clientHeight flush style if layout is dirty) on every frame.
    const cw  = this._cw
    const ch  = this._ch
    if (cw === 0 || ch === 0) return

    const iw = img.naturalWidth
    const ih = img.naturalHeight
    if (iw === 0 || ih === 0) return

    // Cover-fit: scale so the image fills the canvas, clipped at edges.
    const scale = Math.max(cw / iw, ch / ih)
    const dw    = iw * scale
    const dh    = ih * scale
    // Center horizontally. The avatar's visual weight sits naturally in the
    // right half of the frames, so centered cover-fit aligns it correctly.
    const dx    = (cw - dw) / 2
    const dy    = (ch - dh) / 2

    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, dx, dy, dw, dh)
    this._lastDrawn = frameIndex
  }

  /**
   * Return the nearest decoded image to `frameIndex`.
   * Searches outward in both directions, bias toward scroll direction first.
   */
  _getNearestDecoded(frameIndex) {
    if (this._cache.has(frameIndex)) return this._cache.get(frameIndex)

    const { count } = this._config
    for (let offset = 1; offset < count; offset++) {
      // Prefer the direction of travel for the fallback as well.
      const fwd  = frameIndex + offset * this._direction
      const back = frameIndex - offset * this._direction
      if (fwd >= 0 && fwd < count && this._cache.has(fwd))   return this._cache.get(fwd)
      if (back >= 0 && back < count && this._cache.has(back)) return this._cache.get(back)
      // Stop once both directions are out of bounds.
      if ((fwd < 0 || fwd >= count) && (back < 0 || back >= count)) break
    }
    return null
  }

  /**
   * Maintain the rolling decode window around `center`.
   * Frames within ±decodeWindow are decoded asynchronously.
   * Frames outside the window are evicted to bound memory usage.
   */
  _primeWindow(center) {
    const { count, decodeWindow, basePath, pad, ext } = this._config
    const lo = Math.max(0, center - decodeWindow)
    const hi = Math.min(count - 1, center + decodeWindow)

    // Evict frames outside the rolling window.
    for (const [idx] of this._cache) {
      if (idx < lo || idx > hi) this._cache.delete(idx)
    }

    // Collect frames that need decoding, in priority order biased by direction.
    const needed = []
    for (let i = lo; i <= hi; i++) {
      if (!this._cache.has(i) && !this._decoding.has(i)) needed.push(i)
    }
    // Sort: frames closest to center decode first, direction-biased.
    needed.sort((a, b) => {
      const da = Math.abs(a - center) - (a - center) * this._direction * 0.01
      const db = Math.abs(b - center) - (b - center) * this._direction * 0.01
      return da - db
    })

    for (const idx of needed) {
      this._scheduleDecodeFrame(idx, basePath, pad, ext)
    }
  }

  _scheduleDecodeFrame(idx, basePath, pad, ext) {
    if (this._decoding.has(idx) || this._cache.has(idx)) return
    this._decoding.add(idx)
    const n   = String(idx + 1).padStart(pad, '0')
    const img = new Image()
    img.src   = `${basePath}${n}${ext}`
    img
      .decode()
      .then(() => {
        if (!this._destroyed) this._cache.set(idx, img)
      })
      .catch(() => {
        // Decode failures are silent — _getNearestDecoded falls back to
        // adjacent frames. The failed frame is simply never cached.
      })
      .finally(() => {
        this._decoding.delete(idx)
      })
  }
}
