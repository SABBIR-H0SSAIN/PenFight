# Character

`Character.tsx` mounts one student (`slot: 0 | 1`), registers its animation rig, applies optional appearance props, and owns cleanup.

- `scene/character-scene.js`: body, clothing, arm inverse kinematics, reactions and animation.
- `scene/head.js`: coherent stylized head, eyes, mouth and expressions.
- `scene/hand.js`: articulated hands, fingers and fingertip calculations.
- `types.ts`: appearance props and rendering handle.

The geometry is imported and used by the React component. To change the face, edit Head; to change anatomy or reach, edit the rig. The controller drives the registered rig without DOM queries. Run `npm test` for finite-pose/geometry checks and visually check flicking after anatomy changes.
