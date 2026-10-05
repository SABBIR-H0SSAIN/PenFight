// Resources are shared by several meshes. Release each resource only once.
const released = new WeakSet();
export function release(resource) {
  if (!resource || released.has(resource)) return;
  released.add(resource);
  resource.dispose();
}
export function disposeObjectTree(root, textures = true) {
  root.traverse((object) => {
    if (object.geometry) release(object.geometry);
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (!material) continue;
      if (textures)
        for (const value of Object.values(material))
          if (value?.isTexture) release(value);
      release(material);
    }
    if (object.shadow?.map) release(object.shadow.map);
  });
}
