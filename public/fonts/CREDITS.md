# Locally hosted fonts

These are the same four Google Fonts previously loaded from the Google Fonts stylesheet. WOFF2 files were downloaded from `fonts.gstatic.com` on 2026-10-20. Each filename includes the first 12 characters of its SHA-256 digest so it can be cached immutably. All supplied Unicode subsets are retained and selected by CSS `unicode-range`.

- [Bricolage Grotesque](https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque): weights 600–800, optical size 12–96; `bricolagegrotesque-OFL.txt`.
- [Schibsted Grotesk](https://github.com/google/fonts/tree/main/ofl/schibstedgrotesk): weights 400–600; `schibstedgrotesk-OFL.txt`.
- [JetBrains Mono](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono): weights 400–500; `jetbrainsmono-OFL.txt`.
- [Patrick Hand](https://github.com/google/fonts/tree/main/ofl/patrickhand): weight 400; `patrickhand-OFL.txt`.

All are distributed under the SIL Open Font License 1.1. Original license notices are included unchanged beside the files. Font definitions live in `src/app/fonts.css`; the existing family names are preserved so canvas lettering and UI typography use the same fonts.

When updating a font, use a new content-hashed filename, update the matching CSS URL, and update the Patrick Hand preload in `src/features/game/ui/GameCanvas.tsx` if necessary. No external font requests or build-time font downloads are required.
