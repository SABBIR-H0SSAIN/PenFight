# Furniture

`scene/furniture.js` supplies reusable rounded desk/cabinet panels, chair seats/backs, steel frames, feet and fasteners for classroom and character owners. It caches geometry and materials within each owner. `benchWood()` uses the same original procedural school-bench finish as the main table; it does not load the archived wood photograph or tint each desk differently.

`updateFurnitureSurface(root, deps, surface)` changes only wood materials, releases replaced maps/materials once, and leaves geometry, lighting and character rigs intact. Owners share the immutable painted bench canvas within a world, but do not share disposable GPU textures with one another. `wood-uv.js` supplies UV helpers. The active original finish already contains its writing; the unused duplicate lettering renderer has been removed.

Texture resolution and filtering defaults come from `src/config/graphics.ts` through the resolved `gameConfig`. The user-selected finish comes from game settings. Run `tests/furniture.test.js` and `tests/scene.test.js`; also follow the [visual material checklist](../../../docs/testing.md).
