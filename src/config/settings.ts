import type { GameSettings } from "../game/state/types";
/** Initial player settings; saved browser settings take precedence. */
export const settingsConfig: GameSettings = {
  name: "Player",
  vol: 0.7,
  amb: true,
  quality: "auto",
  tableSurface: "oak",
  follow: false,
  replay: true,
  slowmo: true,
  fps: false,
  guide: true,
  friction: 0.98,
  real: true,
};
