/** Clone GPU resources so each player and the cached template own their assets. */
export function clonePenTemplate(template, recolor) {
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
    recolor(material, source);
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
  return model;
}
