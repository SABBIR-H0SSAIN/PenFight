/** mcts decision logic; no React or browser state. */
export function createMctsStrategy({ PF, ev, topMoves, slice, stats }) {
  function* mctsAI(state, me, cfg, ctx) {
    const live = ctx.live,
      N = cfg.iters || 1500,
      C = cfg.c || 0.8,
      maxD = cfg.depth || 3;
    // root prior: best K actions by deterministic heuristic
    const all = PF.allActions(state, me),
      scored = [];
    for (const a of all) {
      const r = ev(state, me, a, ctx, 1);
      scored.push({ act: a, ...r });
      if ((scored.length & 31) === 0) yield* slice(ctx);
    }
    const rootActs = topMoves(scored, cfg.rootK || 24).map((m) => m.act);
    const root = {
      mover: 1 - me,
      N: 0,
      W: 0,
      kids: [],
      untried: rootActs.slice(),
      parent: null,
      id: 0,
      d: 0,
    };
    live.nodes.push({ id: 0, p: -1, d: 0, label: "root", order: 0, n: 0 });
    let nid = 1;
    const nz = ctx.noise || { a: 0.02, p: 0.04 };
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
      let node = root,
        P = state.pens,
        who = me,
        depth = 0,
        term = false;
      const path = [root];
      // selection
      while (!node.untried.length && node.kids.length && depth < maxD) {
        let best = null,
          bv = -1;
        for (const k of node.kids) {
          const u = k.W / k.N + C * Math.sqrt(Math.log(node.N + 1) / k.N);
          if (u > bv) {
            bv = u;
            best = k;
          }
        }
        const r = PF.shoot(P, who, best.act, {
          noise: nz,
          rng: ctx.rng,
          maxT: 3.6,
        });
        ctx.sims++;
        P = r.pens;
        who = 1 - who;
        node = best;
        depth++;
        path.push(node);
        if (P[0].out || P[1].out) {
          term = true;
          break;
        }
      }
      // expansion
      if (!term && depth < maxD && node.untried.length) {
        const idx = Math.floor(ctx.rng() * node.untried.length);
        const act = node.untried.splice(idx, 1)[0];
        const r = PF.shoot(P, who, act, { noise: nz, rng: ctx.rng, maxT: 3.6 });
        ctx.sims++;
        const kid = {
          mover: who,
          act,
          N: 0,
          W: 0,
          kids: [],
          untried: null,
          parent: node,
          id: nid++,
          d: depth + 1,
        };
        P = r.pens;
        who = 1 - who;
        depth++;
        kid.untried =
          P[0].out || P[1].out || depth >= maxD ? [] : actsFor(P, who);
        node.kids.push(kid);
        node = kid;
        path.push(node);
        ctx.nodes++;
        if (P[0].out || P[1].out) term = true;
        if (live.nodes.length < 420)
          live.nodes.push({
            id: kid.id,
            p: kid.parent.id,
            d: kid.d,
            label: act.label.length > 16 ? act.label.slice(0, 16) : act.label,
            order: it,
            n: 0,
          });
      }
      // rollout (one random ply each, up to depth limit + 1)
      let steps = 0;
      while (!term && steps < 1 && depth < maxD + 1) {
        const as = actsFor(P, who);
        const a = as[Math.floor(ctx.rng() * as.length)];
        const r = PF.shoot(P, who, a, { noise: nz, rng: ctx.rng, maxT: 3.6 });
        ctx.sims++;
        P = r.pens;
        who = 1 - who;
        depth++;
        steps++;
        if (P[0].out || P[1].out) term = true;
      }
      const reward = PF.E(P, me, ctx);
      for (const n of path) {
        n.N++;
        n.W += n.mover === me ? reward : 1 - reward;
      }
      if ((it & 15) === 0) {
        live.stats = stats(ctx);
        live.extra.iter = it;
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
          prob: k.W / k.N,
          visits: k.N,
          act: k.act,
          hit: 0,
          risk: 0,
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 8);
      for (const k of root.kids) {
        const n = live.nodes[k.id];
        if (n) {
          n.n = k.N;
          n.v = (k.W / k.N) * 100;
        }
      }
      for (let i = 1; i < live.nodes.length; i++) {
        const nn = live.nodes[i];
        nn.v = nn.v;
      }
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
        prob: bestK ? bestK.W / bestK.N : 0.5,
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
