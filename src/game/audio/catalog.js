/** Local, edited field recordings. Provenance and edit notes: public/audio/CREDITS.md. */
export const AUDIO_ASSETS = {
  flick: "/audio/pen-flick.wav",
  contactA: "/audio/pen-contact-a.wav",
  contactB: "/audio/pen-contact-b.wav",
  contactC: "/audio/pen-contact-c.wav",
  drop: "/audio/pen-drop.wav",
  slide: "/audio/pen-slide-loop.wav",
  fan: "/audio/fan-loop.wav",
  classroom: "/audio/classroom-loop.wav",
};
export const CONTACT_SOUNDS = ["contactA", "contactB", "contactC"];
export function materialProfile(pen) {
  if (pen === "heavy") return { rate: 0.8, cutoff: 4200, gain: 1.12 };
  if (pen === "premium") return { rate: 0.92, cutoff: 7600, gain: 1.05 };
  if (pen === "matador_hs") return { rate: 1.12, cutoff: 6600, gain: 0.83 };
  if (pen === "matador_smoothy")
    return { rate: 0.97, cutoff: 4300, gain: 0.88 };
  return { rate: 1, cutoff: 5800, gain: 1 };
}
