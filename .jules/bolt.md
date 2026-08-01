## 2026-08-01 - Heavy Layout Re-renders
**Learning:** `App.jsx` uses `IntersectionObserver` to track the visibility of several major sections (`heroVisible`, `whatIdoVisible`, `journeyVisible`, etc.), triggering state updates as the user scrolls. Because these heavy sections (like `Hero`, `WhatIDo`, `MyJourney`) were not memoized, they were re-rendering needlessly every time `App` state changed, triggering expensive Framer Motion layout recalculations and GSAP/WebGL reconciliations.
**Action:** When top-level layout components manage scroll-based visibility state, wrap large, static, or heavy child sections in `React.memo()` to isolate rendering costs.
## 2024-05-19 - O(N^2) Math.hypot Optimization
**Learning:** `Math.hypot` inside tight O(N^2) loops can be a significant bottleneck due to its internal complexity (e.g., handling underflow/overflow and square roots).
**Action:** When computing distances in performance-critical or O(N^2) paths, prefer calculating the squared distance directly (`dx*dx + dy*dy`) and comparing it against the squared threshold. Additionally, cache array lookups in nested loops to minimize overhead.

## 2025-02-18 - Optimize Command Lookups
**Learning:** Checking for command existence in an Array with `includes` is O(N) and can become a bottleneck during rapid keyboard input and continuous autocomplete rendering.
**Action:** Use a `Set` for static identifier lists instead of an `Array`. `Set.has()` provides O(1) existence checks, significantly reducing lookup time and minimizing React re-render overhead during high-frequency events.
