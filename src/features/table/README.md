# Playable table

`Table.tsx` mounts and disposes the playable desk. `scene/table-scene.js` contains the real desk geometry and procedural wood drawing code. The tabletop width and length come from the physics engine through the scene dependencies.

Background furniture, walls, posters, floor and environment textures are separately owned by `src/features/classroom`. Coordinate physical table-size changes with the physics/controller owner: spawn positions, camera framing and character reach must remain consistent.
