import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const Spline = lazy(() => import('@splinetool/react-spline'))

// If the Spline domain is unreachable or load hangs, treat as ready after this
// delay so the reveal isn't trapped waiting for a blocked resource.
const FALLBACK_TIMEOUT_MS = 4000
const SPLINE_FADE = { duration: 0.9, ease: [0.22, 1, 0.36, 1] }

export default function SplineScene({ scene, className, onLoaded, visible = true }) {
  const [loaded, setLoaded] = useState(false)
  const onLoadedRef = useRef(onLoaded)
  const appRef = useRef(null)

  useEffect(() => {
    onLoadedRef.current = onLoaded
  })

  const handleLoaded = (app) => {
    // The FALLBACK_TIMEOUT_MS path calls this with no argument when Spline's
    // own onLoad never fires — appRef simply stays null in that case.
    if (app) appRef.current = app
    setLoaded(true)
    onLoadedRef.current?.()
  }

  // Fallback: fire after FALLBACK_TIMEOUT_MS if onLoad never fires (blocked host,
  // slow network). Satisfies the reveal gate so the user is never trapped.
  useEffect(() => {
    if (loaded) return undefined
    const t = setTimeout(handleLoaded, FALLBACK_TIMEOUT_MS)
    return () => clearTimeout(t)
  // handleLoaded is stable — intentionally omitted from deps to avoid resetting
  // the timer on every render. eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // Spline runs its own WebGL render loop for as long as the Application is
  // alive — stop()/play() pause that loop entirely while the hero is
  // scrolled out of view instead of paying for it continuously. Only ever
  // takes effect after the hero has already revealed (the hero is always
  // on-screen during preloader load), so this can't interact with the
  // preloader's ready signal.
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    if (visible) {
      if (app.isStopped) app.play()
    } else if (!app.isStopped) {
      app.stop()
    }
  // Re-check on `loaded` too — covers the rare case where the hero scrolls
  // out of view before Spline finishes loading (appRef only becomes
  // available once `loaded` flips true).
  }, [visible, loaded])

  return (
    <Suspense fallback={
      <div className="spline-loader">
        <span className="spline-loader-label">
          LOADING_3D <span className="cur" />
        </span>
      </div>
    }>
      <motion.div
        style={{ width: '100%', height: '100%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={SPLINE_FADE}
      >
        <Spline scene={scene} className={className} onLoad={handleLoaded} />
      </motion.div>
    </Suspense>
  )
}
