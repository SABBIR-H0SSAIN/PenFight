/** Headless matches share the playable game’s physics and knock-off rule. */
export function installHeadlessMatches(PF) {
  const { rng, now, clamp } = PF._internals;
  /* ================================================= headless match helpers */
  PF.playRound = function* (cfgs, opts) {
    opts = opts || {};
    const r = rng(opts.seed || 1234);
    const types = opts.types || ["ball", "gel"];
    const state = PF.newState(types, r, opts.first || 0);
    const mem = [PF.newMemory("advanced"), PF.newMemory("advanced")];
    let turns = 0;
    // Exactly the same win condition as the playable game: knock a pen off.
    // There is deliberately NO maximum number of flicks and NO centre tiebreak.
    for (;;) {
      const me = state.turn,
        cfg = Object.assign({}, cfgs[me], {
          mem: mem[me],
          seed: (opts.seed || 1) * 31 + turns,
          budgetScale: opts.budgetScale,
        });
      const t0 = now();
      const d = yield* PF.decide(state, me, cfg);
      const dt = now() - t0;
      if (opts.onDecision) opts.onDecision(me, dt, d.info);
      const act = PF.noisy(d.action, cfgs[me].noise, r);
      // Premium Pen's one-time surge also works in headless matches.
      if (state.surge[me] && state.flicks[me] >= 2) {
        act.surge = true;
        state.surge[me] = false;
      }
      const res = PF.shoot(state.pens, me, act, { maxT: 4.8 });
      mem[me].conf = clamp(mem[me].conf + (res.hit ? 0.15 : -0.1), 0.05, 1);
      state.pens = res.pens;
      state.turn = 1 - me;
      state.flicks[me]++;
      turns++;
      if (res.out >= 0) return { winner: 1 - res.out, how: "out", turns };
      // A yield per flick lets the browser repaint and the Stop button cancel.
      yield { roundInProgress: true, turns };
    }
  };
}
