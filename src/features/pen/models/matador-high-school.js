import { Box3, Vector3 } from "three";
import { clonePenTemplate } from "./clone-pen-template.js";

/** Fits the supplied cap-on-back GLB to its playable length and barrel radius. */
export function buildMatadorHighSchool({ g, L, r, chosen, template }) {
  if (!template)
    throw new Error("The Matador High School model has not loaded.");
  const model = clonePenTemplate(template, (material, source) => {
    // Preserve ivory parts, translucent cap, metal nib and photographed decals.
    if (/emerald/i.test(source.name))
      material.color.setHex(chosen).convertSRGBToLinear();
  });
  // Source X is the pen axis; turn the +Z printing upward onto the tabletop.
  model.rotation.x = -Math.PI / 2;
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const scale = L / (bounds.max.x - bounds.min.x);
  const center = bounds.getCenter(new Vector3());
  // The authored model is much thinner than the other game pens. Fit its
  // cross-section separately so it stays visible and matches the physics radius.
  // Rotation above maps source Z onto world Y; local Y/Z use the same scale.
  const radialScale = r / Math.max(-bounds.min.y, bounds.max.y);
  model.scale.set(scale, radialScale, radialScale);
  // Keep the barrel axis on Y/Z=0; the cap clip is intentionally asymmetric.
  model.position.x = -center.x * scale;
  model.name = "matador-hi-school-glb";
  g.add(model);
}
