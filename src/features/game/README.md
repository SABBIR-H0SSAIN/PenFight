# Game application

`ui` owns the DOM interface: `GameCanvas`, `GameHeader`, HUD, feedback, dialogs, controls and menu screens. Shared selectors live in `ui/controls`; each mode/settings screen lives in `ui/menus`. Game styles live beside these components and are imported in their existing order by `src/app/globals.css`.

`runtime` connects React to the simulation services:

- `GameProvider.tsx` creates an independent engine, renderer, sound service and UI store for each mounted game, and exposes selected subscriptions and preferences.
- `GameRuntime.tsx` composes the interface and loads AI Lab on demand.
- `GameScene.tsx` mounts the renderer and 3D feature components before starting the match controller.

Simulation, AI, physics, the renderer, and persistence remain in `src/game`. Use controller actions for user events and `useGameState` for snapshots; keep animation-frame transforms inside the controller and scene handles.
