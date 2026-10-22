# Scene service

`createWorld()` coordinates Three.js renderer/camera, shared scene dependencies, quality profiles, lights, effects and board/clock drawing. Feature components own room, table, character and pen geometry. The controller owns the render loop; scene cleanup must stop it before releasing resources. `dispose.js` prevents duplicate release of shared Three.js resources.

Quality profiles, automatic quality defaults, exposure, light intensity and anisotropy are in `src/config/graphics.ts`, resolved through `config.ts`. Low quality reduces pixel ratio/shadow cost; automatic quality can step down under sustained load. Runtime camera input must not reset that reduction. Wood canvases use power-of-two sizes and mipmaps; the classroom floor and wood remain matte, without window overlays or fan-cast shadows.

Run scene/furniture/camera tests and the [browser rendering checklist](../../../docs/testing.md). Headless tests build geometry and inspect material properties; actual GPU pixel output, driver behavior and sharpness require visual checks.
