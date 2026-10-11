/** Per-decision state, cooperative yields, metrics, and candidate summaries. */
export function createSearchContext(PF) {
  const { rng, now } = PF._internals;
  function mkCtx(cfg, me) {
    const ctx = {
      rng: rng((cfg.seed || Date.now() & 0xffffff) + 17),
      noise: cfg.noise || null,
      sims: 0,
      evals: 0,
      nodes: 0,
      t0: now(),
      last: now(),
      wa: 1,
      wd: 1,
      me,
      cfg,
      mem: cfg.mem || null,
      live: {
        algo: cfg.algo,
        nodes: [],
        moves: [],
        stats: {},
        extra: {},
        selected: null,
      },
    };
    return ctx;
  }
  function* slice(ctx) {
    const t = now();
    if (t - ctx.last > 7) {
      ctx.last = t;
      ctx.live.stats = stats(ctx);
      yield ctx.live;
    }
  }
  function stats(ctx) {
    return {
      evals: ctx.evals,
      sims: ctx.sims,
      nodes: ctx.nodes,
      ms: Math.round(now() - ctx.t0),
    };
  }
  function ev(state, me, act, ctx, samples) {
    ctx.evals++;
    ctx.sims += samples;
    return PF.evalShot(state, me, act, {
      samples,
      noise: samples > 1 ? ctx.noise : null,
      rng: ctx.rng,
      wa: ctx.wa,
      wd: ctx.wd,
    });
  }
  function topMoves(list, k) {
    return list
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
  function movesFrom(list, selKey) {
    const shown = topMoves(list, 8);
    const chosen = selKey && list.find((m) => m.act.key === selKey);
    if (chosen && !shown.some((m) => m.act.key === selKey)) {
      if (shown.length >= 8) shown.pop();
      shown.push(chosen);
    }
    return shown.map((m) => ({
      label: m.act.label,
      score: m.score,
      prob: m.pSucc,
      hit: m.pHit,
      risk: m.pSelf,
      act: m.act,
      selected: m.act.key === selKey,
    }));
  }

  return { mkCtx, slice, stats, ev, topMoves, movesFrom };
}
