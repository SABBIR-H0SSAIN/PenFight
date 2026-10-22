/** Desktop and portrait framing. Angles in degrees; radius in cm. */
export const cameraConfig = {
  presets: {
    overview: { azimuth: 30, elevation: 65 },
    top: { azimuth: 0, elevation: 89 },
    side: { azimuth: 90, elevation: 55 },
    player: { azimuth: 0, elevation: 58 },
  },
  portrait: { aspectThreshold: 0.85, azimuth: 0, elevation: 72 },
  defaultZoom: 1,
  defaultPinned: false,
  radius: 170,
  horizontalFit: 0.92,
  verticalFit: 0.8,
};
