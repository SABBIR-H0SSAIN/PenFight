export const CAMERA_PRESETS = {
  overview: { azimuth: 30, elevation: 65 },
  top: { azimuth: 0, elevation: 89 },
  side: { azimuth: 90, elevation: 55 },
  player: { azimuth: 0, elevation: 58 },
};

// The ceiling is at 225, with lights and fans hanging down to about 200.
// A fixed orbit also prevents rotation from repeatedly zooming in and out.
export const DESK_CAMERA_RADIUS = 170;
export function overviewCamera(aspect) {
  return {
    preset: "overview",
    zoom: 1,
    ...(aspect < 0.85
      ? { azimuth: 0, elevation: 72 }
      : CAMERA_PRESETS.overview),
  };
}

export function shortestAngle(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function cameraAngle(azimuth, elevation, preset = "custom", zoom = 1) {
  const wrapped = ((((azimuth + 180) % 360) + 360) % 360) - 180;
  return {
    preset,
    // Keep the range input's right endpoint on the right while it is held.
    azimuth: wrapped === -180 && azimuth > 0 ? 180 : wrapped,
    elevation: Math.max(45, Math.min(89, elevation)),
    zoom: Math.max(0.5, Math.min(2, zoom)),
  };
}

/** Fit the desk rectangle closely while staying below the classroom fixtures. */
export function deskCamera(angle, aspect, position, target) {
  const yaw = (angle.azimuth * Math.PI) / 180,
    pitch = (angle.elevation * Math.PI) / 180;
  target.set(0, 0, 0);
  position.set(
    DESK_CAMERA_RADIUS * Math.sin(yaw) * Math.cos(pitch),
    DESK_CAMERA_RADIUS * Math.sin(pitch),
    DESK_CAMERA_RADIUS * Math.cos(yaw) * Math.cos(pitch),
  );
  return deskFov(position, target, aspect);
}

/** Fit the actual rendered pose as well as the destination during an orbit. */
export function deskFov(position, target, aspect) {
  const dx = position.x - target.x,
    dy = position.y - target.y,
    dz = position.z - target.z,
    radius = Math.max(1, Math.hypot(dx, dy, dz)),
    horizontal = Math.max(0.001, Math.hypot(dx, dz)),
    rx = dz / horizontal,
    rz = -dx / horizontal,
    ux = (dy / radius) * rz,
    uy = horizontal / radius,
    uz = (-dy / radius) * rx,
    safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  let tangent = 0;
  for (const x of [-32, 32])
    for (const z of [-52, 52]) {
      const cx = x - target.x,
        cy = -target.y,
        cz = z - target.z,
        depth = Math.max(1, radius - (cx * dx + cy * dy + cz * dz) / radius);
      tangent = Math.max(
        tangent,
        Math.abs(cx * rx + cz * rz) / (depth * safeAspect * 0.92),
        Math.abs(cx * ux + cy * uy + cz * uz) / (depth * 0.8),
      );
    }
  return Math.max(25, Math.min(165, (Math.atan(tangent) * 360) / Math.PI));
}

/** Interpolate around the target, never along a chord through the desk. */
export function interpolateOrbit(
  position,
  look,
  targetPosition,
  targetLook,
  amount,
) {
  const x = position.x - look.x,
    y = position.y - look.y,
    z = position.z - look.z,
    tx = targetPosition.x - targetLook.x,
    ty = targetPosition.y - targetLook.y,
    tz = targetPosition.z - targetLook.z,
    radius = Math.max(1, Math.hypot(x, y, z)),
    targetRadius = Math.hypot(tx, ty, tz),
    yaw = Math.atan2(x, z),
    nextYaw = yaw + shortestAngle(yaw, Math.atan2(tx, tz)) * amount,
    pitch = Math.asin(Math.max(-1, Math.min(1, y / radius))),
    targetPitch = Math.asin(Math.max(-1, Math.min(1, ty / targetRadius))),
    nextPitch = pitch + (targetPitch - pitch) * amount,
    nextRadius = radius + (targetRadius - radius) * amount;
  look.lerp(targetLook, amount);
  position.set(
    look.x + Math.sin(nextYaw) * Math.cos(nextPitch) * nextRadius,
    look.y + Math.sin(nextPitch) * nextRadius,
    look.z + Math.cos(nextYaw) * Math.cos(nextPitch) * nextRadius,
  );
}
