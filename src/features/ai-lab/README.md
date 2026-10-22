# AI Lab

`ui` contains the inspector components, algorithm descriptions and canvas drawing. `AiLab.tsx` is loaded on demand by the game runtime. `draw-tree.js` renders decision data; `descriptions.ts` provides user-facing explanations.

Search and evaluation live in `src/game/ai`, and benchmarks use its cancellable headless runner. UI consumes the published decision snapshots through the game provider; AI modules must not import inspector components or rendering helpers.

Algorithm labels, search budgets and benchmark initial selections are configured in `src/config/ai.ts`. Benchmark rounds are supported choices in `src/config/limits.ts`. The UI reads resolved values from `config.ts`; saved battle preferences remain separate from a benchmark run. Changing a live algorithm updates the controller selection without a decision snapshot overwriting it.

Run `tests/ai-*.test.js` for search/boundary tests and `tests/state.test.js` for benchmark cancellation and completed totals. See the [test matrix](../../../docs/testing.md) for in-browser inspector and Stop-button checks.
