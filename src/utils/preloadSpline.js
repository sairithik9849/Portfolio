// Shared import reference so this eager preload and SplineScene's own
// React.lazy() resolve from the same module-cache entry instead of
// double-fetching the react-spline chunk.
const importSplineRuntime = () => import('@splinetool/react-spline')

// Warms the runtime's network fetch + parse ahead of the `started` gate that
// actually mounts <Spline> (see Hero.jsx / SplineScene.jsx). Importing the
// module only defines its exports — WebGL context creation and shader
// compilation happen inside the component itself once it mounts with a
// scene — so calling this early is safe: it moves the fetch/parse off the
// critical post-reveal path without pulling the real main-thread cost back
// onto the visible preloader frames.
export const preloadSplineRuntime = () => { importSplineRuntime().catch(() => {}) }

export default importSplineRuntime
