# Loading and notebook UI verification

Verified on 2026-10-20 against the local development app and the final Next.js production build.

## Fixes

- Pen cards size themselves against the selector container, including split player/AI panels. Wide cards place the illustration above the copy; narrow layouts use full-width rows or stacked content. Names, descriptions, selection marks and color controls stay within their cards.
- The main-menu pointing pen lives in a reserved button slot. It follows mouse/keyboard selection without measuring screen coordinates, covering labels or sharing SVG gradient IDs between mounted pages.
- The Smoothy preview nib stays within its illustration bounds.
- A compact loader layout fixes clipping in a 320 × 320 viewport. Existing portrait and landscape layouts retain the two-pen animation.

## Automated checks

`npm run check` passed: ESLint, TypeScript, all **245 tests**, and the production build. `git diff --check` also passed.

Existing regression suites cover physics, AI algorithms, controller/match modes, camera and gestures, hand motion, playback/replay, preferences, recorded audio, real pen geometry/materials, furniture and resource disposal. `tests/loading.test.js` also verifies model/font content hashes, one bench painting for four scene owners, independent GPU ownership, and separate cache entries/lifecycle cleanup.

## Browser checks performed

Viewport tests used the real app inside a temporary same-origin frame, with the viewport changed through browser controls. The fixture measured card/copy/preview bounds, color-panel scroll widths, page/document horizontal overflow, pointer/label overlap, and animation cleanup. The fixture and preview route were removed before the final build.

| Flow                                                               | Widths in CSS px                         | Result                                              |
| ------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------- |
| Human vs AI: all six cards, Smoothy and High School color controls | 320, 375, 411, 600, 760, 768, 1024, 1280 | No card, color-panel, or horizontal page overflow   |
| AI Battle: both independent selectors, twelve cards                | Same eight widths                        | No overflow                                         |
| AI Battle: both custom-color panels simultaneously                 | 320, 411, 600, 760, 768, 1280            | No overflow; choices remained independent           |
| Local players: both selectors, ten cards                           | Same eight widths                        | No overflow                                         |
| Practice Lab: six cards                                            | 320, 411, 760, 768, 1280                 | No overflow; Enter lab remained usable              |
| Main-menu pointing pen after resizing                              | Same eight widths                        | Pen stayed inside its button and clear of the label |

Loader bounds were checked at 320 × 568, 375 × 760, 411 × 760, 768 × 760, 1280 × 760, 760 × 390 and 1280 × 320. The additional 320 × 320 case exposed clipping; after the compact-layout fix, it and 375 × 390 / 411 × 390 also passed.

Navigation checks covered forward/reverse page turns, keyboard Tab and Enter, focus restoration, and an intentionally canceled turn. The fallback removed the sheet and released controls; completed turns left no extra sheet or inert page. The turn duration remains 280 ms with a 330 ms interruption fallback.

Production checks covered every pen button, custom-color-panel appearance, a Matador color/selection surviving reload, a Matador Human vs AI match, pause and return to menu, and a saved walnut finish surviving reload. Test selections, colors and table finish were restored. Practice Lab and its deferred AI inspector loaded successfully. No browser errors or warnings were captured during these checks.

The frame observed one model resource entry per game load and no Google Fonts requests. The production document retains one model preload and one handwritten-font preload; versioned assets retain immutable caching.

## Scope

These are controlled browser viewport checks, not physical phone/tablet certification. Reduced-motion handling was reviewed in code; operating-system motion preferences were not toggled. Headless input/physics tests supplement the browser checks but do not exhaust every device, graphics driver, network condition or possible interaction sequence.

## Mobile page-turn follow-up

The mobile rendering update uses 220 ms turns on compact/coarse-pointer screens and 280 ms on desktop. The controller skips classroom animation and WebGL rendering only while a visible menu is turning, retaining the last rendered frame. The timestamp still advances, so resuming does not accumulate turn time. Compact turns omit the animated face shading/curl layers while retaining the 3D paper and cast shadow; painted content is contained to the sheet viewport.

`npm run check` passed with **248 tests**, ESLint, TypeScript and a production build. The added controller regression covers suspended rendering/ambient updates, resumption without accumulated time, active gameplay remaining unblocked by a stale turn flag, and turns in paused Settings. The updated preview server runs on port 3001. Browser access to the preview was blocked by the browser security policy during this follow-up, so the earlier browser checks above do not certify this latest animation update or physical mobile frame rates.

## Edge-fall physics follow-up

Replaced the overlap-only support rule with centre-of-mass balance. An overbalanced pen tips around the desk edge/corner before dropping; a small remaining tail no longer holds it level. Hand contact targets are cleared before playback, recorded fall orientation survives the settled view, and landing audio follows the actual landing event.

`npm run check` passed with **262 tests**, ESLint, TypeScript and a production build. New checks cover every model, edge and corner, parallel barrels, both realism settings, stationary overhangs, sliding/spinning departures, input immutability and matching AI/gameplay outcomes. Actual mesh triangles are checked against the desk at 120 interpolated samples/second, including both the default Matador GLB and procedural pens. These exposed and verified fixes for rolled cap/clip clearance and interpolation cutting a chord through the desktop. An end-to-end controller test uses a real character rig to verify hand release before playback, a completed fall, one score and one landing sound. Existing human/AI contact, pause/replay, camera, physics, assets and model-resource tests also pass. This follow-up used automated simulation/geometry checks; no new browser or physical-device certification is claimed.
