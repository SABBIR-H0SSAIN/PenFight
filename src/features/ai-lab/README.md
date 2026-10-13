# AI Lab

`ui` contains the inspector components, algorithm descriptions and canvas drawing. `AiLab.tsx` is loaded on demand by the game runtime. `draw-tree.js` renders decision data; `descriptions.ts` provides user-facing explanations.

Search and evaluation live in `src/game/ai`, and benchmarks use its cancellable headless runner. UI consumes the published decision snapshots through the game provider; AI modules must not import inspector components or rendering helpers.
