import { gameConfig } from "../../../config/config.ts";
/** mcts decision logic; no React or browser state. */
export function createMctsStrategy({ PF, ev, topMoves, slice, stats }) {
  function* mctsAI(state, me, cfg, ctx) {
    cfg = { ...gameConfig.ai.budgets.mcts, ...cfg };
    const live = ctx.live,
      N = cfg.iters,
      C = cfg.c,
      maxD = cfg.depth;
    const shotOptions = { maxT: gameConfig.physics.gameplaySimulationSeconds };
    // root prior: best K actions by deterministic heuristic
    const all = PF.allActions(state, me),
      scored = [];
    for (const a of all) {
      const r = ev(state, me, a, ctx, 1);
      scored.push({ act: a, ...r });
      if ((scored.length & 31) === 0) yield* slice(ctx);
    }
    const rootActs = topMoves(scored, cfg.rootK).map((m) => m.act);
    const root = {
      mover: 1 - me,
      pens: state.pens,
      terminal: false,
      N: 0,
      W: 0,
      kids: [],
      untried: rootActs.slice(),
      parent: null,
      id: 0,
      d: 0,
    };
    live.nodes.push({ id: 0, p: -1, d: 0, label: "root", order: 0, n: 0 });
    const visible = [root];
    let nid = 1;
    function actsFor(st, who) {
      return PF.quickActions(
        {
          pens: st,
          turn: who,
          flicks: [0, 0],
          round: 1,
          surge: [false, false],
        },
        who,
      );
    }
    for (let it = 0; it < N; it++) {
      let node = root;
      const path = [root];
      // An action is aimed from its parent position. Reuse the actual position
      // that produced it rather than replaying prior shots with fresh noise.
      while (!node.untried.length && node.kids.length) {
        const explore = C * Math.sqrt(Math.log(node.N + 1));
        let best = null,
          value = -Infinity;
        for (const child of node.kids) {
          const ucb = child.W / child.N + explore / Math.sqrt(child.N);
          if (ucb > value) {
            value = ucb;
            best = child;
          }
        }
        node = best;
        path.push(node);
      }
      if (node.untried.length) {
        // Expand the strongest root priors first so small iteration budgets
        // still try the best simulated candidates.
        const idx =
          node === root ? 0 : Math.floor(ctx.rng() * node.untried.length);
        const act = node.untried.splice(idx, 1)[0];
        const mover = 1 - node.mover;
        const { pens } = PF.shoot(node.pens, mover, act, shotOptions);
        ctx.sims++;
        const terminal = pens[0].out || pens[1].out;
        const depth = node.d + 1;
        const kid = {
          mover,
          act,
          pens,
          terminal,
          N: 0,
          W: 0,
          kids: [],
          untried: terminal || depth >= maxD ? [] : actsFor(pens, 1 - mover),
          parent: node,
          id: nid++,
          d: depth,
        };
        node.kids.push(kid);
        node = kid;
        path.push(node);
        ctx.nodes++;
        if (live.nodes.length < cfg.maxVisibleNodes) {
          visible.push(kid);
          live.nodes.push({
            id: kid.id,
            p: kid.parent.id,
            d: kid.d,
            label: act.label,
            actionKey: act.key,
            order: it + 1,
            n: 0,
          });
        }
      }
      // Rollouts generate each move from the board produced by the previous
      // shot. Aim noise is sampled here only when difficulty calls for it.
      let P = node.pens,
        who = 1 - node.mover,
        terminal = node.terminal;
      for (let step = 0; !terminal && step < cfg.rolloutDepth; step++) {
        const actions = actsFor(P, who);
        if (!actions.length) break;
        const act = actions[Math.floor(ctx.rng() * actions.length)];
        const fired = ctx.noise ? PF.noisy(act, ctx.noise, ctx.rng) : act;
        P = PF.shoot(P, who, fired, shotOptions).pens;
        ctx.sims++;
        who = 1 - who;
        terminal = P[0].out || P[1].out;
      }
      const reward = PF.E(P, me, ctx);
      for (const n of path) {
        n.N++;
        n.W += n.mover === me ? reward : 1 - reward;
      }
      if ((it & 15) === 0) {
        live.stats = stats(ctx);
        live.extra.iter = root.N;
        fillMcts();
        yield* slice(ctx);
      }
    }
    function fillMcts() {
      const total = Math.max(1, root.N);
      live.moves = root.kids
        .map((k) => ({
          label: k.act.label,
          score: (k.W / k.N) * 100,
          visits: k.N,
          act: k.act,
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 8);
      visible.forEach((node, index) => {
        const view = live.nodes[index];
        view.n = node.N;
        view.reward = node.W;
        if (index > 0) view.v = (node.W / node.N) * 100;
      });
      live.extra.total = total;
    }
    fillMcts();
    const minV = Math.max(4, root.N * 0.04);
    const pool = root.kids.filter((k) => k.N >= minV);
    const bestK = (pool.length ? pool : root.kids).reduce(
      (b, k) =>
        !b || (cfg.pickVisits ? k.N > b.N : k.W / k.N > b.W / b.N) ? k : b,
      null,
    );
    const selAct = bestK ? bestK.act : rootActs[0];
    live.moves.forEach((m) => {
      m.selected = m.act.key === selAct.key;
    });
    if (!live.moves.some((m) => m.selected)) {
      live.moves.unshift({
        label: selAct.label,
        score: bestK ? (bestK.W / bestK.N) * 100 : 50,
        visits: bestK ? bestK.N : 0,
        act: selAct,
        selected: true,
      });
    }
    live.selected = selAct;
    live.extra.iters = root.N;
    return { action: selAct, moves: live.moves };
  }
  return { mctsAI };
}
