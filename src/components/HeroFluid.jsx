import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ---- GLSL --------------------------------------------------------- */

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const frag = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uMouse;      // normalised [0,1], y=0 at top
  uniform vec2  uResolution; // canvas px

  varying vec2 vUv;

  /* ---- gradient noise ---- */
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
  }
  float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash2(i),             f            ),
          dot(hash2(i+vec2(1,0)),   f-vec2(1,0)  ), u.x),
      mix(dot(hash2(i+vec2(0,1)),   f-vec2(0,1)  ),
          dot(hash2(i+vec2(1,1)),   f-vec2(1,1)  ), u.x),
      u.y
    );
  }

  /* ---- 6-octave fractal Brownian motion ---- */
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * gnoise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float asp  = uResolution.x / uResolution.y;
    vec2  uv   = vUv;                          // [0,1]x[0,1]
    vec2  st   = vec2(uv.x * asp, uv.y);       // aspect-correct

    /* Mouse soft-repulsion: cursor pushes the noise field outward */
    vec2  mouse = vec2(uMouse.x * asp, uMouse.y);
    vec2  toM   = st - mouse;
    float md    = length(toM);
    /* manual normalize with epsilon avoids NaN when md≈0 */
    vec2  warp  = st - (toM / (md + 0.001)) * 0.07 * exp(-md * 2.6);

    /* Domain-warped fbm — two layers of warping for extra organic depth */
    float t  = uTime * 0.09;
    vec2  q  = vec2(
      fbm(warp * 1.1 + vec2(t,       t * 0.6 )),
      fbm(warp * 1.1 + vec2(t * 0.8, t * 1.2 ))
    );
    float n  = fbm(warp * 1.3 + q * 0.65 + vec2(-t * 0.4, t * 0.3));

    /* Organic blob — anchored right-of-centre, slightly high */
    vec2  blobC = vec2(asp * 0.60, 0.44);
    float bDist = length(st - blobC);
    float blob  = smoothstep(0.90, 0.0, bDist - n * 0.32);

    /* Thin topology contour lines (fract creates band pattern) */
    float bands = fract(n * 10.0);
    float topo  = pow(1.0 - abs(bands * 2.0 - 1.0), 10.0) * blob;

    /* Rim: narrow corona at the blob's organic silhouette */
    float inner = smoothstep(0.55, 0.0, bDist - n * 0.28);
    float rim   = clamp(blob - inner, 0.0, 1.0) * 2.0;

    /* Colours — design system palette */
    vec3 charcoal = vec3(0.04, 0.04, 0.04);
    vec3 midtone  = vec3(0.08, 0.10, 0.05);        /* lime-tinted dark */
    vec3 lime     = vec3(0.788, 0.961, 0.345);      /* #c9f558          */

    vec3 col = mix(charcoal, midtone, blob);
    col += lime * smoothstep(0.3, 0.8, n) * blob * 0.10;  /* inner glow   */
    col += lime * topo * 0.55;                              /* topo lines   */
    col += lime * rim  * 0.07;                              /* edge corona  */

    /* Alpha: blob fills mostly opaque, topo lines add a slight halo */
    float alpha = blob * 0.80 + topo * 0.45;
    alpha = clamp(alpha, 0.0, 0.90);

    gl_FragColor = vec4(col, alpha);
  }
`

/* ---- inner R3F mesh ---- */

function FluidMesh({ mouseRef }) {
  const { viewport, size } = useThree()
  const targetMouse = useRef(new THREE.Vector2(0.5, 0.5))

  const uniforms = useRef({
    uTime:       { value: 0.0 },
    uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
  })

  useFrame(({ clock, size: s }) => {
    uniforms.current.uTime.value = clock.getElapsedTime()
    /* flip y: DOM y=0 is top, shader/UV y=0 is bottom */
    targetMouse.current.set(mouseRef.current.x, 1.0 - mouseRef.current.y)
    /* lerp for smooth, lag-free tracking at 60 fps */
    uniforms.current.uMouse.value.lerp(targetMouse.current, 0.055)
    uniforms.current.uResolution.value.set(s.width, s.height)
  })

  return (
    /* Scale a unit plane to fill the full viewport */
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms.current}
        vertexShader={vert}
        fragmentShader={frag}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ---- exported wrapper ---- */

export default function HeroFluid({ mouseRef }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <FluidMesh mouseRef={mouseRef} />
      </Canvas>
    </div>
  )
}
