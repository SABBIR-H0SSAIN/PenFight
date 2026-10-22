# Pen assets

`matador-hi-school.glb` is the user's supplied Matador High School model with its cap on the back, originally named `matador_hi_school_cap_on_back.glb` (the available download copy had the suffix ` (1)`).

The game serves this file at `/models/pens/matador-hi-school.glb`. Its long axis is X. The renderer aligns it to X and fits its length and cross-section to configured playable dimensions, then uses the authored material names to identify the recolourable barrel. Before replacing it, check alignment, table contact, printing, translucent cap, and both player colours. Provenance here records the supplied asset; it does not grant an additional licence.

Default playable dimensions and colour options are in `src/config/pens.ts`; geometry fitting is in `src/features/pen/models/matador-high-school.js`. The geometry tests check fit, preserved printing/cap materials, independent colours and disposal. Asset provenance is unchanged by configuration overrides.
