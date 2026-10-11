import { Heap } from "../priority-queue.js";
/** search decision logic; no React or browser state. */
export function createSearchStrategy({
  clamp,
  makeAction,
  ANGS,
  POWS,
  OFFS,
  TNAME,
  LV,
  ev,
  movesFrom,
  slice,
}) {
  const COST = {
    t: [0, 0.06, 0.06, 0.12, 0.12],
    a: ANGS.map((v) => Math.abs(v) * 3),
    p: POWS.map((v) => v * v * 0.15),
    s: OFFS.map((v) => Math.abs(v) * 0.08),
  };
  function nodeAction(state, me, ch) {
    const t = ch[0],
      a = ch.length > 1 ? ch[1] : 1,
      p = ch.length > 2 ? ch[2] : 3,
      s = ch.length > 3 ? ch[3] : 1;
    return makeAction(state, me, t, a, p, s);
  }
  function nodeLabel(ch) {
    const d = ch.length,
      v = ch[d - 1];
    if (d === 1) return TNAME[v];
    if (d === 2) return (ANGS[v] * 57.3).toFixed(0) + "°";
    if (d === 3) return "P" + Math.round(POWS[v] * 100);
    return "S" + (OFFS[v] === 0 ? "0" : OFFS[v] > 0 ? "+" : "-");
  }
  function nodeG(ch) {
    let g = 0;
    for (let d = 0; d < ch.length; d++)
      g += [COST.t, COST.a, COST.p, COST.s][d][ch[d]];
    return g;
  }
  function* informed(state, me, cfg, ctx, astar) {
    const live = ctx.live,
      budget = cfg.evalBudget || 110;
    const threshold = cfg.goal == null ? 2 / 3 : clamp(cfg.goal, 0, 1);
    live.nodes.push({ id: 0, p: -1, d: 0, label: "start", order: 0 });
    const heap = new Heap();
    let id = 1,
      order = 0;
    const evaluated = [];
    let spent = 0;
    const K = 2.2;
    heap.push(0, { id: 0, ch: [], g: 0, h: 50 });
    while (heap.size && spent < budget) {
      const n = heap.pop();
      order++;
      live.nodes[n.id].order = order;
      ctx.nodes++;
      // A complete action is a candidate, not automatically a successful goal.
      // Only its simulated knock-off probability determines whether it qualifies.
      if (n.ch.length === 4) continue;
      for (let i = 0; i < LV[n.ch.length] && spent < budget; i++) {
        const ch = n.ch.concat(i),
          act = nodeAction(state, me, ch),
          leaf = ch.length === 4;
        const r = ev(state, me, act, ctx, leaf ? 3 : 1);
        spent++;
        const g = nodeG(ch),
          hh = (1 - r.score / 100) * K,
          f = astar ? g + hh : hh;
        const node = { id, ch, g, h: hh, r, act };
        const isGoal = leaf && r.pSucc >= threshold && r.pSelf === 0;
        live.nodes.push({
          id,
          p: n.id,
          d: ch.length,
          label: nodeLabel(ch),
          v: r.score,
          order: 0,
          goal: isGoal,
        });
        id++;
        heap.push(f, node);
        if (leaf) evaluated.push({ act, ...r, g, isGoal });
      }
      live.moves = movesFrom(evaluated, null);
      live.extra.open = heap.size;
      yield* slice(ctx);
    }
    // Compare ALL evaluated complete actions, not just the first popped leaf.
    // Prefer a verified knock-off; otherwise choose the best simulated shot.
    // A* also considers the cost g; its physics-based heuristic is not
    // mathematically admissible, so this is a budgeted A*-style search.
    const rank = (m) =>
      m.score + 20 * m.pSucc - 30 * m.pSelf - (astar ? 14 * m.g : 0);
    const goals = evaluated.filter((m) => m.isGoal);
    const candidates = goals.length ? goals : evaluated;
    let best = candidates.reduce(
      (a, b) => (!a || rank(b) > rank(a) ? b : a),
      null,
    );
    if (!best) {
      const act = nodeAction(state, me, [0, 1, 3, 1]);
      best = {
        act,
        ...ev(state, me, act, ctx, 3),
        g: nodeG([0, 1, 3, 1]),
        isGoal: false,
      };
      evaluated.push(best);
    }
    live.moves = movesFrom(evaluated, best.act.key);
    live.selected = best.act;
    live.extra.found = goals.length > 0;
    live.extra.goalThreshold = threshold;
    live.extra.evaluated = evaluated.length;
    live.extra.budget = budget;
    return { action: best.act, moves: live.moves };
  }
  return { informed };
}
