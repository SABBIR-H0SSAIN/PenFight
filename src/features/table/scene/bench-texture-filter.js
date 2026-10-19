/** Preserve angled wood detail without disabling mipmaps or introducing shimmer. */
export function configureBenchTexture(texture, deps) {
  const { THREE: T, R } = deps;
  const supported = R.renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  texture.anisotropy = Math.min(16, Math.max(1, supported));
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}
