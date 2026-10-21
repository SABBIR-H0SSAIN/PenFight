# AI

`installAlgorithms(engine)` in `algorithms.js` registers eight algorithms: DFS, depth-limited search (DLS), iterative deepening DFS (IDDFS), greedy best-first search, A*, minimax, MCTS and fuzzy logic. Expert difficulty uses MCTS. Unknown or obsolete algorithm identifiers fall back to the configured default (A* initially); persisted selections are validated before use.

| Module                     | Responsibility                                                 |
| -------------------------- | -------------------------------------------------------------- |
| `strategies/uninformed.js` | DFS, DLS and IDDFS                                             |
| `strategies/search.js`     | Greedy best-first and A*-style action search                   |
| `strategies/fuzzy.js`      | Membership functions, rules and fuzzy action choice            |
| `strategies/minimax.js`    | Alternating MAX/MIN with worst-case opponent replies           |
| `strategies/mcts.js`       | UCB selection, expansion, random rollout and backpropagation   |
| `priority-queue.js`        | Shared minimum-priority queue                                  |
| `catalog.js`               | Compatibility exports of resolved names and difficulty presets |
| `benchmark.js`             | Cancellable headless match runner                              |
| `evaluation.js`            | Physics-based shot scoring                                     |
| `context.js`               | Per-search state, yielding, metrics and candidate summaries    |
| `match.js`                 | Headless match simulation                                      |

The search curriculum comes from the supplied Uninformed Search, Informed Search, Adversarial Search and MCTS slide decks. Fuzzy logic is included separately as requested.

The shot-action tree has four levels: target, angle, power and spin. DLS defaults to depth four; a lower limit reports a cutoff. IDDFS repeats DLS from zero through four. These searches test complete shots for a knock-off goal, and return the best evaluated shot or a fixed fallback if the goal is not reached within their budget.

Bidirectional search was removed: it first simulated complete shots to discover winning leaves, then met forward/backward frontiers on their action prefixes. Those winning shots were already known, so the prefix traversal added work without finding a new solution. Friction, collisions and knock-offs do not provide a practical inverse physics transition, and the game has many possible winning end states rather than one known destination. Saved `bidirectional` selections use the existing obsolete-selection fallback.

Greedy search orders by h; A* orders by g + h. The physics-based heuristic is not admissible, so this bounded A*-style search does not guarantee an optimal path. Minimax uses a root shortlist and depth limit to keep the continuous game's discretized action tree manageable. MCTS similarly uses a root shortlist and bounded rollout depth. Both operate without learned opponent probabilities.

Strategies receive engine/context helpers explicitly and return actions plus inspection data. Yield through `slice(ctx)` inside long searches, keep random seeds explicit in tests, and preserve the same knock-off rule in playable and headless matches. Per-player memory stores only confidence for fuzzy logic.

Presentation lives in `src/features/ai-lab/ui`, including `draw-tree.js` and `descriptions.ts`. Game menus and controls live in `src/features/game/ui`. UI may consume AI data; AI modules must not import UI modules or use DOM/canvas APIs. `tests/ai-boundaries.test.js` guards this boundary.

`src/config/ai.ts` owns labels, accuracy/noise/mistakes, think times, search goals/budgets, and benchmark initial values. The resolved values arrive through `config.ts` and compatibility exports in `catalog.js`. Think time is a minimum artificial delay in milliseconds; `0` disables that delay. Search still does the required computation and yields cooperatively. Per-decision options can override budget defaults. Shared pen and physics tuning comes from their own configuration sections.

Search, controller, benchmark cancellation and configuration tests are described in [Testing](../../../docs/testing.md). When adding an algorithm, update its default, validation, strategy, inspector description, and tests together.
