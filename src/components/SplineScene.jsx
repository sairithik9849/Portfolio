import { Suspense, lazy } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

export default function SplineScene({ scene, className }) {
  return (
    <Suspense fallback={
      <div className="spline-loader">
        <span className="spline-loader-label">
          LOADING_3D <span className="cur" />
        </span>
      </div>
    }>
      <Spline scene={scene} className={className} />
    </Suspense>
  )
}
