import { Box3, Vector3 } from "three";

/** Fits the supplied cap-on-back GLB to its playable length and barrel radius. */
export function buildMatadorHighSchool({ g, L, r, chosen, template }) {
  if (!template)
    throw new Error("The Matador High School model has not loaded.");
  const model = template.clone(true);
  const geometries = new Map(),
    materials = new Map(),
    textures = new Map();
  const cloneMaterial = (source) => {
    if (materials.has(source)) return materials.get(source);
    const material = source.clone();
    for (const [key, value] of Object.entries(material)) {
      if (!value?.isTexture) continue;
      if (!textures.has(value)) textures.set(value, value.clone());
      material[key] = textures.get(value);
      material[key].needsUpdate = true;
    }
    // Preserve ivory parts, translucent cap, metal nib and photographed decals.
    if (/emerald/i.test(source.name))
      material.color.setHex(chosen).convertSRGBToLinear();
    if (material.transparent) material.depthWrite = false;
    materials.set(source, material);
    return material;
  };
  model.traverse((object) => {
    if (!object.isMesh) return;
    if (!geometries.has(object.geometry))
      geometries.set(object.geometry, object.geometry.clone());
    object.geometry = geometries.get(object.geometry);
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
    object.castShadow = !object.material.transparent;
    object.receiveShadow = true;
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
