# Architecture

## Composition and data flow

```text
App Router page (server)
  GameCanvas (client, fullscreen, lazy loading)
    GameRuntime
      GameProvider — one engine, renderer, sound service, UI store, controller
        GameScene
          Renderer → Classroom → Table → Pen × 2 → Character × 2 → Simulation
        HUD / controls / feedback / menus / dialogs / lazy AI Lab

React event → controller action → physics / AI → scene handles
                                      ↓
                              immutable UI snapshot → selected React subscribers
```

`GameScene` deliberately mounts its layout effects in this order. Renderer initializes the WebGL scene, feature components add their own objects, and Simulation starts the controller once the required models exist. A pen exposes model/state setters; a character exposes its animation rig. Both player slots are required by this two-player game.

Before mounting these components, `GameScene` loads the Matador GLB through the pen feature's cached asset loader. Each player receives independent cloned resources, preserving the supplied cap and printed textures while allowing different barrel colours.

The scene components render into a shared Three.js canvas. They return no DOM, because their visible output consists of Three.js objects. Character, classroom, and table builders live under their feature’s `scene` directory; pen asset and mesh builders live under `features/pen/models`. React props control appearance and initial pen selection; the match controller drives pen transforms and the selected match models through registered handles.

## Why this Three.js integration

The existing custom hand IK, physics playback, and camera animations already operate on Three.js objects. The project uses the installed `three` package directly and matching `@types/three`, with React managing ownership and cleanup. This preserves those algorithms without adding a second render loop. Three.js is pinned to the version used by these materials and lighting APIs; upgrading it should be a separate change with visual checks.

Geometry and simulation helpers are JavaScript ES modules. Public component props, state, and integration handles use TypeScript. `typecheck` checks TS/TSX and their declared integration contracts; it does not claim full static checking of the JavaScript engine. ESLint checks JavaScript for undefined names, and headless tests execute the builders and algorithms.

## State and performance

`GameProvider` allocates independent services per mounted game. The mutable high-frequency simulation state stays inside `createController`; the external UI store contains immutable snapshots. `useGameState(keys)` caches a selected snapshot and returns the same object until one of those keys changes. Updating flick power therefore does not invalidate a scoreboard or menu subscription. A frame updates Three.js transforms directly. AI inspection snapshots are throttled and copied only while the lab is open.

`GameCanvas` uses `next/dynamic` with browser-only rendering for the heavy game bundle. The server still renders the application shell and loading state. AI Lab is another dynamic component loaded when opened. Pen builders cache textures and keep the same model across rounds when its model and colour are unchanged. Classroom LOD/background resources and graphics-quality settings remain in use. Wood canvases use power-of-two dimensions and hardware-limited anisotropy with mipmaps. Floor and bench materials stay matte; windows and rotating fans do not project patterned shadows.

## Lifetimes

`createScope` owns animation frames, event listeners, timeouts, and intervals. Disposal resolves pending frame waits so asynchronous loops can exit. Match cancellation uses a token to reject work belonging to an older match. The benchmark runner has its own cancellation token.

The renderer cleanup stops the controller before disposing the scene. Feature cleanup removes geometry, materials, textures, and environment maps. `release` uses a weak set to prevent duplicate disposal of shared resources. This supports development remounts and route changes without accumulating independent game loops or audio contexts.

## File boundaries

- **React integration:** `src/features/game/runtime` owns the provider, runtime surface, and scene composition.
- **Menus and controls:** `src/features/game/ui`; mode screens in `ui/menus` and selectors in `ui/controls`. Controlled React UI; no injected markup.
- **Character:** body/IK, head/expression and hand/finger modules in `src/features/character/scene`.
- **Configuration:** section defaults, optional public environment overrides, limits and validation in `src/config`; `config.ts` composes the resolved `gameConfig`.
- **Pen:** compatibility catalogue/types in `src/features/pen`, DOM controls in `ui`, and mesh builders in `models`.
- **Table:** the playable desk and wood texture in `src/features/table/scene`.
- **Classroom:** room architecture and props in `src/features/classroom/scene`; reusable desk/chair geometry and wood materials in `src/features/furniture/scene`.
- **AI Lab:** React presentation, canvas drawing, and explanatory copy in `src/features/ai-lab/ui`; algorithms and benchmarks in `src/game/ai`. The AI installer delegates scoring to `evaluation.js`, search context to `context.js`, and headless matches to `match.js`. AI modules do not import presentation code or browser rendering APIs.
- **UI state:** framework-independent store, snapshots, preferences, and persistence in `src/game/state`.
- **Simulation:** physics in `src/game/physics`; coordination, input and match modes in `src/game/controller`.
- **Rendering service:** common lighting, effects, board rendering and camera access in `src/game/scene`.

Shared interface styles retain their established cascade in `src/features/game/ui/game.css`; pen colour controls are colocated in `src/features/pen/ui/pen.css`. Keep visual-only changes out of physics modules. Characters use procedural geometry without external head scans or skin textures.

`GameDialog.tsx` owns the shared notebook dialog and keyboard focus handling; responsive HUD and dialog corrections live in `src/features/game/ui/game-ui.css`. `src/game/controller/playback.js` defines the single brief impact slowdown and cropped highlight window. Character reach easing and wrist constraints live in `src/features/character/motion.js`; articulated geometry and fixed-length arm IK remain in `src/features/character/scene`.

Use feature folders to establish ownership. Place DOM screens/controls and their styles in `ui`, React service composition in the game feature’s `runtime`, and 3D geometry in the visual feature’s `scene` or `models`. Keep reusable simulation services in `src/game`; these folders do not import React or Next.js. The controller, renderer, persistence, and audio services may use browser APIs, while physics and AI remain headless. Import directly from the owning module so the lazily loaded AI Lab stays separate from the game bundle.

## Configuration and persistence

`src/config/config.ts` merges independent settings, preferences, match, camera, input, physics, playback, AI, pen, audio, and graphics modules. `environment.ts` reads explicit public aliases; `env.ts` applies validated partial JSON and alias overrides according to `validation.ts`. Unsupported fields/types/ranges retain their fallback. Raw defaults and schema have no DOM dependencies, so physics and AI can still run headlessly. Existing catalogues re-export resolved data for compatibility.

Precedence is section defaults → `NEXT_PUBLIC_GAME_CONFIG` JSON → individual public variables → saved browser settings/preferences → in-game changes. UI stores clone their preferences. Hydration validates saved strings without coercing arrays into IDs or colours; legacy storage can override defaults only when present. All public environment values are captured during the Next.js build; production changes require rebuilding. See the [configuration guide](../src/config/README.md).

## Input and playback

The controller projects both pen barrels to CSS-pixel capsules before deciding between aiming and orbiting. A protected opponent-pen press cannot become an orbit. Aim power measures drag from the press position so a nearby tap cannot fire. Two tracked pointers cancel aim/orbit and start pinch zoom; an extra finger is ignored. The remaining pinch finger is blocked from orbiting until all tracked fingers lift. Trackpad wheel and Safari gesture events share the same bounded zoom action.

Pause, settings, blur, viewport changes, lost capture, menu return and disposal cancel owned gestures. Camera pose stays fixed while aiming; manual camera input disables Follow, and Follow can be re-enabled. Playback binary-searches recorded physics timestamps, including uneven and duplicate final samples, rather than assuming a fixed recording interval. Impact slowdown and highlight windows read the playback section. See [Testing](testing.md) for coverage and device checks.

Camera pinning freezes the exact rendered pose, including a transition or Follow pose, and disables manual/automatic camera motion while preserving pen aiming. The camera panel exposes an accessible Pin view/Pinned toggle; Follow and view controls are disabled while pinned. Resize can update desk framing without rotating the pinned view. Pause/settings and subsequent rounds retain it; menu return/new matches reset it. `src/config/camera.ts` can set `defaultPinned` for new matches. `tests/camera-pin.test.js` covers gestures, follow/replay/turn changes, aiming, cleanup and default pinning.
