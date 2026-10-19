# Realistic audio shortlist — 19 October 2026

## Implemented sound set

The follow-up research found [an actual CC0 ballpoint pen flick by mywhats](https://freesound.org/people/mywhats/sounds/175526/), a closer action match than pen-button clicks. The code now loads eight local edited recordings, totalling 1,107,072 bytes. See [source credits and edits](../public/audio/CREDITS.md) and [the exact asset manifest](../public/audio/manifest.json).

The implemented bank includes the real flick; three contact variations and a natural drop/bounce sequence from shark510's pen recording; pen-on-wood friction; [Joseph SARDIN's recorded electric fan](https://bigsoundbank.com/electric-fan-1-s0078.html); and [rcrossley's public-domain classroom room tone](https://soundbible.com/1561-Classroom-Ambiance.html). The collision transients and floor material are adapted, rather than exact recordings of Matador pens colliding on this desk or hitting ceramic tiles.

The playback service varies contact takes, maps volume to shot/impact strength, applies pen-dependent pitch/filter profiles, and pans effects with the scene. Sliding loops follow actual recorded movement and stop for stationary/falling pens. Background loops are quiet and separately switchable. Pause suspends audio; menu return cancels transient effects; loading and decoding are cancellable; failures use a quiet fallback and do not block gameplay. AI-thinking beeps and electronic victory/defeat tunes were removed. Floor-landing events now follow simulation time, including pause, replay and accelerated AI playback.

The following sections retain the wider research shortlist; inclusion in that shortlist does not mean a file was shipped.

## Recommended direction

Use recorded close-up pen and desk sounds over a quiet ceiling fan and restrained classroom background. Record the main Matador flick and pen-to-pen collisions with the actual pens: those are the defining repeated actions, and the verified stock recordings below mostly capture drops, clicks, and sliding.

The original shortlist was a source and licensing review, not an audition-based quality ranking. The follow-up implementation downloaded and edited the selected free recordings listed in the credits. No purchases were made. Browser signal checks and automated lifecycle tests verify playback; subjective listening on different devices is still useful for final mixing.

## First-choice stock candidates

| Event                          | Recording and source                                                                                   | Verified description / format                                                                                               | Listed licence  | Intended use                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Desk contact, rattles, rolling | [tossing pen down.WAV — krb21](https://freesound.org/people/krb21/sounds/118618/)                      | Multiple ink-pen drops on a table; some rolls. 26.250 s, mono, 48 kHz / 24-bit WAV.                                         | CC0             | Strongest starting source for a bank of short desk impacts and rattle variations. This records pen/table contact, not pen/pen collision. |
| Sliding on wood                | [Slide — Mokozuz](https://freesound.org/people/Mokozuz/sounds/370737/)                                 | Creator describes sliding a pen against wood, recorded on a smartphone. 4.141 s, stereo, 44.1 kHz / 128 kbps MP3.           | CC0             | Material/action match for a quiet friction layer. Lower technical quality makes it a provisional candidate until auditioned.             |
| Ceiling fan                    | [Ceiling Fan Closeup Hum.WAV — zach_ramirez](https://freesound.org/people/zach_ramirez/sounds/572940/) | 31.654 s, 48 kHz / 16-bit WAV. Creator explicitly says the recording is not stereo despite the file's two-channel metadata. | CC0             | Quiet, centred background loop. Find a stable section and crossfade its loop boundary.                                                   |
| Classroom room tone            | [SCHOOL CLASSROOM AMBIENCE — Elenalostale](https://freesound.org/people/Elenalostale/sounds/648659/)   | College students whispering/writing, chairs, backpack zippers and a bell. 1:41.740, stereo, 44.1 kHz / 16-bit WAV.          | CC0             | Extract a quiet passage with indistinct voices. Omit the bell from a repeating gameplay loop.                                            |
| Pen falls to floor             | [Pen drop on floor.wav — shark510](https://freesound.org/people/shark510/sounds/346386/)               | Plastic pen on a wooden floor. 1.134 s, stereo, 48 kHz / 16-bit WAV.                                                        | CC0             | Useful temporary knock-off effect. The game's floor is tiled, so record a tile impact for the final material match.                      |
| Pen selection / confirmation   | [Pen click — Joseph SARDIN](https://bigsoundbank.com/pen-click-s0613.html)                             | Ballpoint mechanism clicks, studio recording. 15 s, mono, 48 kHz / 16-bit.                                                  | CC0             | Cut one subtle click for a selection or confirmation; the mechanical action suits interface feedback.                                    |
| Notebook menu navigation       | [Page Turn — Mark DiAngelo](https://soundbible.com/2066-Page-Turn.html)                                | A page being turned.                                                                                                        | Attribution 3.0 | Optional light page rustle on opening a notebook/menu page. Requires credit.                                                             |

CC0 is the simplest fit for this repository. The linked Freesound asset pages advertise login to download. BigSoundBank states its CC0 sound can be downloaded without an account and used commercially without attribution. Keep source/creator/licence records with any imported files, including CC0 files.

## Alternatives reviewed

- [Pencil drop x4 — IdkMrGarcia](https://freesound.org/people/IdkMrGarcia/sounds/513466/): four table-drop takes in a 5.554-second, 48 kHz / 24-bit stereo WAV; listed Attribution 4.0. Useful additional desk-impact texture, with a pencil rather than the game's plastic or metal pens.
- [Stationery Foley — Textures Sound / Sonniss](https://sonniss.com/sound-effects/stationery-foley/): listed at US$19.99 when checked; 192 files, 2.52 GB, 192 kHz / 24-bit, recorded on a Foley stage. A possible source for writing/paper/office details. Its catalogue description does not establish exact Matador flick or pen-to-pen collision recordings, so it is not a purchase priority for the core game sounds. Product-specific licence terms apply.
- [Pen tapping on table — diidiintle_99](https://freesound.org/people/diidiintle_99/sounds/456713/): relevant action, but listed Attribution NonCommercial 3.0. Excluded from the main shortlist to preserve future commercial-use flexibility.

Prices and source licence labels were checked on the research date. Preserve the applicable terms when acquiring an asset.

## Custom recordings that would improve realism most

1. **Finger flick:** actual capped Matador on a wooden desk, with 4 soft, 4 medium and 4 strong takes. Capture the finger/barrel contact and short initial scrape.
2. **Pen collision:** plastic against plastic, plastic against metal, and metal against metal. Capture at least 6 short takes for each pairing; keep the room quiet and microphone position consistent.
3. **Sliding and rolling:** separate short/long slides, spin-down and cap rattles on wood. Include the hexagonal and round pens so their textures differ.
4. **Floor landing:** capped plastic and metal pens landing on ceramic tile, with natural bounces. Capture 4–6 variations per material.

Suggested capture format: 48 kHz / 24-bit WAV with headroom, no baked-in music, no heavy reverb, and enough room before/after each take to edit cleanly. These are proposed production settings, not properties of the stock files.

## Original integration plan

Before this update, `src/game/audio/sound.js` synthesized the sound set using noise and oscillators. This was the original replacement plan; the implemented set and remaining material approximations are described above:

| Current hook                   | Proposed audio                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flick(power)`                 | A recorded finger/barrel transient, chosen from soft/medium/strong takes.                                                                                           |
| `hit(speed)`                   | A material-specific pen collision plus a restrained wooden-desk resonance.                                                                                          |
| `desk(amount)`                 | Short pen set-down or desk-contact recording; avoid a large generic bass impact.                                                                                    |
| `drop()`                       | Pen-on-tile impact and bounce sequence.                                                                                                                             |
| `scratch(amount)`              | Revisit this hook: currently called when a pen leaves the desk. Continuous sliding should instead follow the pen's recorded movement while it remains on the table. |
| Ambience                       | Quiet fan plus a separate low-level classroom layer.                                                                                                                |
| `tick()` / menu events         | A subtle pen click or paper sound where the interface interaction justifies it.                                                                                     |
| `think()`                      | Silence during normal play; an optional very quiet interface cue in the inspector.                                                                                  |
| `round()` / `win()` / `lose()` | Keep feedback brief. A soft school-themed cue or small natural reaction would fit better than a long electronic tune.                                               |

## Proposed mix and delivery

- Keep flicks and collisions in the foreground; place fan and chatter substantially below them. Start ambience around 18–24 dB below the main effects, then tune by listening on phone speakers and headphones.
- Use several takes per repeated event and a small amount of pitch variation. Heavy and premium pens should get their own recordings rather than relying only on lowering the pitch of plastic sounds.
- Pan contacts with the pen's screen position. Let speed drive friction volume and impact energy drive collision volume; stop friction when the pen stops or falls.
- Keep the background stable when the camera follows a pen, avoiding abrupt ambience jumps.
- Retain WAV masters outside the shipped bundle. Prepare short mono effect files and compressed ambience for delivery, and load only the small runtime assets needed by the game.

The implemented bank now supplies recorded flicks, contacts, drops, sliding, fan and classroom ambience. Custom Matador collision and ceramic-tile takes remain the most useful future additions.
