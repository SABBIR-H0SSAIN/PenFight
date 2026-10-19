# QA report — 19 October 2026

## Commit preparation verification — 20 October 2026

The four commits use the requested historical Git dates (16–19 October); these are planned dates rather than verified development dates. During commit preparation on 20 October, the first three snapshots independently passed `npm run check` with 35, 60 and 60 tests respectively. The final snapshot also passed `npm run check`: all 70 tests, zero-warning lint, TypeScript, and the production build. Audio tests cover loading failures, variation and panning, motion loops, pause/resume, disposal, and controller landing timing.

A fresh production-browser smoke check verified practice setup, the Practice HUD label, available hint controls, and the open AI Lab at an effective 390×844 viewport with no horizontal document overflow. No application console warnings or errors were captured. The embedded browser did not confirm native fullscreen entry/exit; its viewport override also did not hold the requested short landscape dimensions, so short-screen behavior was not freshly verified in this pass. The broader browser and real AudioContext results below describe the earlier checks recorded in this report, not a repeat of those checks during commit preparation.

## Audio implementation follow-up

The complete `npm run check` now passes all 70 tests, zero-warning lint, TypeScript and the production build. Ten added tests cover recorded assets and audio lifecycle behavior, including controller landing timing during pause.

A separate temporary browser harness imported the actual audio service and shipped files and used a real Chromium AudioContext with an analyser. All eight local files decoded. Flick, contact, drop, sliding and background loops produced nonzero signals; stopping movement and muting produced silence; pause suspended the context; resume restarted it; disposal closed it. The harness reported no console warnings or errors. This verifies the signal path, not subjective mixing quality or physical-device playback.

The production game was also checked through practice setup, suggested-shot playback, pause, settings, volume zero/restoration, ambience off/on, and resume. No application console warnings or errors were observed. The responsive checks below belong to the earlier UI pass; this audio update does not establish additional physical mobile-device coverage.

The recorded bank is 1,107,072 bytes. Source licences, editing details and material approximations are in `public/audio/CREDITS.md`; asset hashes and exact edit windows are in `public/audio/manifest.json`.

## Result

Before the audio follow-up, `npm run check` passed ESLint with zero warnings, TypeScript, all 60 automated tests, and the production Next.js build. `git diff --check` passed. No application console errors or warnings were observed during that production browser pass.

## Fixed defects

- Interrupted pointers and lost pointer capture no longer release charged shots or consume a premium pen's surge. Right clicks and secondary pointers cannot start aiming. Release coordinates determine the final shot even without an intervening pointer-move event.
- Pausing, switching away, and hiding the page cancel active aiming safely. Returning to the menu releases captured pointers. Paused settings remain open if the window loses focus.
- Hint calculations cannot publish stale suggestions after a manual shot, new match, menu return, algorithm change, or pause. Hint controls are disabled outside the player's available turn; applying a hint cannot submit a duplicate shot.
- Live decision updates no longer overwrite the selected Lab algorithm. AI battle explicitly identifies the selector as AI A, starts with AI A's algorithm, and updates scoreboard names when its algorithm changes.
- The follow-camera toggle applies during shot playback.
- Custom pen colours update during colour-picker input and persist, rather than waiting for a later change event.
- Turn/surge controls have separate space above fullscreen/FPS controls on narrow screens. The Lab has compact headers, scrollable descriptions, and usable content on short screens. Landscape round banners stay within the available game region and clear the controls. Notebook text colours remain legible independently of the OS colour preference. Practice mode displays “Practice” instead of a target of 99 wins.
- Fullscreen support is detected, fullscreen change events update its label, and rejected requests produce a message instead of an unhandled rejection.

## Automated coverage

25 tests were added to the original 35. They cover controller cancellation and recovery, pointer capture, surge consumption, stale hints, repeated hint application, Lab selection, pause/settings navigation, match scoring and rematches, benchmark totals and cancellation, invalid/unavailable saved settings, and recorded physics for every pen/opponent combination at both friction limits with realism on and off.

Controller tests run the real controller, physics and AI with a virtual animation clock. WebGL rendering and character animation are represented by fixture handles; separate existing scene tests verify real geometry and resource disposal.

## Browser checks

The final production build was exercised in the Codex Chromium browser at 320×568, 390×844, 844×390 and 1440×900. Checked game and inspector layouts had no horizontal document overflow.

- All four game setup flows: local multiplayer, human versus AI, practice, and AI battle.
- Player names, round-target selection, all six pen selections, colour swatches, live custom colours, and saved settings after reload.
- Manual aiming/flicking, player turn changes, AI shot playback, premium controls, pause, resume, pause settings, and quitting to the menu.
- All nine algorithms produced usable training hints. Applying a suggestion started playback and disabled hint controls.
- Moves, search tree, algorithm details, and benchmark tabs; inspector open/close; algorithm changes during AI battle; simulation speeds 1×, 2× and 4×.
- A real 10-round beginner benchmark (MCTS against DFS) completed with 10 knock-offs and valid statistics. A separate running benchmark was stopped successfully.
- All seven settings switches, all graphics quality options, all three table textures, volume/friction limits, and persisted settings. Ordinary defaults were restored after slider and toggle testing.

## Verification limits

Responsive sizes were emulated on desktop; physical iOS/Android devices and Safari/Firefox were not available. The embedded browser did not enter native fullscreen when requested, so native fullscreen entry/exit remains unverified in a regular browser. Sound controls were exercised, but audio was not independently audited by listening.

These checks establish the tested behavior; they do not guarantee that every browser/device combination is defect-free. Headless matches intentionally have no flick limit, so two conservative algorithms can run until stopped if neither pen falls.
