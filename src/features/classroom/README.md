# Classroom

`Classroom.tsx` mounts the room and background props and owns its environment map. `scene/classroom-scene.js` builds the floor, walls, windows, furniture, fans, clock, posters and wall scoreboard. Repeated furniture shares geometry/materials and retains desk and chair silhouettes at both detail levels. Fans rotate without casting shadows.

The floor is matte and non-reflective, uses hardware-supported anisotropic filtering, and retains ordinary furniture shadows. Windows and curtains do not cast patterned shadows; additive window-light patches and transparent sun-beam overlays are removed so the tile detail stays visible beneath desks and chairs.

`src/features/furniture/scene/furniture.js` builds rounded panels, shaped seats, steel frames, fasteners and rubber feet. Every wooden surface uses the same original school-bench finish as the playable table, including the teacher's furniture and student chairs. The texture uses a deterministic seed, matching colours and markings, and one cached wood material per scene owner. There are no photographic patches, tinted furniture variations or specular highlights.

`updateFurnitureSurface()` replaces only wood materials when the selected table finish changes. It preserves furniture geometry, environment lighting and character animation rigs, and disposes replaced maps once. Each scene owner has independent resources so replacing a playable table cannot dispose textures still used by the classroom or students.

The playable desk belongs to `src/features/table`; characters and pens have their own components. Mount Classroom after the renderer and before simulation so animated props and board surfaces exist.

Rendering quality profiles, anisotropy, texture sizes and light intensities are configured in `src/config/graphics.ts`, then resolved through `config.ts`. The selected finish starts in `settings.ts` and can be changed in-game. Regression coverage is in `tests/scene.test.js` and `tests/furniture.test.js`; inspect actual tile/wood sharpness and shadows in both low/high quality using the [browser checklist](../../../docs/testing.md).
