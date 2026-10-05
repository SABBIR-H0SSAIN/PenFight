# Classroom

`Classroom.tsx` mounts the room and background props and owns its environment map. `scene/classroom-scene.js` builds the floor, walls, windows, furniture, fans, clock, posters, a chalkboard with lesson writing, and procedural lighting textures. Repeated background furniture shares geometry/materials and uses level of detail.

Edit this feature for environment changes. The playable desk belongs to `src/features/table`; characters and pens have their own components. Mount Classroom after the renderer and before simulation so animated props and board surfaces exist.
