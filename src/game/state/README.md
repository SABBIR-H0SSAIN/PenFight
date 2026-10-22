# State and saved preferences

`store.ts` creates an independent UI store per game, with stable selected snapshots for React subscribers. Initial settings and mode selections come from resolved `gameConfig` and are cloned before use. `storage.js` safely reads/writes the `pfa.*` local-storage namespace; storage can be disabled without preventing play.

`preferences.js` hydrates client-only game services before scene features mount. It validates field types and supported IDs, clamps supported scalar ranges, rejects arrays masquerading as IDs/colours, and merges legacy pen/colour/name entries only when present. Missing or invalid saved data preserves the configured fallback. Existing player choices intentionally take precedence over environment defaults.

Code defaults → optional JSON → individual public variables → saved choices → current UI changes. Defaults live in `src/config/settings.ts` and `preferences.ts`; supported choices/ranges live in `limits.ts`. See the [configuration guide](../../config/README.md) for clearing fresh-start storage, and [Testing](../../../docs/testing.md) for corrupt-storage, isolation and precedence checks. Replace nested published snapshots instead of mutating them.
