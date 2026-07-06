import SceneFoundation from './SceneFoundation'
import SceneScale from './SceneScale'
import SceneLeap from './SceneLeap'
import SceneBuild from './SceneBuild'
import SceneToday from './SceneToday'

// Maps each chapter's `scene` key (src/data/journey.js) to its bespoke scene
// component. Adding a chapter means adding both a data entry and a scene
// component here — see docs/journey.md, "Extending / Swapping".
export const SCENES = {
  foundation: SceneFoundation,
  scale: SceneScale,
  leap: SceneLeap,
  build: SceneBuild,
  today: SceneToday,
}
