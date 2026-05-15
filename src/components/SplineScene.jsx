import { Suspense, lazy, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const Spline = lazy(() => import('@splinetool/react-spline'))

const FALLBACK_TIMEOUT_MS = 4000
const SPLINE_FADE = { duration: 0.9, ease: [0.22, 1, 0.36, 1] }

export default function SplineScene({ scene, className }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    const t = setTimeout(() => setLoaded(true), FALLBACK_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [loaded])

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
        <Spline scene={scene} className={className} onLoad={() => setLoaded(true)} />
      </motion.div>
    </Suspense>
  )
}
