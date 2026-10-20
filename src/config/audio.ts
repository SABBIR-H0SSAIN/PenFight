/** Edited field recordings; provenance: public/audio/CREDITS.md. */
const audioAssets = {
  flick: "/audio/pen-flick.wav",
  contactA: "/audio/pen-contact-a.wav",
  contactB: "/audio/pen-contact-b.wav",
  contactC: "/audio/pen-contact-c.wav",
  drop: "/audio/pen-drop.wav",
  slide: "/audio/pen-slide-loop.wav",
  fan: "/audio/fan-loop.wav",
  classroom: "/audio/classroom-loop.wav",
};
const contactSounds = ["contactA", "contactB", "contactC"];
export const audioConfig = {
  assets: audioAssets,
  contacts: contactSounds,
  maxVoices: 16,
  ambience: {
    fan: { gain: 0.075, cutoff: 1600 },
    classroom: { gain: 0.022, cutoff: 1900 },
  },
  profiles: {
    default: { rate: 1, cutoff: 5800, gain: 1 },
    heavy: { rate: 0.8, cutoff: 4200, gain: 1.12 },
    premium: { rate: 0.92, cutoff: 7600, gain: 1.05 },
    matador_hs: { rate: 1.12, cutoff: 6600, gain: 0.83 },
    matador_smoothy: { rate: 0.97, cutoff: 4300, gain: 0.88 },
  },
};
