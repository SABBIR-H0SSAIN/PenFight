import { gameConfig } from "../../config/config.ts";
/** Local, edited field recordings. Provenance: public/audio/CREDITS.md. */
export const AUDIO_ASSETS = gameConfig.audio.assets;
export const CONTACT_SOUNDS = gameConfig.audio.contacts;
export function materialProfile(pen) {
  return gameConfig.audio.profiles[pen] || gameConfig.audio.profiles.default;
}
