# Pen Fight Arena agent guide

## Start here

- Use Node.js 22.18+ and install from the npm lockfile with `npm ci`. Start the game with `npm run dev`.
- Keep existing workspace edits. Follow the user's scope for commits and other Git operations. Open the relevant owner guide before changing behavior.

| Task                                | Start with                                                                       | Verify                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Menus, HUD, AI Lab                  | [Game UI](src/features/game/README.md), [AI Lab](src/features/ai-lab/README.md)  | Browser at desktop and narrow portrait widths, keyboard and focus, relevant game modes |
| Match timing, input, camera, replay | [Controller](src/game/controller/README.md)                                      | `controller`, `playback`, `camera`, and `gestures` suites as applicable                |
| AI strategy or benchmark            | [AI](src/game/ai/README.md)                                                      | Seeded decisions, visible trace, real physics, benchmark Stop                          |
| Physics and knock-offs              | [Physics](src/game/physics/README.md)                                            | `engine`, `edge-fall`, `knockoff`, and replay checks                                   |
| Character, hand or scene            | [Character](src/features/character/README.md), [Scene](src/game/scene/README.md) | `npm run test:hand-motion` for rig/timing changes and a browser visual check           |
| Defaults or saved settings          | [Configuration](src/config/README.md)                                            | `config`, `config-boundaries`, and `state` suites as applicable                        |

## Invariants

- React owns UI and feature lifecycle. The controller drives Three.js transforms and publishes UI snapshots. Physics and AI stay independent of React, Three.js, and browser APIs.
- AI Battle playback speed multiplies the recorded pen motion. The controller separately caps character animation and runs ambient motion at wall time. Pause freezes play. Human matches retain highlights and impact slow motion.
- Keep hand bone lengths fixed. Check actual fingertip contact at impulse time with `realCharacters: true`. An unreachable pen uses the shot cue described in the [hand audit](docs/hand-motion-verification.md).
- Preserve shared physics and scoring across live play and benchmarks. Both players score if both pens fall. Use explicit seeds and cooperative yields when changing search.
- Edit defaults in the owning `src/config` module and read them through resolved `gameConfig`. Validate public overrides and preserve saved preference precedence.

## Verify and report

Use `node --test tests/<suite>.test.js` for focused checks and `npm run check` for lint, type checking, tests, and production build. Use [Testing](docs/testing.md) for browser scenarios. Report browser, viewport, actions observed, and any gaps. Keep ownership details in the [documentation index](docs/README.md) and development conventions in [Contributing](CONTRIBUTING.md).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
