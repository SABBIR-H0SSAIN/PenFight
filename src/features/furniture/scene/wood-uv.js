// The supplied photograph is 1536 × 860. Preserve its pixel scale on every
// panel, with grain following the longer side rather than stretching to fit.
export function woodUv(x, z, width, depth, variation = 0) {
  const i = ((variation % 6) + 6) % 6;
  const photoAspect = 1536 / 860;
  const long = Math.max(width, depth),
    short = Math.min(width, depth);
  const zoom = [0.92, 0.88, 0.9, 0.86, 0.89, 0.93][i];
  const cropU = Math.min(1, long / short / photoAspect) * zoom;
  const cropV = Math.min(1, photoAspect / (long / short)) * zoom;
  const along = depth > width ? z : x,
    across = depth > width ? x : -z;
  const offsetU = ([0, -0.65, 0.5, 0.7, -0.45, 0.3][i] * (1 - cropU)) / 2;
  const offsetV = ([0, 0.5, -0.6, -0.4, 0.65, -0.3][i] * (1 - cropV)) / 2;
  return [
    0.5 + (along / long) * cropU + offsetU,
    0.5 + (across / short) * cropV + offsetV,
  ];
}
