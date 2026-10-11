/** Score simulated shots without depending on presentation or browser APIs. */
export function createShotEvaluator(PF) {
  const { clamp } = PF._internals;
  return function (state, me, act, o) {
    const n = o.samples || 1;
    let sS = 0,
      sF = 0,
      sH = 0,
      sE = 0,
      sG = 0;
    for (let i = 0; i < n; i++) {
      const r = PF.shoot(state.pens, me, act, {
        noise: o.noise,
        rng: o.rng,
        maxT: 3.6,
      });
      if (r.out === 1 - me) sS++;
      if (r.out === me) sF++;
      if (r.hit) sH++;
      sE += PF.E(r.pens, me, o);
      sG += Math.min(1, Math.max(0, r.minGap) / 60);
    }
    const pSucc = sS / n,
      pSelf = sF / n,
      pHit = sH / n,
      E = sE / n,
      gap = sG / n;
    const h =
      0.3 * pSucc +
      0.2 * pHit +
      0.3 * E +
      0.1 * (1 - gap) +
      0.1 * (1 - pSelf) -
      0.5 * pSelf;
    return { score: clamp(h, 0, 1) * 100, pSucc, pHit, pSelf, E, gap };
  };
}
