import type { SceneQuality } from "../game/scene/types";
/** Quality profiles, texture filtering, exposure and light intensity. */
export const graphicsConfig = {
  autoMobile: "medium" as SceneQuality,
  autoDesktop: "high" as SceneQuality,
  mobileBreakpoint: 600,
  exposure: 1,
  maxAnisotropy: 16,
  quality: {
    low: { pixelRatio: 1, shadowMap: 512, woodTextureSize: 512 },
    medium: { pixelRatio: 1.5, shadowMap: 1024, woodTextureSize: 1024 },
    high: { pixelRatio: 2, shadowMap: 2048, woodTextureSize: 1024 },
  },
  lighting: {
    hemisphere: 0.48,
    sun: 1.3,
    fill: 0.32,
    spot: 0.45,
    point: 0.22,
  },
};
