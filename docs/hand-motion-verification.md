# Hand movement verification

This audit executes the actual Three.js character builder, articulated finger meshes, arm solver, tweens and game controller. It does not infer animation from successful promises or tests that stub the hand methods.

Run the audit from the repository root:

```bash
node --test tests/hand-motion.test.js
npm run check
```

`tests/helpers/controller.js` offers `realCharacters: true`, a chosen frame step and a deterministic engine seed. Existing quick controller tests retain their lightweight character stubs. The real-character mode records the rendered index pad and requested contact at the instant the recorded physics shot starts, and disposes the actual scene resources afterward.

**Status:** the sampled seated/own-side movement checks pass after the corrections below. Opposite-edge contact still fails; see Remaining limitations.

## Coverage and measured results

| Check             | Scope                                                                                                                                                                                      | Result                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static contact/FK | 1,620 poses: both players, three lateral positions, three depths on the player's side, five wrist angles, six finger curls and three barrel/contact heights                                | Worst settled index-pad residual about **0.31 cm**; arm segments retain 29 cm / 26.5 cm lengths                                                                                                                            |
| Camera projection | Each contact projected through 720 views: 24 azimuths at 15° spacing, five elevations, two aspect ratios and three zoom levels                                                             | Finite projections; contact remains framed at normal zoom. This is not a GPU occlusion check                                                                                                                               |
| Human flicks      | 144 real-controller shots across all six models, both players, four presets, three barrel offsets, twelve release directions, standard/cross-body/edge positions; half use a pinned camera | Every sampled shot completes and the real hand retracts to the lap; impulse-time pad residual below **0.3 cm** (measured maximum about **0.20 cm**)                                                                        |
| AI flicks         | 24 real-controller shots: both players, twelve directions, models and offsets, custom camera rotations                                                                                     | Every sampled shot completes; pad residual below **0.3 cm** (measured maximum about **0.21 cm**)                                                                                                                           |
| Timed movement    | Both characters at 30/60/120 fps for reach/retract/thinking/reactions; 24 additional AI flicks at 1×/2×/4× and 20/30/60/120 fps                                                            | Actual mesh/tip travel, finite transforms, fixed bone lengths, completed tweens and bounded frame-to-frame movement                                                                                                        |
| Interruption      | Replace one hand's motion while the other continues; pause/resume, cancel aim and return to menu                                                                                           | No stale tween continuation, no phantom shot, pause freezes the real hand pose                                                                                                                                             |
| Mesh clearance    | Transformed vertices of palm, fingers and thumb in the static matrix and every fifth positive-height reach frame in the 144-shot matrix                                                    | No sampled penetration exceeding the **0.1 cm** numerical/mesh clearance tolerance; sampled moving-hand vertices stay about 1 cm or more above the desk in this run; this is not a swept collision test for the whole body |

The contact matrix covers the player's side of the board, not every possible pen location. Passing these checks does not imply all continuous poses, frame timings, rendering angles or devices are exhaustive.

## Corrections made

- A cross-body shot could aim the wrist from the far side of the pen and leave the index pad roughly 10–11 cm short. The wrist now approaches naturally when the requested orientation exceeds anatomical reach, with smooth rotation and unchanged bone lengths.
- Curled resting fingers and a downward-folding thumb could enter the tabletop. The non-playing fingers now stay more open, and the thumb articulates across the palm instead of folding downward through the desk.
- Starting a replacement motion previously left parts of the old hand tween running until later properties happened to be overwritten. `begin()` now cancels that hand's current tweens immediately while preserving the other hand's motion.
- Victory transitions changed wrist orientation and fist curl instantly, producing a sampled fingertip jump of about 24 cm at 30 fps. Both transitions now blend smoothly.
- The final contact check previously accepted a large gap and waited too briefly. The controller now measures the contact timeout against the actual simulation clock, rather than counting nominal 25 ms iterations. It waits up to 0.55 simulation seconds (plus frame quantization) for the rendered pad, with 0.2 cm horizontal and 0.15 cm vertical tolerances. This avoids inconsistent waiting at low frame rates or accelerated AI speed; the timeout fallback remains a limitation for unreachable targets.

## Remaining limitations

**Opposite-edge reach is not solved.** With a contact target at the far side (`z = −47 cm` for player 1, mirrored for player 2), the seated rig has a measured residual of roughly **34 cm** after enforcing torso/desk clearance. The solver correctly avoids stretching bones, but the controller's contact timeout can still allow the game to launch the shot without physical hand contact in that extreme case. Fixing that requires an explicit reposition/standing reach animation or another gameplay decision; the successful near-side samples must not be presented as a solution for the whole table. The audit prints this residual separately.

**The original audit had no live visual checks.** Its headless results establish real geometry and timing behavior, rather than pixel rendering. A later in-app browser check is recorded below. Safari/Chromium device coverage, subtle self-intersection and subjective naturalness still need the broader [browser/device checklist](testing.md).

## Torso/desk clearance regression

The former reach solver could scoot the chair forward by 13 cm while leaning the upper body into the tabletop. `scene/desk-clearance.js` now caches a conservative envelope from the torso and clothing geometry. The pose solver limits scooting against the envelope's intersection with desk height, then applies a final check after breathing, sway and reactions. Cross-body reach can shift the seated rig sideways; both arm segments retain their fixed lengths.

The added regression checks actual transformed body mesh triangles against the desk volume for both players at 20/60/120 fps, including idle, cross-body/center/far-side reaches, four reactions and reset. Existing near-side hand-contact and controller flick tests still pass. This covers torso clearance; it does not establish swept collision safety for every hand or reaction transition.

The complete project check passes with 241 tests, lint, TypeScript and the production build. Live AI-vs-AI gameplay was checked in the in-app browser on the existing development server at `http://localhost:3000`, including an oblique view of both seated bodies and reaching. A screenshot was saved as verification evidence. Initial attempts on port 3101 failed because a development server was already running on port 3000. A transient stylesheet hot-reload error from a separate workspace change cleared on refresh; the active match rendered afterward. This is a bounded visual check, not exhaustive browser/device coverage.
