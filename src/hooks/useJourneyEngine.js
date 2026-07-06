import { useRef, useEffect } from 'react'
import { ImageSequenceRenderer } from '../lib/journey/ImageSequenceRenderer'
import { chapterMidpointProgress } from '../lib/journey/journeyProgress'
import { JOURNEY } from '../data/journey'

const CHAPTER_COUNT = JOURNEY.length

/**
 * React lifecycle bridge between a scroll-progress MotionValue and the
 * ImageSequenceRenderer. This is the only place where the engine meets React.
 *
 * Contract:
 *  - Instantiates the renderer on mount; destroys on unmount.
 *  - Wires scroll progress to the renderer without React state — zero
 *    re-renders for frame changes. The avatar scrub is not tied to any
 *    active-chapter concept; it just tracks the passed-in progress value.
 *  - Wires ResizeObserver → renderer.resize().
 *  - Wires IntersectionObserver on `sectionRef` → renderer.pause()/resume()
 *    so the rAF loop stops firing ~60×/s when the section is off-screen.
 *
 * @param {import('framer-motion').MotionValue<number>} scrollYProgress - 0→1
 * @param {{ reduced?: boolean, staticProgress?: number, sectionRef?: React.RefObject }} options
 * @returns {{ canvasRef: React.RefObject<HTMLCanvasElement> }}
 */
export function useJourneyEngine(scrollYProgress, { reduced = false, staticProgress, sectionRef } = {}) {
  const canvasRef   = useRef(null)
  const rendererRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new ImageSequenceRenderer(canvas)
    rendererRef.current = renderer

    if (reduced) {
      // Reduced motion: draw one representative frame and leave it static.
      const p = staticProgress ?? chapterMidpointProgress(0, CHAPTER_COUNT)
      renderer.setProgress(p)
      // No scroll subscription — animation is frozen.
      const ro = new ResizeObserver(() => renderer.resize())
      ro.observe(canvas)
      return () => {
        ro.disconnect()
        renderer.destroy()
        rendererRef.current = null
      }
    }

    // Pause the rAF loop while the section is outside the viewport so we
    // don't burn ~60 wakeups/s during the entire page lifetime.
    // threshold:0 matches the moment any pixel is visible/invisible.
    const sectionEl = sectionRef?.current
    let io = null
    if (sectionEl) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) renderer.resume()
          else renderer.pause()
        },
        { threshold: 0 }
      )
      io.observe(sectionEl)
    }

    // Normal path: subscribe to scroll progress MotionValue.
    // `.on('change', …)` fires on every Lenis tick without React re-renders.
    const unsubscribe = scrollYProgress.on('change', (p) => {
      renderer.setProgress(p)
    })

    const ro = new ResizeObserver(() => renderer.resize())
    ro.observe(canvas)

    return () => {
      unsubscribe()
      ro.disconnect()
      io?.disconnect()
      renderer.destroy()
      rendererRef.current = null
    }
  }, [scrollYProgress, reduced, staticProgress, sectionRef])

  return { canvasRef }
}
