/**
 * JourneyStage — canvas background layer + gradient scrim.
 *
 * Owns the <canvas> element (the ref is managed by useJourneyEngine and
 * passed in). The scrim layer always sits between canvas and foreground text,
 * guaranteeing readability regardless of the underlying animation source.
 * Both layers are aria-hidden (purely decorative).
 */
export default function JourneyStage({ canvasRef }) {
  return (
    <div className="journey-stage" aria-hidden="true">
      {/* Canvas: filled by ImageSequenceRenderer via canvasRef */}
      <canvas
        ref={canvasRef}
        className="journey-canvas"
        aria-hidden="true"
      />
      {/* Scrim: left-to-right gradient from --bg to transparent.
          Ensures the left text column is legible over any animation frame.
          A secondary top-gradient protects against bright frames at the top. */}
      <div className="journey-scrim" />
    </div>
  )
}
