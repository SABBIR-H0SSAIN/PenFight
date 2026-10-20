# Game configuration

`config.ts` is the single entry point that **combines separate configuration files**. Edit the owning section file below, or optionally override it from a root `.env.local` file. No environment variables are required. Internal mesh dimensions, collision tolerances, and animation keyframes remain implementation details in their feature modules.

| Section             | Configurable defaults                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings`          | Player name, volume, ambience, quality, table surface, follow camera, replays, slow motion, FPS, aim guide, friction, realism                  |
| `preferences`       | Pens and custom colours for every mode, difficulty, training algorithm, AI battle algorithms/accuracy/speed, local player names and match goal |
| `matches`           | Versus/training/AI battle goals, opponent display name                                                                                         |
| `camera`            | Four presets, portrait framing, default zoom/pin state, orbit radius, horizontal/vertical desk fit                                             |
| `input`             | Pen safety radii, drag threshold, rotation/tilt sensitivity, pinch threshold, trackpad zoom sensitivity                                        |
| `physics`           | Gravity, flick speed, spin strength, integration step, surge multiplier, simulation duration                                                   |
| `playback`          | Recording interval, impact slow motion window/rate, highlight timing                                                                           |
| `ai`                | Algorithm labels, difficulties/noise/mistakes/think time, search budgets, cooperative time slices, benchmark seed/budget                       |
| `pens`, `penColors` | Pen balance, dimensions, materials/descriptions, colours and custom palettes                                                                   |
| `audio`             | Recording paths, impact variations, material profiles, ambience gains/cutoffs, voice limit                                                     |
| `graphics`          | Automatic quality, mobile breakpoint, exposure, anisotropy, pixel ratios, shadow resolutions, light intensities                                |

`CONFIG_LIMITS` in `limits.ts` centralizes supported control ranges and menu choices. These are code-level constraints shared by validation, controls, and the engine; they are not environment overrides. Keep the documented limits and validation rules aligned if extending them.

## Optional environment file

Copy `.env.example` to `.env.local` at the repository root and uncomment the settings you want:

```dotenv
NEXT_PUBLIC_GAME_VOLUME=0.5
NEXT_PUBLIC_GAME_DIFFICULTY=beginner
NEXT_PUBLIC_GAME_VS_GOAL=5
NEXT_PUBLIC_GAME_CAMERA_ZOOM=1.1
```

The example file lists all individual variables with their defaults. Volume uses `0–1`, friction `0.8–1.1`, zoom `0.5–2`; booleans use `true` or `false`. Quality is `auto`, `low`, `medium`, or `high`; surfaces are `oak`, `maple`, or `walnut`. `DEFAULT_PEN` and `DIFFICULTY` affect versus and training defaults; use the JSON option below for other modes.

Any supported field in `defaultGameConfig` can instead be overridden through `NEXT_PUBLIC_GAME_CONFIG`, using **valid JSON** with the same nested shape:

```dotenv
NEXT_PUBLIC_GAME_CONFIG='{"preferences":{"ai":{"a":"fuzzy","b":"mcts","speed":4},"pvp":{"name1":"Alex","goal":5}},"camera":{"presets":{"overview":{"azimuth":20,"elevation":70}}},"input":{"penSafetyTouch":48},"ai":{"budgets":{"mcts":{"iters":2000}}},"audio":{"ambience":{"fan":{"gain":0.05}}}}'
```

Only supplied fields change. Numeric values must be finite and within the ranges defined in `validation.ts`; enum values must be supported. Wrong types, unknown keys, malformed JSON and invalid values keep their fallback without interrupting the game. Palette/contact arrays must retain their original length; custom colour maps accept known pen IDs and six-digit hex colours. Shadow and wood-texture sizes must be powers of two. Camera radius and tilt are constrained to keep the view below the classroom fixtures.

All of these variables are **public**, bundled into the browser at build time. Restart `npm run dev` after changing the file; for production, rebuild with the desired variables before `npm start`. Changing variables only when starting an already built server does not update browser configuration. Do not use this configuration for secrets. Next.js loads root `.env*` files automatically; standalone Node scripts must supply environment variables themselves (or use `@next/env`).

## Precedence and saved choices

Code defaults → JSON overrides → individual environment variables → saved player settings/preferences → current in-game changes.

Invalid higher-priority values preserve the last valid fallback. Saved player preferences intentionally survive configuration updates. To try new defaults in an existing browser, clear this site's `pfa.settings`, `pfa.preferences`, and legacy `pfa.pen`, `pfa.matadorPenColors`, `pfa.pvpNames` local-storage entries, or open a fresh browser profile. Physics, graphics, camera, and other tuning without a saved UI preference applies directly.

Consumers import the resolved `gameConfig` from `config.ts`; the old pen, AI, and audio catalogues re-export its values for compatibility. `env.ts` handles validated merging without browser dependencies. `createGameConfig` is a pure resolver for tests and tooling. Each UI store clones its player preferences so separate games cannot mutate each other's defaults.

## File map and extension workflow

Each section has its own defaults file: `settings.ts`, `preferences.ts`, `matches.ts`, `camera.ts`, `input.ts`, `physics.ts`, `playback.ts`, `ai.ts`, `pens.ts` (also custom palettes), `audio.ts`, and `graphics.ts`. `config.ts` combines these sections without duplicating their values. `limits.ts` holds supported ranges/menu choices; `validation.ts` holds override rules; `environment.ts` maps individual public variables; `env.ts` implements safe merging.

For example, edit `input.ts` to change touch protection, `camera.ts` to change the default board view, or `ai.ts` to change search budgets. Add new fields in the owning section and extend `validation.ts`; add any individual alias in `environment.ts` and `.env.example`. Keep raw section modules independent of resolved `gameConfig` to avoid initialization cycles. The section default objects are templates; use `createGameConfig()` to get an independent copy.

`config.test.js` exercises real environment variables through engine/store/match consumers. `config-boundaries.test.js` checks every numeric field's endpoints, integer constraints, finite values, all enum alternatives and boolean coercion. Playback tests cover 30/60/120 Hz sampling independently of the physics step. AI think time `0` means no artificial thinking delay. See [Testing](../../docs/testing.md).

To start new matches with the view pinned, set `defaultPinned: true` in `camera.ts`, or use `NEXT_PUBLIC_GAME_CONFIG='{"camera":{"defaultPinned":true}}'` in the root environment file. Pin state is local to the current match and is not saved as a browser preference.

## AI algorithm limits

Edit `ai.ts` → `budgets` to tune each algorithm independently. These fields also
support the existing `NEXT_PUBLIC_GAME_CONFIG` JSON override.

| Algorithms      | Options (default)                                         | Meaning / supported range                                                        |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| DFS, DLS, IDDFS | `depthLimit: 4`, `leafBudget: 90`, `goal: 0.5`            | Depth 0–4; leaf evaluations 15–1000; goal probability 0–1                        |
| Best-first, A*  | `depthLimit: 4`, `evalBudget: 110 / 130`, `goal: 2/3`     | Depth 0–4; evaluations 15–1000; goal probability 0–1                             |
| Minimax         | `depth: 2`, `beam: 8`, `maxVisibleNodes: 260`             | Lookahead 1–4 moves; root shortlist 1–16; recorded nodes 1–2000                  |
| MCTS            | `depth: 3`, `rolloutDepth: 1`, `iters: 3000`, `rootK: 24` | Tree depth 1–5; extra rollout moves 0–5; iterations 1–10000; root shortlist 1–64 |
| MCTS            | `c: 0.8`, `pickVisits: false`, `maxVisibleNodes: 420`     | Exploration 0.01–3; select by visits instead of reward; recorded nodes 1–2000    |
| Fuzzy           | No search budget                                          | Chooses using fuzzy rules without a search tree                                  |

Depth in a shot-action tree counts target → angle → power → spin, not future
turns. A depth below four cannot reach a complete action, so these searches
report a cutoff and simulate a fixed fallback shot. IDDFS increases its limit
from zero up to `depthLimit`. Minimax and MCTS depth counts future moves.
`maxVisibleNodes` only limits the tree recorded for the AI lab; search continues
at its configured depth and budget. The renderer fits all recorded depths.

For example:

```dotenv
NEXT_PUBLIC_GAME_CONFIG='{"ai":{"budgets":{"dfs":{"depthLimit":4,"leafBudget":120},"minimax":{"depth":3,"beam":6},"mcts":{"depth":4,"rolloutDepth":2,"iters":2000,"maxVisibleNodes":600}}}}'
```

Larger lookahead and rollout settings increase simulation time. A decision's
`budgetScale` scales iteration/evaluation counts; it does not scale depth.
