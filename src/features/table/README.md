# Playable table

`Table.tsx` mounts and disposes the playable desk. `scene/table-scene.js` uses the shared furniture builder for its rounded top and steel materials. The tabletop width and length come from the physics engine through the scene dependencies. `original-bench-texture.js` restores the original light procedural school-bench grain, scratches and carved writing, fitted to the board without a duplicate writing overlay. The surface remains matte. All surrounding desks, cabinet panels and chairs use the same original texture, colour and markings. Texture changes update their wood materials without rebuilding character rigs or lighting.

Background furniture, walls, posters, floor and environment textures are separately owned by `src/features/classroom`. Coordinate physical table-size changes with the physics/controller owner: spawn positions, camera framing and character reach must remain consistent.

Wood canvases are expanded to power-of-two dimensions before upload so WebGL 1 cannot silently reduce their detail. `bench-texture-filter.js` configures hardware-supported anisotropic filtering (up to 16×) and trilinear mipmaps on all bench surfaces to retain angled grain while avoiding distant shimmer.
