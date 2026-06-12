// CSS 3D isometric box loader — four cubes cycle in a Z-pattern pinwheel.
// Adapted from the 21st.dev box-loader by jatin-yadav05.
// All visuals (keyframes, face colors) live in preloader.css — this is pure structure.

export default function BoxLoader({ reduced }) {
  return (
    <div className="preloader-boxes-wrap" aria-hidden="true">
      <div className={`boxes${reduced ? ' boxes--paused' : ''}`}>
        <div className="box box-1">
          <div className="face face-front" />
          <div className="face face-right" />
          <div className="face face-top" />
          <div className="face face-back" />
        </div>
        <div className="box box-2">
          <div className="face face-front" />
          <div className="face face-right" />
          <div className="face face-top" />
          <div className="face face-back" />
        </div>
        <div className="box box-3">
          <div className="face face-front" />
          <div className="face face-right" />
          <div className="face face-top" />
          <div className="face face-back" />
        </div>
        <div className="box box-4">
          <div className="face face-front" />
          <div className="face face-right" />
          <div className="face face-top" />
          <div className="face face-back" />
        </div>
      </div>
    </div>
  )
}
