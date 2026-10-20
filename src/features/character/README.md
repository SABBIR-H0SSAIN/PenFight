# Character

`Character.tsx` mounts one student (`slot: 0 | 1`), registers its animation rig, applies optional appearance props, and owns cleanup.

- `scene/character-scene.js`: body, clothing, arm inverse kinematics, reactions and animation.
- `scene/head.js`: coherent stylized head, eyes, mouth and expressions.
- `scene/hand.js`: articulated hands, fingers and fingertip calculations.
- `scene/desk-clearance.js`: cached torso envelope and clearance at tabletop height.
- `types.ts`: appearance props and rendering handle.

The geometry is imported and used by the React component. To change the face, edit Head; to change anatomy or reach, edit the rig. The controller drives the registered rig without DOM queries. Run `npm test` for finite-pose/geometry checks and visually check flicking after anatomy changes.

Student chairs use the shared matte bench materials in `src/features/furniture`. Finish changes replace wood materials while preserving the animated character rig. Character appearance and anatomy remain feature props/geometry, rather than public environment settings. Scene regression tests cover both shooting sides, finite poses, independent resources, and finish replacement. [Testing guide](../../../docs/testing.md).

Reaching limits forward chair motion using the actual torso and clothing outline at desk height. The final check includes breathing, sway and reaction poses; a deep lean can move the seat slightly backward. Cross-body shots can shift the seat sideways while keeping the arms attached and their bone lengths fixed. The hand-motion suite checks torso mesh triangles against the desktop for both players at 20/60/120 fps, including reaching, reactions and resets.

## Real hand animation audit

Run `npm run test:hand-motion` to exercise the actual character rig and meshes. The audit covers 1,620 contact poses, 720 camera projections per pose, 144 human flicks, 24 AI direction checks and 24 AI speed/frame-rate checks, both players, 20/30/60/120 fps, reactions and cancellation. `begin()` cancels only the selected hand's old tweens. Contact reach adapts wrist orientation without extending bones; resting fingers/thumb and victory transitions are smoothed to avoid desk penetration and pose snaps.

See [Hand movement verification](../../../docs/hand-motion-verification.md) for measured results and limits. The far opposite edge is still outside the seated rig's reach; headless contact checks for the player's side do not establish contact everywhere. GPU rendering, occlusion and perceived naturalness remain separate browser checks.
