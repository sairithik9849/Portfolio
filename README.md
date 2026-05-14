# Sairithik Komuravelly Portfolio

High-performance, animation-heavy developer portfolio built with React and Vite.

This site is designed to showcase systems engineering work with a premium frontend experience, including:

- Framer Motion interaction design
- WebGL background fluid simulation (Three.js via React Three Fiber)
- Spline 3D hero scene
- AI assistant drawer powered by a Vercel serverless function and Google Gemini

## Tech Stack

- React 19
- Vite 8
- Framer Motion
- Three.js, @react-three/fiber, @react-three/drei
- @splinetool/react-spline, @splinetool/runtime
- Vercel Serverless Functions (`/api/chat.js`)
- ESLint 10 (flat config)


## Performance Notes

- Heavy 3D components are lazy-loaded to reduce initial bundle cost.
- Motion favors `transform` and `opacity` for smooth 60fps interactions.
- Content is centralized in `src/data` to keep components focused on rendering.
