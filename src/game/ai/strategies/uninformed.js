import { gameConfig } from "../../../config/config.ts";
/** DFS, DLS and IDDFS over the finite shot-action tree. */
export function createUninformedStrategy({
  clamp,
  makeAction,
  ANGS,
  POWS,
  OFFS,
  TNAME,
  LV,
  ev,
  topMoves,
  movesFrom,
  slice,
}) {
  const maxDepth = LV.length;
  const actionFor = (state, me, choices) =>
    makeAction(
      state,
      me,
      choices[0] ?? 0,
      choices[1] ?? 1,
      choices[2] ?? 3,
      choices[3] ?? 1,
    );
  function labelFor(choices) {
    const value = choices.at(-1);
    switch (choices.length) {
      case 0:
        return "start";
      case 1:
        return TNAME[value];
      case 2:
        return (ANGS[value] * 57.3).toFixed(0) + "°";
      case 3:
        return "P" + Math.round(POWS[value] * 100);
      default:
        return "S" + (OFFS[value] === 0 ? "0" : OFFS[value] > 0 ? "+" : "-");
    }
  }
  const threshold = (cfg) => clamp(cfg.goal ?? 0.5, 0, 1);
  const isGoal = (result, cfg) =>
    result.pSucc >= threshold(cfg) && result.pSelf === 0;
  function finish(state, me, ctx, evaluated, found) {
    let best = found || topMoves(evaluated, 1)[0];
    if (!best) {
      const act = actionFor(state, me, []);
      best = { act, ...ev(state, me, act, ctx, 2) };
      evaluated.push(best);
    }
    ctx.live.moves = movesFrom(evaluated, best.act.key);
    ctx.live.selected = best.act;
    ctx.live.extra.found = Boolean(found);
    return { action: best.act, moves: ctx.live.moves };
  }
  function* depthPass(state, me, cfg, ctx, limit) {
    const live = ctx.live;
    live.nodes = [{ id: 0, p: -1, d: 0, label: "start", order: 0 }];
    const stack = [{ id: 0, choices: [] }];
    const evaluated = [];
    let found = null,
      cutoff = false,
      expanded = 0,
      order = 0;
    while (stack.length && evaluated.length < cfg.leafBudget) {
      const node = stack.pop();
      const depth = node.choices.length;
      live.nodes[node.id].order = ++order;
      ctx.nodes++;
      if (depth === maxDepth) {
        const act = actionFor(state, me, node.choices);
        const result = { act, ...ev(state, me, act, ctx, 2) };
        evaluated.push(result);
        live.nodes[node.id].v = result.score;
        if (isGoal(result, cfg)) {
          found = result;
          live.nodes[node.id].goal = true;
        }
      } else if (depth === limit) {
        cutoff = true;
      } else {
        expanded++;
        for (let i = 0; i < LV[depth]; i++) {
          const choices = node.choices.concat(i);
          const id = live.nodes.length;
          live.nodes.push({
            id,
            p: node.id,
            d: depth + 1,
            label: labelFor(choices),
            order: 0,
          });
          stack.push({ id, choices });
        }
      }
      Object.assign(live.extra, {
        frontier: stack.length,
        expanded,
        depthLimit: limit,
        cutoff,
        evaluated: evaluated.length,
      });
      live.moves = movesFrom(evaluated, found?.act.key);
      yield* slice(ctx);
      if (found) break;
    }
    live.extra.budgetExhausted =
      !found && stack.length > 0 && evaluated.length >= cfg.leafBudget;
    return { evaluated, found, cutoff };
  }
  function* depthSearch(state, me, cfg, ctx, mode) {
    cfg = { ...gameConfig.ai.budgets[mode], ...cfg };
    cfg.leafBudget = Math.max(1, cfg.leafBudget);
    const limit = clamp(Math.floor(cfg.depthLimit ?? maxDepth), 0, maxDepth);
    let result;
    if (mode === "iddfs") {
      for (let depth = 0; depth <= limit; depth++) {
        ctx.live.extra.iterations = depth + 1;
        result = yield* depthPass(state, me, cfg, ctx, depth);
        if (result.found || !result.cutoff || ctx.live.extra.budgetExhausted)
          break;
      }
    } else result = yield* depthPass(state, me, cfg, ctx, limit);
    return finish(state, me, ctx, result.evaluated, result.found);
  }
  return { depthSearch };
}
