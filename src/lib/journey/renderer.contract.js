/**
 * @typedef {Object} Renderer
 * Contract that all journey renderers must satisfy.
 *
 * React/UI code depends only on this interface — never on implementation
 * details such as frame indices, image elements, or canvas APIs. Swapping
 * the underlying source (WebP sequence → WebM video → Three.js scene) means
 * writing a new Renderer class and updating the `useJourneyEngine` instantiation
 * line. Nothing in the UI layer (MyJourney.jsx, JourneyTimeline.jsx,
 * JourneyMobile.jsx) needs to change.
 *
 * @property {(progress: number) => void} setProgress
 *   Receive the normalized scroll progress in [0, 1].
 *   Implementations map it to their internal timeline/frame/position.
 *   Called on every scroll event — must be cheap.
 *
 * @property {() => void} resize
 *   Called when the host container changes dimensions.
 *   Implementations should recompute backing-store size and redraw current state.
 *
 * @property {() => void} destroy
 *   Tear down all internal state: cancel rAF, disconnect observers, release cache.
 *   Called exactly once when the host React component unmounts.
 */
