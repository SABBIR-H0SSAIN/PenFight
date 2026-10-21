# Testing and verification

Use Node.js 22.18+ and the locked dependencies. Run from the repository root:

```bash
npm ci
npm run check
```

`check` runs ESLint, TypeScript contracts, all Node regression tests, and a Next.js production build. TypeScript checks TS/TSX and declared integration contracts; JavaScript simulation and geometry are exercised by tests rather than full `checkJs`. Tests use isolated defaults and explicitly supply public environment overrides to subprocesses; a personal `.env.local` is not required.

## Automated coverage

| Area             | Suites and checks                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration    | `config.test.js`, `config-boundaries.test.js`: no env file, partial JSON, public aliases through real consumers, precedence, invalid/unknown values, enum alternatives, all numeric endpoints, integer/nonfinite rejection, true/false/zero, arrays, custom colours, name limits, independent defaults, prototype fields                                                                                        |
| Camera           | `camera.test.js`, `camera-pin.test.js`: pin/unpin, frozen mid-transition/follow/replay poses, aiming while pinned, pause/resize/quit/default-pin lifecycle; all presets and transition pairs, rotation seam/limits, portrait framing, zoom limits, repeated and rapid changes, no orbit through the desk/ceiling, resize/fullscreen-like/zero-size cases, follow re-enable/off, aiming lock, replay/end/restart |
| Input            | `gestures.test.js`: all pen models × four presets × narrow/wide canvases × zoom endpoints × mouse/touch/stylus × both pens; protected taps, orbit elsewhere, two-finger pinch, ignored extra finger, near-coincident contacts, cancellation/settings/blur/resize/menu/disposal, wheel units, Safari scale lifecycle                                                                                             |
| Match controls   | `controller.test.js`, `match-options.test.js`: all modes, AI label and colour contrast, supported speed values, pause/settings/back/Escape, cancellation, hints, scoring, replay/end/play-again, zero AI think delay, sound timing                                                                                                                                                                              |
| Playback         | `playback.test.js`: impact window/rate, cropped highlight, irregular timestamps, duplicate final sample, exact sample positions at 30/60/120 Hz, endpoint clamping, empty/single frame                                                                                                                                                                                                                          |
| Persistence      | `state.test.js`: isolated stores/subscriptions, corrupt and disabled storage, obsolete/coercible algorithm/pen/difficulty/colour values, legacy fallbacks, benchmark stop and totals                                                                                                                                                                                                                            |
| Hand movement    | `hand-motion.test.js`: actual mesh/IK/controller execution, 1,620 poses × 720 camera projections, 144 human and 48 AI flick checks, both players, 1×/2×/4×, 20/30/60/120 fps, reaction blending, independent tween cancellation, actual contact residuals; see [the hand audit](hand-motion-verification.md) for far-side limits                                                                                |
| Scene/materials  | `scene.test.js`, `furniture.test.js`: real geometry, pen GLB sizing/printing/independent colours, character reach, matching wood, material replacement/resource disposal, matte floor, no window light overlays or fan shadows, mipmap-safe canvases and filtering                                                                                                                                              |
| Physics/AI/audio | `engine.test.js`, `ai-*.test.js`, `audio.test.js`: deterministic shots, collisions/energy, knock-off scoring, algorithm decisions and search boundaries, recorded assets, motion/ambience, cancellation/disposal and offline fallback                                                                                                                                                                           |

The pen-protection matrix contains 576 model/view/size/zoom/pointer/player combinations. Camera tests also sample very narrow/wide aspect ratios and all preset transition pairs. These are bounded, repeatable regression checks; they cannot exhaust all hardware, browser, gesture timing or configuration combinations.

Focused runs:

```bash
node --test tests/config*.test.js tests/state.test.js
node --test tests/camera.test.js tests/gestures.test.js tests/controller.test.js
node --test tests/playback.test.js tests/scene.test.js tests/furniture.test.js
```

## Browser/device checklist

Run the built app as well as development when changing environment or rendering behavior. Try desktop Chromium and Safari, a touch phone/tablet, a narrow portrait viewport (320–430 CSS px), landscape, normal desktop and fullscreen. Start with a fresh browser profile for configured defaults, then repeat with saved preferences.

1. Open each mode/settings screen. Check labels, keyboard focus, Escape/Back, readable font sizes and absence of overlapping controls or horizontal overflow. Confirm brand assets and model/audio requests succeed.
2. In each camera preset, use rotation, tilt, zoom and Reset. Drag across the −180°/180° seam, resize/orient/fullscreen repeatedly, and verify the desk remains readable with no bounce, white frame or clipping. Repeat at low/high graphics quality.
3. Pin the current view, then try canvas drags, pinch, sliders, presets, Follow and a replay/turn change. The pose must remain fixed while pen aiming still works. Unpin to restore controls; pause/settings must retain the pin and quitting must clear it.
4. Press/tap beside each pen and its tips with mouse, stylus and touch: the camera must stay still. A nearby tap must not flick. Drag the active pen to fire; drag clear canvas to orbit.
5. Pinch in/out at both zoom limits. Add/remove an extra finger; release one finger and move the other. Begin pinching while aiming. Cancel via settings, pause, blur, orientation and menu; the next fresh gesture must work without a stuck capture or accidental shot.
6. Try native trackpad pinch in Chromium and Safari, ordinary wheel scroll, and pinch while aiming/paused. Board zoom must stay bounded and must not zoom the browser page during a gameplay pinch.
7. Enable Follow after manual rotation/zoom, then turn it off or select a manual view. Run a knock-off, replay, match end, play-again and menu return. Change AI speed and use benchmark Stop without freezing the interface.
8. Check floor tiles and every desk/chair at oblique angles: matching matte wood, no blurred light overlay or rotating fan shadow, and stable mipmap detail. Switch oak/maple/walnut repeatedly without resetting character animation or losing another owner's textures.
9. Test `.env.local` aliases and partial JSON with valid/invalid/zero/false values; restart development or rebuild production. Verify saved choices win over defaults, and clearing the documented storage keys restores configured defaults.

Headless geometry/material assertions do not render pixels or verify native gesture delivery. Record which browser/device checks were actually performed. If browser control is unavailable or blocked, report that limitation rather than claiming visual verification.

## Fixes covered by recent regression tests

Playback now uses real physics sample timestamps instead of a fixed sample index. AI think time `0` no longer becomes an 800 ms fallback pause. Saved arrays cannot masquerade as pen/difficulty/algorithm IDs or colour strings during startup. Legacy colour-only storage remains usable when there is no legacy pen selection. A configured Player-view rotation offset survives turn changes. Section defaults are combined by `src/config/config.ts`; public environment accesses remain literal for Next.js build-time inlining. A production probe build confirmed both an individual alias and a partial JSON override appear in the generated browser bundle; the final build restores normal defaults.
