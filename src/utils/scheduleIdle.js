// requestIdleCallback is absent in iOS Safari (WebKit ships it behind an
// off-by-default flag), so a `setTimeout(cb, 0)` fallback defers nothing —
// it just runs on the next macrotask, on top of the work it was meant to
// avoid. `fallbackDelay` is a real wait for those browsers; `timeout` stays
// the idle ceiling where the API exists.
const hasIdle = typeof requestIdleCallback === 'function'

export const scheduleIdle = (cb, { timeout, fallbackDelay }) => (
  hasIdle ? requestIdleCallback(cb, { timeout }) : setTimeout(cb, fallbackDelay)
)

export const cancelScheduledIdle = (id) => (
  hasIdle ? cancelIdleCallback(id) : clearTimeout(id)
)
