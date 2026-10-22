# Pen Fight Arena audio sources

Retrieved and edited on 19 October 2026. All shipped audio is local; playing the game never contacts these providers. The manifest records source download URLs, source hashes, edit windows, sample rates, and shipped-file hashes.

| Shipped files                                                                 | Original recording                                                            | Creator                      | Source licence                                                |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| `pen-flick.wav`                                                               | [pen flick 2.wav](https://freesound.org/people/mywhats/sounds/175526/)        | mywhats                      | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `pen-contact-a.wav`, `pen-contact-b.wav`, `pen-contact-c.wav`, `pen-drop.wav` | [Pen drop on floor.wav](https://freesound.org/people/shark510/sounds/346386/) | shark510                     | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `pen-slide-loop.wav`                                                          | [Slide](https://freesound.org/people/Mokozuz/sounds/370737/)                  | Mokozuz                      | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `fan-loop.wav`                                                                | [Electric fan #1](https://bigsoundbank.com/electric-fan-1-s0078.html)         | Joseph SARDIN / BigSoundBank | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `classroom-loop.wav`                                                          | [Classroom Ambiance](https://soundbible.com/1561-Classroom-Ambiance.html)     | rcrossley                    | Public Domain, as declared on the source page                 |

## Edits and fit

- The flick is an actual ballpoint-pen flick, not a retractable pen mechanism or an unrelated snap.
- Contact variations isolate three distinct bounces from a real plastic pen hitting a **wooden floor**. Filtering and runtime pitch/gain profiles adapt these short recorded transients for desk contacts and collisions. They are designed effects; they are not recordings of two Matador pens colliding.
- The drop preserves a short natural bounce sequence from that same wooden-floor recording. The game's tiled floor is approximated; an exact pen-on-tile recording remains a possible future improvement.
- The slide uses a quiet pen-on-wood segment, filtered and crossfaded into a loop. Movement controls its gain, rate, and stereo position.
- The fan is an electric fan recording used as a low-level classroom fan bed. It does not claim to record the exact ceiling fan shown in the scene.
- Classroom room tone is shortened, filtered, crossfaded and mixed quietly below the foreground effects.
- The three Freesound inputs were obtained as their public HQ MP3 previews and decoded for editing; converting to WAV does not restore the original source recording's lossless quality. The fan input is the provider's WAV; the classroom input is the provider's MP3.
- All shipped files are mono, 16-bit PCM WAV, at 32 kHz for effects and 24 kHz for background loops. One-shot edges are faded, loops are crossfaded, and peaks retain headroom. Total WAV size: 1,107,072 bytes.

These sources do not imply creator endorsement. CC0 does not require attribution; the credits are retained for provenance and appreciation. No paid or noncommercial-only assets are included.

## Rebuilding

Run `python3 scripts/prepare-audio.py /path/to/source-cache` from the repository root. The optional preparation script requires NumPy plus FFmpeg or macOS `afconvert`; the game itself requires none of those tools. Source files are cached outside the repository. Regenerated hashes can differ between decoder implementations; review the resulting manifest and run the audio tests after rebuilding.

## Runtime configuration

The default recording paths and playback material profiles are in `src/config/audio.ts`; master volume/ambience defaults are in `src/config/settings.ts`. Optional public environment overrides are documented in `src/config/README.md`. Replacing a configured recording path does not change the provenance or licences of these shipped recordings. Run `tests/audio.test.js` after asset or audio-service changes.
