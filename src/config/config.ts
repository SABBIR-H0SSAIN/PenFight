import { settingsConfig } from "./settings.ts";
import { preferencesConfig } from "./preferences.ts";
import { matchesConfig } from "./matches.ts";
import { cameraConfig } from "./camera.ts";
import { inputConfig } from "./input.ts";
import { physicsConfig } from "./physics.ts";
import { playbackConfig } from "./playback.ts";
import { aiConfig } from "./ai.ts";
import { audioConfig } from "./audio.ts";
import { graphicsConfig } from "./graphics.ts";
import { pensConfig, penColorsConfig } from "./pens.ts";
import { configRules } from "./validation.ts";
import { resolveConfig } from "./env.ts";
import { readEnvironmentOverrides } from "./environment.ts";

export { CONFIG_LIMITS } from "./limits.ts";
export type { ConfigAlgorithm, ConfigDifficulty } from "./ai.ts";
export type { ConfigPenKind } from "./pens.ts";

/** Unified defaults. Edit the owning section file; environment overrides are optional. */
export const defaultGameConfig = {
  settings: settingsConfig,
  preferences: preferencesConfig,
  matches: matchesConfig,
  camera: cameraConfig,
  input: inputConfig,
  physics: physicsConfig,
  playback: playbackConfig,
  ai: aiConfig,
  audio: audioConfig,
  graphics: graphicsConfig,
  pens: pensConfig,
  penColors: penColorsConfig,
};
export type GameConfig = typeof defaultGameConfig;

/** Unknown keys and invalid values preserve the last valid fallback. */
export function createGameConfig(
  json?: string,
  overrides?: unknown,
): GameConfig {
  return resolveConfig(defaultGameConfig, json, overrides, configRules);
}

export const gameConfig = createGameConfig(
  process.env.NEXT_PUBLIC_GAME_CONFIG,
  readEnvironmentOverrides(),
);
