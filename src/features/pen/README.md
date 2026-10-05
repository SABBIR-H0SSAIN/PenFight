# Pens

`Pen.tsx` owns one player's model and accepts `slot`, `model`, optional `color`, and the loaded `matadorTemplate`. Its registered handle lets the controller apply physics snapshots without React rendering every frame.

`ui/PenSelector.tsx` is the controlled picker reused by all mode screens; `ui/PenPreview.tsx` and `ui/PenPointer.tsx` supply menu visuals. `catalog.js` is the shared metadata source for menus and physics, and `types.ts` derives `PenKind` from it.

`models/pen-models.js` handles materials, texture caching, model selection, transforms and disposal. `standard-pen.js`, `matador-high-school.js`, and `matador-smoothy.js` contain the actual mesh construction. To add a pen, add its catalogue entry, style and builder. Test both model geometry and human-vs-AI selection. Repeated selections keep the same meshes; changed selections release the previous geometry.

Matador High School uses the user-supplied `public/models/pens/matador-hi-school.glb`. `models/load-pen-assets.js` caches its loading promise; `GameScene` waits for it before mounting the scene. `matador-high-school.js` clones resources per player, aligns the authored X axis with physics, scales uniformly, and recolours only the barrel materials. Keep the printing, nib and translucent cap materials intact. The template is never rendered, and each player's cloned resources can be disposed independently.
