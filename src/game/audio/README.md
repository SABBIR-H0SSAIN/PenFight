# Audio service

`createSound()` owns one Web Audio context, recorded buffers, transient voices and motion/ambience loops. User interaction initializes playback. Pen material profiles adjust pitch/filter/gain; moving pens drive friction audio, and simulation-time events drive contact/drop sounds. Pause, menu return and disposal stop obsolete effects. Failed asset loads use a quiet local fallback and must not interrupt a match.

`src/config/audio.ts` owns recording paths, contact variations, profiles, ambience gains/cutoffs and voice limits. `settings.ts` owns initial master volume and ambience enablement. `catalog.js` re-exports resolved audio data. Sources/licences and regeneration notes remain in [audio credits](../../../public/audio/CREDITS.md).

Run `tests/audio.test.js` and controller sound-timing tests. See [Testing](../../../docs/testing.md) for native playback checks; headless tests use fake audio nodes and cannot establish perceived loudness.
