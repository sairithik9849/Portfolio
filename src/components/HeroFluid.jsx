import { useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ---- GLSL --------------------------------------------------------- */

const vert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const frag = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform vec2  uMouse;       // [0,1], y=0 at bottom (shader convention)
  uniform vec2  uResolution;
  uniform float uCursorActive;
  uniform vec3  uColor;       // lime accent — sourced from CSS --accent
  uniform vec3  uBg;          // deep dark  — sourced from CSS --bg

  varying vec2 vUv;

  /* Classic sin-based hash — reliable at our noise frequencies */
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  /* Smooth value noise — bicubic interpolation between random corner values */
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),                   hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  /* 5-octave fBm — per-octave rotation breaks axis-aligned grid artefacts */
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2  m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p  = m * p;
      a *= 0.5;
    }
    return v;
  }

  /* Temporal grain hash — different seed to avoid correlation with vnoise */
  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(89.42, 441.32))) * 71634.2);
  }

  void main() {
    float asp  = uResolution.x / uResolution.y;
    vec2  uv   = vUv;                                 // [0,1] x [0,1]

    /* ---- Corner mask: fluid is confined to the 4 viewport corners ----
       Each corner contributes a smooth radial falloff with radius r.
       At center (0.5, 0.5): dist to any corner ≈ 0.707 > r=0.65
       → every term = max(0, 1 - 0.707/0.65) < 0 → 0.0 → fully black.
       At exact corners: dist = 0 → contribution = 1.0.
       Cubic smoothstep sharpens the center cutoff while keeping corners rich. */
    float r    = 0.65;
    float c_tl = max(0.0, 1.0 - length(uv - vec2(0.0, 0.0)) / r);
    float c_tr = max(0.0, 1.0 - length(uv - vec2(1.0, 0.0)) / r);
    float c_bl = max(0.0, 1.0 - length(uv - vec2(0.0, 1.0)) / r);
    float c_br = max(0.0, 1.0 - length(uv - vec2(1.0, 1.0)) / r);
    float cornerMask = clamp(c_tl + c_tr + c_bl + c_br, 0.0, 1.0);
    /* Cubic ease for a crisper center fade and richer corner saturation */
    cornerMask = cornerMask * cornerMask * (3.0 - 2.0 * cornerMask);

    /* Centre the noise domain around the origin so coverage is symmetric */
    vec2  st   = (uv - 0.5) * vec2(asp, 1.0);

    /* Slow constant linear drift — always moving forward, no reversal stall.
       Speed 0.013 units/s moves ~4.7 units over 6 min; the domain offset
       (+4.3, +2.7) keeps us in a well-mapped noise region throughout. */
    float t = uTime * 0.013;

    /* ---- Mouse attractor: bend domain toward cursor ---- */
    vec2  mouse = (uMouse - 0.5) * vec2(asp, 1.0);
    vec2  toM   = mouse - st;
    float md    = length(toM);
    vec2  p     = st - toM * exp(-md * 3.5) * 0.22;

    /* Shift into a visually rich region of the infinite noise field */
    p += vec2(4.3, 2.7);

    /* ---- Double-domain-warping for n1-style organic smoke flow ---- */
    vec2 q = vec2(
      fbm(p + vec2(t,       t * 0.6 )),
      fbm(p + vec2(t * 0.8, t * 1.2 ))
    );
    float n = fbm(p + q * 0.65 + vec2(-t * 0.4, t * 0.3));

    /* ---- Color composition ---- */
    float balanced = clamp(mix(n, 0.5, 0.22), 0.26, 0.76);

    /* Base: background tinted with accent — boosted for vivid corners */
    vec3 col = mix(uBg + uColor * 0.05, uBg + uColor * 0.22, balanced);

    /* Secondary warmth layer: amber undertone adds depth in mid-range */
    vec3 uMid = uColor * 0.55 + vec3(0.14, 0.09, 0.0);
    col += uMid * smoothstep(0.35, 0.62, balanced) * 0.065;

    /* Bloom: bright peaks glow strongly in corners */
    float bloom = smoothstep(0.50, 0.72, balanced);
    col += uColor * bloom * 0.55;

    /* Mouse glow: atmospheric aura follows cursor */
    float glow = exp(-md * 2.4) * 0.55;
    col += uColor * glow * uCursorActive;

    /* Inner corner radiance: extra brightness at the very corner tips */
    float cornerTip = clamp(c_tl * c_tl + c_tr * c_tr + c_bl * c_bl + c_br * c_br, 0.0, 1.0);
    col += uColor * cornerTip * 0.18;

    /* Apply corner mask: center stays pure --bg, corners show fluid */
    col = mix(uBg, col, cornerMask);

    /* Temporal grain in corners only — breaks gradient banding */
    col += (grain(gl_FragCoord.xy * 0.01 + uTime * 0.1) - 0.5) * 0.014 * cornerMask;

    gl_FragColor = vec4(col, 1.0);
  }
`

/* ---- constants ---- */

/* Cap per-frame time advance so a hidden/frozen tab can never teleport
   the noise field on resume. 0.05 s = one 20fps frame — safe upper bound. */
const MAX_FRAME_DELTA = 0.05

/* ---- inner R3F mesh ---- */

function FluidMesh({ mouseRef, onReady }) {
  const { viewport, size } = useThree()
  const meshRef = useRef()
  const matRef  = useRef()
  const targetMouse   = useRef(new THREE.Vector2(0.5, 0.5))
  /* Accumulated shader time — clamped per-frame so no pause can teleport the
     noise field. Wall-clock clock.getElapsedTime() is intentionally NOT used. */
  const timeRef       = useRef(0)
  // Fire onReady exactly once after the first successful uniform update —
  // that's the precise moment the WebGL program is compiled/linked and the
  // first frame has drawn, which is when the sharp compile hitch is behind us.
  const readyFiredRef = useRef(false)

  const initialUniforms = useMemo(() => ({
    uTime:       { value: 0.0 },
    uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uCursorActive: { value: 0.0 },
    /* Fallback values match the CSS design system — overwritten below after mount */
    uColor:      { value: new THREE.Color('#c9f558') },
    uBg:         { value: new THREE.Color('#070707') },
  }), [size.height, size.width])

  /* Read CSS custom properties after mount — guarantees styles have painted */
  useEffect(() => {
    const css    = getComputedStyle(document.documentElement)
    const accent = css.getPropertyValue('--accent').trim()
    const bg     = css.getPropertyValue('--bg').trim()
    const materialUniforms = matRef.current?.uniforms
    if (accent) materialUniforms?.uColor.value.set(accent)
    if (bg)     materialUniforms?.uBg.value.set(bg)
  }, [])

  /* Explicit GPU resource cleanup on unmount */
  useEffect(() => {
    const material = matRef.current
    const geometry = meshRef.current?.geometry
    return () => {
      material?.dispose()
      geometry?.dispose()
    }
  }, [])

  /* R3F shader uniforms are Three-owned mutable objects updated outside React render. */
  /* eslint-disable react-hooks/immutability */
  useFrame(({ size: s }, delta) => {
    const materialUniforms = matRef.current?.uniforms
    if (!materialUniforms) return

    /* Clamp delta so returning from a hidden/frozen tab never jumps the noise
       field forward by the full idle duration (which would flash green). */
    timeRef.current += Math.min(delta, MAX_FRAME_DELTA)
    materialUniforms.uTime.value = timeRef.current
    const idleMs = performance.now() - mouseRef.current.lastMove
    const cursorTarget = idleMs < 250 ? 1 : Math.max(0, 1 - ((idleMs - 250) / 1500))
    materialUniforms.uCursorActive.value += (cursorTarget - materialUniforms.uCursorActive.value) * 0.08
    /* y-flip: DOM y=0 is top, GLSL UV y=0 is bottom */
    targetMouse.current.set(mouseRef.current.x, 1.0 - mouseRef.current.y)
    /* lerp for smooth, lag-free tracking at 60fps */
    materialUniforms.uMouse.value.lerp(targetMouse.current, 0.055)
    materialUniforms.uResolution.value.set(s.width, s.height)

    if (!readyFiredRef.current) {
      readyFiredRef.current = true
      onReady?.()
    }
  })
  /* eslint-enable react-hooks/immutability */

  return (
    <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={initialUniforms}
        vertexShader={vert}
        fragmentShader={frag}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ---- exported wrapper ---- */

export default function HeroFluid({ mouseRef, onReady }) {
  /* Pause the render loop entirely while the tab is backgrounded — prevents
     both wasted GPU work and the stale/throttled frames that can land on a
     bright-green noise frame on return. */
  const [docHidden, setDocHidden] = useState(document.hidden)

  useEffect(() => {
    const onVisibilityChange = () => setDocHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        /* z-index 0: sits beneath .grid-bg (1) and .noise (2) */
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop={!docHidden ? 'always' : 'never'}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <FluidMesh mouseRef={mouseRef} onReady={onReady} />
      </Canvas>
    </div>
  )
}
