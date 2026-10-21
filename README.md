<h1 align="center">Pen Fight Arena</h1>

<p align="center">
  The classroom game of pen fight, rebuilt in 3D with AI opponents.
</p>

<p align="center">
  <a href="package.json"><img src="https://img.shields.io/badge/Next.js-16.4-000000?style=flat-square&amp;logo=nextdotjs&amp;logoColor=white" alt="Next.js 16.4" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/React-19.3-149ECA?style=flat-square&amp;logo=react&amp;logoColor=white" alt="React 19.3" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript 5.9" /></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Three.js-0.128-000000?style=flat-square&amp;logo=threedotjs&amp;logoColor=white" alt="Three.js 0.128" /></a>
</p>

<p align="center">
  <a href="#getting-started">Getting started</a> ·
  <a href="#game-modes">Game modes</a> ·
  <a href="#ai-algorithms">AI algorithms</a> ·
  <a href="docs/architecture.md">Architecture</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

Two pens share a desk. Players take turns flicking their pen to knock the other one off. The round ends when a pen falls; there is no flick limit or centre-position tiebreaker.

Play against a friend, challenge an AI opponent, or watch two algorithms compete. The practice lab lets you inspect the AI's search tree, compare candidate shots, and ask for hints during your turn.

## Features

| Feature                    | What you can do                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **3D classroom**           | Play at a wooden desk with animated characters, a follow camera, and classroom ambience.                   |
| **Physics-based flicking** | Control direction and power by pulling back on your pen. Grab it off-centre to add spin.                   |
| **Pen selection**          | Choose from standard and Matador pen models with different physical properties and colour options.         |
| **AI Lab**                 | Inspect search trees, shot scores, evaluation counts, and algorithm-specific details.                      |
| **Algorithm benchmarks**   | Run headless AI matches and compare wins and average decision times.                                       |
| **Game settings**          | Adjust desk friction, graphics quality, table texture, sound, aim guides, replays, and impact slow motion. |

## Game modes

| Mode                | Description                                                                             |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Two Players**     | Local pass-and-play matches with separate pen selections and player names.              |
| **Play vs AI**      | Challenge beginner, advanced, or expert opponents.                                      |
| **AI vs AI Battle** | Pick each opponent's algorithm, difficulty, and pen, then watch at 1×, 2×, or 4× speed. |
| **Practice Lab**    | Choose an opponent algorithm, keep the inspector open, and request hints on your turn.  |

### How to play

1. Choose a mode and select your pen.
2. Press on your pen, pull back to aim and set the power, then release to flick.
3. Try grabbing near either end of the barrel to change the spin.
4. Keep your pen on the desk while knocking your opponent's pen off.

The scoreboard shows the match target and current round. Use the in-game menu to pause, resume, or return to mode selection. The opponent in human-vs-AI is labelled **AI**.

Open the camera icon for Overview, Top, Side, Player, rotation, tilt, zoom, and Reset. Drag away from either pen to orbit; areas near either pen are protected from accidental rotation. Pinch with two fingers to zoom, or use trackpad pinch (Ctrl+wheel in Chromium; gesture events in Safari). Zoom ranges from 50% to 200%. Manual camera changes turn Follow off; enable Follow again to track the active pen. Choose **Pin view** in the camera panel to freeze the current view during the match. While pinned, camera gestures, presets, zoom, Follow and automatic replay/turn cameras cannot move it; pen aiming still works. Select **Pinned** to unpin. Pause/settings retain the pin; returning to the main menu or starting a new match clears it (unless configured to start pinned).

## AI algorithms

The game includes eight algorithms, grouped by approach:

- **Uninformed search:** Depth-First Search (DFS), Depth-Limited Search (DLS), and Iterative Deepening DFS (IDDFS).
- **Informed search:** Greedy Best-First Search and A*.
- **Adversarial and simulation search:** Minimax and Monte Carlo Tree Search (MCTS).
- **Rule-based control:** Fuzzy Logic.

Difficulty also affects execution noise and the chance of choosing a weaker shot. The default algorithms are fuzzy logic for beginner, A* for advanced, and MCTS for expert. Practice and AI battle modes let you select an algorithm directly.

<details>
<summary><strong>How the algorithms fit the game</strong></summary>

Search builds a shot from four choices: target, angle, power, and spin. Candidate shots are evaluated by the same physics engine used during play.

- **DLS and IDDFS** search this four-level action tree. DLS reports a cutoff when its depth limit prevents a complete shot.
- **Bidirectional search was removed:** discovering winning shots first made the later forward/backward prefix search redundant; dissipative game physics has no practical inverse transition.
- **A*** uses shot effort as its path cost and simulated shot quality as its heuristic. The heuristic is not admissible, so this budgeted adaptation does not guarantee an optimal path.
- **Minimax** alternates MAX and MIN, choosing against worst-case replies within a root shortlist and depth limit.
- **MCTS** uses UCB selection, expansion, random rollouts, and backpropagation with a bounded action shortlist and rollout depth.
- **Fuzzy logic** uses distance, risk, and confidence to determine flick power and attack/defend balance.

See the [AI module guide](src/game/ai/README.md) for implementation details.

</details>

## Getting started

You need **Node.js 22.18 or newer**, npm, and a browser with WebGL support. No API keys or backend setup are required.

From the repository root:

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

Player preferences and game settings are saved locally in the browser.

### Configuration

Game defaults live in separate files under [`src/config/`](src/config/README.md): settings, preferences, matches, camera, input, physics, playback, AI, pens, audio, and graphics. [`config.ts`](src/config/config.ts) combines these sections into one validated configuration. Environment overrides are optional: copy [`.env.example`](.env.example) to `.env.local` and uncomment the values you need. See the [configuration guide](src/config/README.md) for JSON overrides, validation, and saved-preference precedence. Restart development or rebuild production after changing environment values.

## Project structure

```text
src/
├── app/                 Next.js routes, layout, and global styles
├── config/              Unified defaults and optional environment overrides
├── features/
│   ├── game/
│   │   ├── ui/          Menus, HUD, controls, dialogs, and game styles
│   │   └── runtime/     React provider and scene composition
│   ├── ai-lab/ui/       Inspector, search-tree drawing, and benchmark panels
│   ├── pen/             Pen catalogue, models, and selection UI
│   ├── character/       Character geometry, animation, and arm movement
│   ├── table/           Playable desk geometry and textures
│   ├── furniture/       Shared desk/chair geometry and bench materials
│   └── classroom/       Room, furniture, lighting, and background props
└── game/
    ├── ai/              Search strategies, evaluation, and headless matches
    ├── physics/         Collision, friction, rolling, and shot simulation
    ├── controller/      Match flow, input, and playback
    ├── state/           UI snapshots, preferences, and persistence
    ├── scene/           Three.js rendering and resource cleanup
    └── audio/           Recorded sound, movement audio, and ambience
```

The AI and physics modules run without React or a browser. React manages the interface and scene lifecycle; the controller updates pen and character transforms directly during animation frames. AI Lab loads on demand.

For data flow, resource ownership, and extension points, see [Architecture](docs/architecture.md). Development conventions live in [Contributing](CONTRIBUTING.md).

## Development checks

Run the full check before submitting a change:

```bash
npm run check
```

This runs ESLint, TypeScript, the Node.js test suite, and a production build. Individual commands are also available:

| Command             | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `npm run lint`      | Check source and test code with ESLint.                       |
| `npm run typecheck` | Check TypeScript contracts and components.                    |
| `npm test`          | Run simulation, search, geometry, state, and lifecycle tests. |
| `npm run build`     | Build the production application.                             |
| `npm run format`    | Format source, tests, and documentation with Prettier.        |

Tests cover all supported algorithms, physics, character geometry, camera framing, mouse/touch/stylus safety, pinch cancellation, follow mode, sample-timestamp playback, preference recovery, configuration boundaries and environment precedence. See [Testing](docs/testing.md) for the suite map, focused commands, and the browser/device checklist. Headless tests do not establish visual sharpness, font layout, or native Safari/Chromium gesture delivery.

For hand animation changes, run `npm run test:hand-motion`. The [real-rig hand audit](docs/hand-motion-verification.md) records contact/motion checks and the remaining far-side reach limitation.

## Assets

Gameplay uses local recorded pen foley, movement-driven friction, and quiet classroom/fan loops. Sources, licences and edits are documented in [audio credits](public/audio/CREDITS.md); the playback implementation lives in `src/game/audio/`.

The Matador High School model is served from `public/models/pens/`. Its provenance and handling notes are recorded in the [pen asset guide](public/models/pens/README.md).

The current characters use procedural geometry and do not require external head scans or skin textures. All desks and chairs share the original matte school-bench finish. The floor retains furniture shadows without window-light overlays, reflective patches, or fan rotation shadows. [Texture credits](public/textures/furniture/CREDITS.md) distinguish the archived photograph from the active procedural material. The local brand mark is in `public/brand/`, with its app icon in `src/app/icon.svg`.
