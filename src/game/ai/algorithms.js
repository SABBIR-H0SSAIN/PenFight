import { createUninformedStrategy } from "./strategies/uninformed.js";
import { createShotEvaluator } from "./evaluation.js";
import { createSearchContext } from "./context.js";
import { installHeadlessMatches } from "./match.js";
import { createSearchStrategy } from "./strategies/search.js";
import { createFuzzyStrategy } from "./strategies/fuzzy.js";
import { createMinimaxStrategy } from "./strategies/minimax.js";
import { createMctsStrategy } from "./strategies/mcts.js";
import { ALGORITHMS, ALGORITHM_SHORT, DIFFICULTIES } from "./catalog.js";
/* AI algorithms depend on the public physics/action interface passed into this installer. */
export function installAlgorithms(PF) {
  "use strict";
  const { clamp, gauss } = PF._internals;
  /* ------------------------------------------------------------ heuristic */
  PF.evalShot = createShotEvaluator(PF);
  const { mkCtx, slice, stats, ev, topMoves, movesFrom } =
    createSearchContext(PF);

  /* ======================================================= decision wrapper */
  const deps = { PF, ...PF._internals, ev, topMoves, movesFrom, slice, stats };
  const { informed } = createSearchStrategy(deps);
  const { fuzzyAI } = createFuzzyStrategy(deps);
  const { minimaxAI } = createMinimaxStrategy(deps);
  const { mctsAI } = createMctsStrategy(deps);
  const { depthSearch, bidirectional } = createUninformedStrategy(deps);

  PF.ALGOS = ALGORITHMS;
  PF.SHORT = ALGORITHM_SHORT;
  PF.LEVELS = DIFFICULTIES;
  const DEFAULT_CFG = {
    dfs: { leafBudget: 90 },
    dls: { leafBudget: 90, depthLimit: 4 },
    iddfs: { leafBudget: 90, depthLimit: 4 },
    bidirectional: { leafBudget: 90 },
    best: { evalBudget: 110 },
    astar: { evalBudget: 130 },
    minimax: { depth: 2, beam: 8 },
    mcts: { iters: 3000 },
    fuzzy: {},
  };
  PF.decide = function* (state, me, cfg) {
    cfg = Object.assign({ algo: "astar", noise: null }, cfg);
    const algo = Object.hasOwn(ALGORITHMS, cfg.algo) ? cfg.algo : "astar";
    cfg.algo = algo;
    const ctx = mkCtx(cfg, me);
    ctx.live.algo = algo;
    const scale = cfg.budgetScale == null ? 1 : cfg.budgetScale;
    const c = Object.assign({}, DEFAULT_CFG[algo] || {}, cfg);
    if (c.iters) c.iters = Math.max(1, Math.round(c.iters * scale));
    if (c.evalBudget)
      c.evalBudget = Math.max(15, Math.round(c.evalBudget * scale));
    if (c.leafBudget)
      c.leafBudget = Math.max(15, Math.round(c.leafBudget * scale));
    let out;
    if (["dfs", "dls", "iddfs"].includes(algo))
      out = yield* depthSearch(state, me, c, ctx, algo);
    else if (algo === "bidirectional")
      out = yield* bidirectional(state, me, c, ctx);
    else if (algo === "best") out = yield* informed(state, me, c, ctx, false);
    else if (algo === "astar") out = yield* informed(state, me, c, ctx, true);
    else if (algo === "fuzzy") out = yield* fuzzyAI(state, me, c, ctx);
    else if (algo === "minimax") out = yield* minimaxAI(state, me, c, ctx);
    else if (algo === "mcts") out = yield* mctsAI(state, me, c, ctx);
    // human-like mistakes: sometimes settle for a runner-up
    let action = out.action,
      mistake = false;
    if (
      cfg.mistake &&
      ctx.rng() < cfg.mistake &&
      out.moves &&
      out.moves.length > 2
    ) {
      const alt =
        out.moves[
          1 + Math.floor(ctx.rng() * Math.min(4, out.moves.length - 1))
        ];
      if (alt && alt.act) {
        action = alt.act;
        mistake = true;
      }
    }
    ctx.live.stats = stats(ctx);
    ctx.live.selected = action;
    ctx.live.mistake = mistake;
    return { action, info: ctx.live };
  };
  PF.runSync = function (gen) {
    let r = gen.next();
    while (!r.done) r = gen.next();
    return r.value;
  };
  PF.newMemory = function (skill) {
    return {
      conf: skill === "expert" ? 0.85 : skill === "advanced" ? 0.6 : 0.3,
    };
  };
  PF.noisy = function (act, noise, r) {
    if (!noise) return act;
    const a = Object.assign({}, act);
    a.ang += gauss(r) * noise.a;
    a.pow = clamp(a.pow * (1 + gauss(r) * noise.p), 0.05, 1.05);
    return a;
  };

  installHeadlessMatches(PF);

  return PF;
}
