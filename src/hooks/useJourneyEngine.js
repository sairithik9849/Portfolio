import { useRef, useState, useEffect } from 'react'
import { ImageSequenceRenderer } from '../lib/journey/ImageSequenceRenderer'
import { progressToChapter, chapterMidpointProgress } from '../lib/journey/journeyProgress'
import { JOURNEY } from '../data/journey'

const CHAPTER_COUNT = JOURNEY.length

/**
 * React lifecycle bridge between a scroll-progress MotionValue and the
 * ImageSequenceRenderer. This is the only place where the engine meets React.
 *
 * Contract:
 *  - Instantiates the renderer on mount; destroys on unmount.
 *  - Wires scroll progress to the renderer without React state (zero re-renders
 *    for frame changes).
 *  - The only intentional re-render: when the active chapter index changes
 *    at a chapter boundary crossing.
 *  - Wires ResizeObserver → renderer.resize().
 *
 * @param {import('framer-motion').MotionValue<number>} scrollYProgress - 0→1
 * @param {{ reduced?: boolean, staticProgress?: number }} options
 * @returns {{ canvasRef: React.RefObject<HTMLCanvasElement>, activeIndex: number }}
 */
export function useJourneyEngine(scrollYProgress, { reduced = false, staticProgress } = {}) {
  const canvasRef       = useRef(null)
  const rendererRef     = useRef(null)
  const activeIndexRef  = useRef(0)  // guard: skip setState when index unchanged
  const [activeIndex, setActiveIndex] = useState(0)

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

    // Normal path: subscribe to scroll progress MotionValue.
    // `.on('change', …)` fires on every Lenis tick without React re-renders.
    const unsubscribe = scrollYProgress.on('change', (p) => {
      renderer.setProgress(p)
      const next = progressToChapter(p, CHAPTER_COUNT)
      if (next !== activeIndexRef.current) {
        activeIndexRef.current = next
        setActiveIndex(next)
      }
    })

    const ro = new ResizeObserver(() => renderer.resize())
    ro.observe(canvas)

    return () => {
      unsubscribe()
      ro.disconnect()
      renderer.destroy()
      rendererRef.current = null
    }
  }, [scrollYProgress, reduced, staticProgress])

  return { canvasRef, activeIndex }
}
