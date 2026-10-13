# Contributing

## Before making changes

1. Install the locked dependencies with `npm ci` and start `npm run dev`.
2. Choose one feature or algorithm per branch/task. If using Git, create short-lived feature branches from the main branch.
3. Read the feature README and `docs/architecture.md`. Put implementation beside the feature that owns it.
4. Update affected callers when changing shared contracts. Avoid reformatting unrelated files.

## Naming and placement

Keep code beside the feature that owns it. Use PascalCase for React component files (`Character.tsx`, `GameDialog.tsx`) and kebab-case for folders and non-component modules (`character-scene.js`, `load-pen-assets.js`). Use `.test.js` for Node tests and place shared fixtures in `tests/helpers`. Put routes and document metadata in `src/app`, screens and controls in the owning feature’s `ui` folder, React service integration in `src/features/game/runtime`, visual feature implementation in `src/features`, and framework-independent simulation services in `src/game`. Use `@/` imports across features and engine folders; use relative imports within the same folder. Keep `public` for files served directly to the browser and `docs` for maintained project documentation; do not commit generated previews, build output, or duplicate source trees.

## Boundaries to preserve

- `src/app` contains Next.js routing/layout; feature implementation belongs outside routes.
- React owns DOM elements, form values, menus, and feature mount/unmount. Use `onClick`, controlled inputs, and controller actions instead of querying IDs or injecting HTML.
- `src/features/game/runtime` owns `GameProvider`, `GameRuntime`, and `GameScene`; `src/game/state` owns the framework-independent store and persistence. `GameProvider` creates services per mounted game. Do not put game state on `window` or in module-level singletons.
- Use `useGameState(["field", ...])` to subscribe only to fields a component renders. Replace nested state objects when updating them; do not mutate published snapshots.
- `Character`, `Pen`, `Table`, and `Classroom` own their geometry. Three.js builders live in each feature’s `scene/` or `models/` directory and are imported directly; no script ordering or global factory registration is needed.
- The controller owns the animation loop and round sequence. Keep per-frame transforms out of React state. Mount the renderer before features and start simulation after features in `GameScene`.
- Physics and AI accept data and produce results. They must not import React, Three.js, DOM APIs, or UI components. Pen catalogue data is shared, but pen rendering is not.
- Release resources created by a feature during its cleanup. Use `disposeObjectTree` and `release` for shared Three.js resources, and `createScope` for browser callbacks.
- Keep actual code under `src`. `public` is reserved for static assets, not a second copy of the application.

## Extending the game

**New pen:** add metadata to `src/features/pen/catalog.js`, add its style/model builder under `src/features/pen/models`, and register the builder in `pen-models.js`. `PenKind` and menu options derive from the catalogue. Human-vs-AI must keep both players on the same model with contrasting colours. The selection and geometry regression tests automatically include catalogue entries.

**Character change:** use `scene/head.js` for face/expression, `scene/hand.js` for finger articulation, and `scene/character-scene.js` for body/IK. Keep arm lengths consistent with the rendered skeleton. `Character.tsx` accepts a slot and optional skin/shirt/pants/hair appearance props.

**Table or room change:** edit the table builder for the playable desk, or classroom builder for walls, furniture, and props. Rendering reads table width/length from the physics engine. Changes to the playable dimensions must also account for spawn positions and reach/camera assumptions.

**New AI:** add a strategy under `src/game/ai/strategies`, wire it in `algorithms.js`, add labels/presets in `catalog.js`, and add inspector prose in `src/features/ai-lab/ui/descriptions.ts`. Return an action plus inspection data. Long loops should yield through the provided slice helper so input and cancellation remain responsive. Extend the decision contract when new details are needed.

**New screen/control:** create a TSX component in `src/features/game/ui/menus` or `src/features/game/ui/controls`. Reuse `MenuPage`, `PenSelector`, `AlgorithmSelect`, and `DifficultySelect`. Add preference fields/defaults/validation if the screen needs persisted choices.

## Before submitting changes

Run `npm run check` for lint, TypeScript, regression tests, and the production build. The included GitHub Actions workflow runs the same checks for pushes and pull requests once the project is hosted there. Use `npm run format` to format source and tests. Then manually try a match, pause/resume, menu return, and the feature you changed. For rendering work also test low graphics quality and a narrow screen. For AI changes, inspect the decision and try Stop in the benchmark.

Describe what changed, where to extend it, which checks passed, and any visible limitations. Share screenshots for visual changes. Never commit `.next`, `node_modules`, or local environment files.
