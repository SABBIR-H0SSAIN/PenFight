# Game application

`ui` owns the DOM interface: `GameCanvas`, `GameHeader`, HUD, feedback, dialogs, controls and menu screens. Shared selectors live in `ui/controls`; each mode/settings screen lives in `ui/menus`. Game styles live beside these components and are imported in their existing order by `src/app/globals.css`.

`runtime` connects React to the simulation services:

- `GameProvider.tsx` creates independent engine, renderer, sound and UI services. Its client-only initialization validates saved preferences before any feature builds meshes, so a saved finish is constructed directly. It exposes selected subscriptions and preferences.
- `GameRuntime.tsx` composes the interface and loads AI Lab on demand.
- `GameScene.tsx` mounts the renderer and 3D feature components before starting the match controller.

Simulation, AI, physics, the renderer, and persistence remain in `src/game`. Use controller actions for user events and `useGameState` for snapshots; keep animation-frame transforms inside the controller and scene handles.

`GameMenu.tsx` turns notebook sheets around the fixed binding when changing menu views, and reverses the turn when returning to the main page. The extra sheet exists only during the CSS transform: 220 ms on compact/touch screens, 280 ms on desktop. `notebook-pages.css` owns the paper back, curl and shadows; compact turns retain the 3D sheet and cast shadow with fewer decorative layers. Turning faces clip their painted content to the visible paper. One duration controls the sheet, effects and interruption fallback. While `menuTurning` is true and the menu is visible, the controller keeps the last classroom frame on screen instead of competing with CSS for GPU time. Timestamps still advance and gameplay rendering resumes immediately when the menu closes. Inactive sheet controls are inert and hidden from assistive technology. Animation completion immediately restores focus; interruption has a cleanup fallback 50 ms after the expected finish, and reduced-motion preferences skip the turn. Scrolling belongs to the page content so the binding stays fixed.

Canvas input uses a screen-space capsule around each pen with a 28px mouse/stylus margin and a 40px touch margin. Presses near either pen cannot start an orbit; the active pen can aim, and nearby taps do not fire without dragging. Single-pointer drags starting elsewhere orbit the desk.

Two touch pointers pinch the existing 50–200% zoom without changing rotation or tilt. Starting a pinch cancels aiming safely, ignores extra fingers, and suppresses one-finger orbiting until the pinch has ended. Ctrl+wheel trackpad pinches and Safari gesture events use the same zoom limits. Pause, resize, cancellation and disposal release pointer capture and clear gesture state.

These are configurable defaults in `src/config/input.ts` and constraints in `limits.ts`; `camera.ts` owns presets/framing/default zoom. `config.ts` merges them with optional env overrides. Settings, mode preferences and match goals have separate section files. Human-vs-AI uses the configured display name `AI` by default. The toolbar keeps camera controls behind an icon, and Follow can be restored after manual control. The header and main menu share `BrandLogo.tsx` and local assets in `public/brand/`.

Controller, gesture, camera, preference and configuration suites exercise these flows without WebGL. Those checks do not replace native browser layout/accessibility/gesture checks; see [Testing](../../../docs/testing.md).

Camera pinning freezes the exact rendered pose, including a transition or Follow pose, and disables manual/automatic camera motion while preserving pen aiming. The camera panel exposes an accessible Pin view/Pinned toggle; Follow and view controls are disabled while pinned. Resize can update desk framing without rotating the pinned view. Pause/settings and subsequent rounds retain it; menu return/new matches reset it. `src/config/camera.ts` can set `defaultPinned` for new matches. `tests/camera-pin.test.js` covers gestures, follow/replay/turn changes, aiming, cleanup and default pinning.
