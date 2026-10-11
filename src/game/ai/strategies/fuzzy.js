/** fuzzy decision logic; no React or browser state. */
export function createFuzzyStrategy({ PF, clamp, makeAction, ev, slice }) {
  function trap(x, a, b, c, d) {
    if (x <= a || x >= d)
      return x === b || x === c
        ? 1
        : x <= a && a === b
          ? 1
          : x >= d && c === d
            ? 1
            : 0;
    if (x >= b && x <= c) return 1;
    return x < b ? (x - a) / (b - a) : (d - x) / (d - c);
  }
  const FZ_IN = {
    dist: {
      near: (x) => trap(x, -1, -1, 15, 30),
      medium: (x) => trap(x, 15, 30, 40, 55),
      far: (x) => trap(x, 40, 55, 300, 300),
    },
    risk: {
      low: (x) => trap(x, -1, -1, 0.2, 0.5),
      medium: (x) => trap(x, 0.2, 0.5, 0.5, 0.8),
      high: (x) => trap(x, 0.5, 0.8, 2, 2),
    },
    conf: {
      low: (x) => trap(x, -1, -1, 0.2, 0.5),
      medium: (x) => trap(x, 0.2, 0.5, 0.5, 0.8),
      high: (x) => trap(x, 0.5, 0.8, 2, 2),
    },
  };
  const FZ_OUT = {
    low: (x) => trap(x, -1, -1, 0.15, 0.5),
    medium: (x) => trap(x, 0.2, 0.5, 0.5, 0.8),
    high: (x) => trap(x, 0.5, 0.85, 2, 2),
  };
  const RULES = [
    ["near", "low", null, "low", "high", "low"],
    ["near", "medium", null, "low", "medium", "medium"],
    ["near", "high", null, "low", "low", "high"],
    ["medium", "low", "high", "medium", "high", "low"],
    ["medium", "low", "medium", "medium", "medium", "low"],
    ["medium", "low", "low", "medium", "medium", "medium"],
    ["medium", "medium", null, "medium", "medium", "medium"],
    ["medium", "high", null, "low", "low", "high"],
    ["far", "low", "high", "high", "high", "low"],
    ["far", "low", "medium", "high", "medium", "low"],
    ["far", "low", "low", "medium", "medium", "medium"],
    ["far", "medium", "high", "high", "medium", "medium"],
    ["far", "medium", "medium", "medium", "medium", "medium"],
    ["far", "medium", "low", "medium", "low", "medium"],
    ["far", "high", null, "medium", "low", "high"],
  ];
  PF.fuzzy = function (dist, risk, conf) {
    const mu = { dist: {}, risk: {}, conf: {} };
    for (const k in FZ_IN.dist) mu.dist[k] = FZ_IN.dist[k](dist);
    for (const k in FZ_IN.risk) mu.risk[k] = FZ_IN.risk[k](risk);
    for (const k in FZ_IN.conf) mu.conf[k] = FZ_IN.conf[k](conf);
    const agg = {
      power: { low: 0, medium: 0, high: 0 },
      attack: { low: 0, medium: 0, high: 0 },
      defend: { low: 0, medium: 0, high: 0 },
    };
    const fired = [];
    RULES.forEach((r, i) => {
      const f = Math.min(
        mu.dist[r[0]],
        mu.risk[r[1]],
        r[2] ? mu.conf[r[2]] : 1,
      );
      if (f > 0.001) {
        agg.power[r[3]] = Math.max(agg.power[r[3]], f);
        agg.attack[r[4]] = Math.max(agg.attack[r[4]], f);
        agg.defend[r[5]] = Math.max(agg.defend[r[5]], f);
        fired.push({
          i,
          f,
          text:
            "IF distance " +
            r[0] +
            ", risk " +
            r[1] +
            (r[2] ? ", confidence " + r[2] : "") +
            " THEN power " +
            r[3] +
            ", attack " +
            r[4] +
            ", defend " +
            r[5],
        });
      }
    });
    const cen = (a) => {
      let n = 0,
        d = 0;
      for (let x = 0; x <= 1.0001; x += 0.05) {
        let m = 0;
        for (const k in a) m = Math.max(m, Math.min(a[k], FZ_OUT[k](x)));
        n += x * m;
        d += m;
      }
      return d ? n / d : 0.5;
    };
    const out = {
      power: cen(agg.power),
      attack: cen(agg.attack),
      defend: cen(agg.defend),
    };
    out.strategy = out.attack >= out.defend ? "Attack" : "Defend";
    return { mu, out, fired: fired.sort((a, b) => b.f - a.f) };
  };
  function* fuzzyAI(state, me, cfg, ctx) {
    const s = state.pens[me],
      o = state.pens[1 - me],
      live = ctx.live;
    const dist = Math.hypot(s.x - o.x, s.y - o.y),
      risk = clamp(1 - PF.margin(s) / 20, 0, 1);
    const conf = ctx.mem ? ctx.mem.conf : 0.5;
    const fz = PF.fuzzy(dist, risk, conf);
    live.extra.fuzzy = { in: { dist, risk, conf }, ...fz };
    const reach = PF.reachPower(s, dist - s.L / 2 - o.L / 2 + 6);
    const atkPow = clamp(reach * (0.85 + 0.5 * fz.out.power), 0.2, 1);
    const A = makeAction(state, me, 0, 1, 0, 1);
    A.pow = atkPow;
    A.label = "Attack: opp centre, P" + Math.round(atkPow * 100);
    const D = makeAction(state, me, 4, 1, 0, 1);
    D.pow = clamp(0.25 + 0.2 * fz.out.power, 0.2, 0.5);
    D.label = "Defend: home guard, P" + Math.round(D.pow * 100);
    const rA = ev(state, me, A, ctx, 3),
      rD = ev(state, me, D, ctx, 3);
    const sc = { A: fz.out.attack * 100, D: fz.out.defend * 100 };
    live.moves = [
      {
        label: A.label,
        score: sc.A,
        prob: rA.pSucc,
        hit: rA.pHit,
        risk: rA.pSelf,
        act: A,
        selected: sc.A >= sc.D,
      },
      {
        label: D.label,
        score: sc.D,
        prob: rD.pSucc,
        hit: rD.pHit,
        risk: rD.pSelf,
        act: D,
        selected: sc.A < sc.D,
      },
    ];
    live.nodes.push(
      { id: 0, p: -1, d: 0, label: "fuzzy", order: 1 },
      { id: 1, p: 0, d: 1, label: "Attack", v: sc.A, order: 2 },
      { id: 2, p: 0, d: 1, label: "Defend", v: sc.D, order: 3 },
    );
    const act = sc.A >= sc.D ? A : D;
    live.selected = act;
    yield* slice(ctx);
    return { action: act, moves: live.moves };
  }
  return { fuzzyAI };
}
