import {
  PEN_DEFINITIONS,
  CUSTOM_PEN_COLORS,
} from "../../features/pen/catalog.js";

export function createPhysics() {
  const PF = {};
  PF.REAL = true;
  PF.setRealism = (v) => {
    PF.REAL = !!v;
  };
  // Shared by gameplay, AI simulations and benchmarks. Calibrated default is
  // 98% of the former friction: slightly more slide, without the one-shot
  // knock-off regression that occurred with experimental independent rolling.
  PF.FRICTION = 0.98;
  PF.setFriction = function (value) {
    const num = Number(value);
    PF.FRICTION = Number.isFinite(num)
      ? Math.max(0.8, Math.min(1.1, num))
      : 0.98;
  };
  const W = 60,
    H = 100,
    G = 981,
    VMAX = 210,
    SPIN = 0.12,
    DT = 1 / 200;
  PF.TABLE = { w: W, h: H };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const now = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();
  PF.clamp = clamp;
  PF.now = now;

  function rng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    let u = 0;
    while (!u) u = r();
    const v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  PF.rng = rng;
  PF.gauss = gauss;

  /* ------------------------------------------------------------------ pens */
  PF.PENS = PEN_DEFINITIONS;
  PF.PEN_CUSTOM = CUSTOM_PEN_COLORS;
  function makePen(type, x, y, a) {
    const T = PF.PENS[type];
    return {
      type,
      x,
      y,
      a,
      vx: 0,
      vy: 0,
      w: 0,
      z: 0,
      vz: 0,
      out: false,
      outT: 0,
      L: T.len,
      r: T.r,
      m: T.mass,
      I: (T.mass * T.len * T.len) / 12,
      mu: T.mu,
      e: T.e,
      spd: T.speed,
      ang: T.ang,
      roll: 0,
      rr: T.roll,
    };
  }
  PF.makePen = makePen;

  PF.newState = function (types, r, firstTurn) {
    r = r || Math.random;
    const jit = () => r() - 0.5;
    const p0 = makePen(
      types[0],
      30 + jit() * 18,
      67 + jit() * 6,
      -Math.PI / 2 + jit() * 1.2,
    );
    const p1 = makePen(
      types[1],
      30 + jit() * 18,
      33 + jit() * 6,
      Math.PI / 2 + jit() * 1.2,
    );
    return {
      pens: [p0, p1],
      turn: firstTurn || 0,
      flicks: [0, 0],
      round: 1,
      surge: [types[0] === "premium", types[1] === "premium"],
    };
  };
  PF.cloneState = (s) => ({
    pens: s.pens.map((p) => Object.assign({}, p)),
    turn: s.turn,
    flicks: s.flicks.slice(),
    round: s.round,
    surge: s.surge.slice(),
  });
  PF.margin = (p) => Math.min(p.x, W - p.x, p.y, H - p.y);

  /* --------------------------------------------------------------- physics */
  function segClosest(p1x, p1y, q1x, q1y, p2x, p2y, q2x, q2y, o) {
    const ux = q1x - p1x,
      uy = q1y - p1y,
      vx = q2x - p2x,
      vy = q2y - p2y;
    const rx = p1x - p2x,
      ry = p1y - p2y;
    const a = ux * ux + uy * uy,
      e = vx * vx + vy * vy;
    const b = ux * vx + uy * vy,
      c = ux * rx + uy * ry,
      f = vx * rx + vy * ry;
    const EPS = 1e-12;
    let s = 0,
      t = 0;
    if (a < EPS && e < EPS) {
      /* both degenerate */
    } else if (a < EPS) t = clamp(f / e, 0, 1);
    else if (e < EPS) s = clamp(-c / a, 0, 1);
    else {
      const den = a * e - b * b;
      if (den <= 1e-8 * a * e) {
        const lo = Math.max(0, Math.min(-c / a, (b - c) / a));
        const hi = Math.min(1, Math.max(-c / a, (b - c) / a));
        if (lo <= hi) {
          s = (lo + hi) * 0.5;
          t = clamp((b * s + f) / e, 0, 1);
        } else {
          // Disjoint projections: take the closest endpoint and clamp onto B.
          s = clamp(-c / a, 0, 1);
          t = clamp((b * s + f) / e, 0, 1);
          s = clamp((b * t - c) / a, 0, 1);
        }
      } else {
        s = clamp((b * f - c * e) / den, 0, 1);
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = clamp(-c / a, 0, 1);
        } else if (t > 1) {
          t = 1;
          s = clamp((b - c) / a, 0, 1);
        }
      }
    }
    o[0] = p1x + ux * s;
    o[1] = p1y + uy * s;
    o[2] = p2x + vx * t;
    o[3] = p2y + vy * t;
  }
  const _c = [0, 0, 0, 0];
  PF.closestAxes = function (A, B) {
    const ca = Math.cos(A.a),
      sa = Math.sin(A.a),
      cb = Math.cos(B.a),
      sb = Math.sin(B.a);
    const o = [0, 0, 0, 0];
    segClosest(
      A.x - (ca * A.L) / 2,
      A.y - (sa * A.L) / 2,
      A.x + (ca * A.L) / 2,
      A.y + (sa * A.L) / 2,
      B.x - (cb * B.L) / 2,
      B.y - (sb * B.L) / 2,
      B.x + (cb * B.L) / 2,
      B.y + (sb * B.L) / 2,
      o,
    );
    return o;
  };

  function collide(A, B, c) {
    const ha = A.L / 2,
      hb = B.L / 2,
      ca = Math.cos(A.a),
      sa = Math.sin(A.a),
      cb = Math.cos(B.a),
      sb = Math.sin(B.a);
    segClosest(
      A.x - ca * ha,
      A.y - sa * ha,
      A.x + ca * ha,
      A.y + sa * ha,
      B.x - cb * hb,
      B.y - sb * hb,
      B.x + cb * hb,
      B.y + sb * hb,
      _c,
    );
    const dx = _c[0] - _c[2],
      dy = _c[1] - _c[3];
    const dist = Math.hypot(dx, dy),
      rad = A.r + B.r;
    const gap = dist - rad;
    if (gap < c.minGap) c.minGap = gap;
    if (gap >= 0) return;
    let nx, ny;
    if (dist > 1e-8) {
      nx = dx / dist;
      ny = dy / dist;
    } else {
      // Coincident axes: use their perpendicular (or relative normal speed)
      // rather than a random tip-to-tip direction.
      nx = -sa;
      ny = ca;
      const d = (A.x - B.x) * nx + (A.y - B.y) * ny;
      if (
        d < 0 ||
        (Math.abs(d) < 1e-8 && (A.vx - B.vx) * nx + (A.vy - B.vy) * ny > 0)
      ) {
        nx = -nx;
        ny = -ny;
      }
    }
    const cx = (_c[0] + _c[2]) / 2,
      cy = (_c[1] + _c[3]) / 2;
    const rAx = cx - A.x,
      rAy = cy - A.y,
      rBx = cx - B.x,
      rBy = cy - B.y;
    const rvx = A.vx - A.w * rAy - (B.vx - B.w * rBy);
    const rvy = A.vy + A.w * rAx - (B.vy + B.w * rBx);
    const vn = rvx * nx + rvy * ny;
    const penetration = rad - dist,
      invA = 1 / A.m,
      invB = 1 / B.m;
    // Inverse-mass positional correction, distributed across both bodies.
    const move = Math.max(0, penetration - 0.005) / (invA + invB);
    A.x += nx * move * invA;
    A.y += ny * move * invA;
    B.x -= nx * move * invB;
    B.y -= ny * move * invB;
    if (vn >= -0.02) return; // separating or resting: never inject an impact
    const speed = -vn,
      e =
        speed < 8
          ? 0
          : ((A.e + B.e) / 2) * (1 - 0.3 * Math.min(1, speed / 250));
    const rnA = rAx * ny - rAy * nx,
      rnB = rBx * ny - rBy * nx;
    const j =
      (-(1 + e) * vn) / (invA + invB + (rnA * rnA) / A.I + (rnB * rnB) / B.I);
    A.vx += j * nx * invA;
    A.vy += j * ny * invA;
    A.w += (rnA * j) / A.I;
    B.vx -= j * nx * invB;
    B.vy -= j * ny * invB;
    B.w -= (rnB * j) / B.I;
    // Coulomb tangential impulse dissipates tangential slip without creating energy.
    const tx = -ny,
      ty = nx;
    const rv2x = A.vx - A.w * rAy - (B.vx - B.w * rBy);
    const rv2y = A.vy + A.w * rAx - (B.vy + B.w * rBx);
    const vt = rv2x * tx + rv2y * ty;
    const rtA = rAx * ty - rAy * tx,
      rtB = rBx * ty - rBy * tx;
    let jt = -vt / (invA + invB + (rtA * rtA) / A.I + (rtB * rtB) / B.I);
    jt = clamp(jt, -0.25 * j, 0.25 * j);
    A.vx += jt * tx * invA;
    A.vy += jt * ty * invA;
    A.w += (rtA * jt) / A.I;
    B.vx -= jt * tx * invB;
    B.vy -= jt * ty * invB;
    B.w -= (rtB * jt) / B.I;
    if (!c.hit) {
      c.hit = true;
      c.firstHitT = c.t;
    }
    if (speed > c.maxImpact) c.maxImpact = speed;
    if (speed >= 2 && c.events.length < 24)
      c.events.push({ type: "hit", t: c.t, speed, x: cx, y: cy });
  }

  /* Desk surface: friction varies a little with position (worn patch, grain, stain ring). */
  function surface(x, y) {
    const dx = x - 18,
      dy = y - 70;
    return (
      1 +
      0.07 * Math.sin(x * 0.23 + 0.7) * Math.sin(y * 0.17 + 1.3) -
      0.14 * Math.exp(-(dx * dx + dy * dy) / 70) +
      0.1 * Math.exp(-((x - 38) * (x - 38) + (y - 20) * (y - 20)) / 40)
    );
  }
  PF.surface = surface;
  /* Coulomb friction sampled at 5 points along the barrel. Along the barrel the pen slides (mu); across it a round barrel rolls (mu * rr),
   so friction is anisotropic. Summing force and torque over the points couples sliding and spinning like a real contact patch. */
  function frictionReal(p, dt) {
    const ca = Math.cos(p.a),
      sa = Math.sin(p.a),
      g = p.mu * G * PF.FRICTION * surface(p.x, p.y),
      N = 5,
      ml = p.rr,
      eps = 2.2;
    let fx = 0,
      fy = 0,
      tq = 0;
    for (let k = 0; k < N; k++) {
      const s = ((k + 0.5) / N - 0.5) * p.L,
        rx = ca * s,
        ry = sa * s,
        vx = p.vx - p.w * ry,
        vy = p.vy + p.w * rx;
      const va = vx * ca + vy * sa,
        vl = -vx * sa + vy * ca,
        se = Math.sqrt(va * va + vl * vl + eps * eps);
      const fa = (-g * va) / se,
        fl = (-g * ml * vl) / se,
        ax = fa * ca - fl * sa,
        ay = fa * sa + fl * ca;
      fx += ax / N;
      fy += ay / N;
      tq += (rx * ay - ry * ax) / N;
    }
    p.vx += fx * dt;
    p.vy += fy * dt;
    p.w += (tq / ((p.L * p.L) / 12)) * dt;
    p.roll += ((-p.vx * sa + p.vy * ca) * dt) / p.r;
    if (p.vx * p.vx + p.vy * p.vy < 0.09 && Math.abs((p.w * p.L) / 2) < 0.3) {
      p.vx = 0;
      p.vy = 0;
      p.w = 0;
    }
  }
  // Track first centre-of-mass boundary crossing in a fixed integration step.
  // A draw is possible only when both leave at indistinguishable times.
  function firstEdgeCross(x0, y0, x1, y1) {
    let f = 1;
    if (x1 < 0 && x1 !== x0) f = Math.min(f, -x0 / (x1 - x0));
    if (x1 > W && x1 !== x0) f = Math.min(f, (W - x0) / (x1 - x0));
    if (y1 < 0 && y1 !== y0) f = Math.min(f, -y0 / (y1 - y0));
    if (y1 > H && y1 !== y0) f = Math.min(f, (H - y0) / (y1 - y0));
    return clamp(f, 0, 1);
  }
  function stepWorld(P, dt, c) {
    const previous = [
      [P[0].x, P[0].y],
      [P[1].x, P[1].y],
    ];
    for (let i = 0; i < 2; i++) {
      const p = P[i];
      if (p.out) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.a += p.w * dt;
        p.vz -= G * dt;
        p.z += p.vz * dt;
        if (p.z < -75) {
          p.z = -75;
          p.vz = 0;
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.w *= 0.92;
        }
        continue;
      }
      // Restore the PREVIOUS, tested, classic slide/roll model. The experimental
      // independent-barrel rolling solver caused too little resistance and
      // made opening-turn knock-offs far too frequent.
      if (PF.REAL) frictionReal(p, dt);
      else {
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 0) {
          const dec = p.mu * G * PF.FRICTION * dt;
          if (sp <= dec) {
            p.vx = 0;
            p.vy = 0;
          } else {
            const k = (sp - dec) / sp;
            p.vx *= k;
            p.vy *= k;
          }
        }
        if (p.w !== 0) {
          const dec = ((0.35 * 3 * p.mu * G * PF.FRICTION) / p.L) * dt;
          if (Math.abs(p.w) <= dec) p.w = 0;
          else p.w -= Math.sign(p.w) * dec;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.a += p.w * dt;
    }
    // Solve the contact before determining which pen lost desk support.
    if (!P[0].out && !P[1].out) collide(P[0], P[1], c);
    for (let i = 0; i < 2; i++) {
      const p = P[i];
      if (p.out || (p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H)) continue;
      const t =
        c.t + firstEdgeCross(previous[i][0], previous[i][1], p.x, p.y) * dt;
      p.out = true;
      p.outT = t;
      p.vz = 0;
      if (c.out < 0 || t < c.outT - 1e-6) {
        c.out = i;
        c.outT = t;
      } else if (Math.abs(t - c.outT) <= 1e-6) c.out = 2;
      if (c.events.length < 24)
        c.events.push({ type: "out", t, who: i, x: p.x, y: p.y });
    }
  }

  PF.flick = function (p, act, noise, r) {
    let ang = act.ang,
      pow = act.pow;
    if (noise && r) {
      ang += gauss(r) * noise.a;
      pow = clamp(pow * (1 + gauss(r) * noise.p), 0.05, 1.1);
    }
    const v = ((VMAX * pow * p.spd) / Math.sqrt(p.m)) * (act.surge ? 1.6 : 1);
    const dx = Math.cos(ang),
      dy = Math.sin(ang);
    p.vx += dx * v;
    p.vy += dy * v;
    const cross = Math.cos(p.a) * dy - Math.sin(p.a) * dx;
    p.w += ((6 * (act.off || 0) * cross * v) / p.L) * SPIN * p.ang;
    return { ang, pow, v };
  };

  /* Simulate one shot from a settled state. opts: noise, rng, record(dt), afterOut, maxT */
  PF.shoot = function (pens0, who, act, o) {
    o = o || {};
    const P = pens0.map((p) => Object.assign({}, p));
    const c = {
      t: 0,
      hit: false,
      firstHitT: -1,
      maxImpact: 0,
      minGap: 999,
      out: -1,
      outT: 0,
      events: [],
    };
    const fl = PF.flick(P[who], act, o.noise, o.rng);
    const maxT = o.maxT || 4.5,
      after = o.afterOut || 0;
    const rec = o.record ? [] : null;
    let recAcc = 0;
    if (rec) rec.push(snap(P, 0));
    let k = 0;
    while (c.t < maxT) {
      stepWorld(P, DT, c);
      c.t += DT;
      k++;
      if (rec) {
        recAcc += DT;
        if (recAcc >= o.record) {
          recAcc -= o.record;
          rec.push(snap(P, c.t));
        }
      }
      if (c.out >= 0 && c.t - c.outT >= after) break;
      if (k % 10 === 0 && c.out < 0) {
        let moving = false;
        for (let i = 0; i < 2; i++) {
          const p = P[i];
          if (p.vx * p.vx + p.vy * p.vy > 0.04 || Math.abs(p.w) > 0.02) {
            moving = true;
            break;
          }
        }
        if (!moving) break;
      }
    }
    if (rec) rec.push(snap(P, c.t));
    return {
      pens: P,
      out: c.out,
      hit: c.hit,
      firstHitT: c.firstHitT,
      maxImpact: c.maxImpact,
      minGap: c.minGap,
      t: c.t,
      events: c.events,
      rec,
      fired: fl,
    };
  };
  function snap(P, t) {
    return {
      t,
      p: P.map((p) => ({
        x: p.x,
        y: p.y,
        a: p.a,
        z: p.z,
        out: p.out,
        outT: p.outT,
        w: p.w,
        vx: p.vx,
        vy: p.vy,
        roll: p.roll,
      })),
    };
  }

  /* -------------------------------------------------------- state features */
  PF.E = function (P, me, o) {
    const s = P[me],
      t = P[1 - me];
    if (t.out && s.out) return 0.5;
    if (t.out) return 1;
    if (s.out) return 0;
    const wa = (o && o.wa) || 1,
      wd = (o && o.wd) || 1;
    const ms = PF.margin(s) / 30,
      mo = PF.margin(t) / 30;
    return clamp(0.5 + (0.5 * (wd * ms - wa * mo)) / Math.max(wa, wd), 0, 1);
  };
  // Rounds continue until a pen is knocked off; no shot-count tiebreaker.

  /* --------------------------------------------------------- action space */
  const TNAME = [
    "Opp centre",
    "Opp tip A",
    "Opp tip B",
    "Table centre",
    "Home guard",
  ];
  const ANGS = [-0.07, 0, 0.07],
    POWS = [0.35, 0.5, 0.62, 0.74, 0.86, 1.0],
    OFFS = [-0.7, 0, 0.7];
  PF.TNAME = TNAME;
  PF.ANGS = ANGS;
  PF.POWS = POWS;
  PF.OFFS = OFFS;
  const LV = [5, 3, 6, 3];
  function targetPoint(state, me, t) {
    const o = state.pens[1 - me];
    if (t === 0) return [o.x, o.y];
    if (t === 1 || t === 2) {
      const s = t === 1 ? 1 : -1,
        h = (o.L / 2) * 0.8;
      return [o.x + Math.cos(o.a) * h * s, o.y + Math.sin(o.a) * h * s];
    }
    if (t === 3) return [W / 2, H / 2];
    return [W / 2, me === 0 ? 72 : 28];
  }
  PF.targetPoint = targetPoint;
  function makeAction(state, me, ti, ai, pi, si) {
    const s = state.pens[me],
      tp = targetPoint(state, me, ti);
    const base = Math.atan2(tp[1] - s.y, tp[0] - s.x);
    const act = {
      ang: base + ANGS[ai],
      pow: POWS[pi],
      off: OFFS[si],
      t: ti,
      ai,
      pi,
      si,
    };
    act.key = ti + "." + ai + "." + pi + "." + si;
    act.label =
      TNAME[ti] +
      " " +
      (ANGS[ai] === 0
        ? "0°"
        : (ANGS[ai] > 0 ? "+" : "") + Math.round(ANGS[ai] * 57.3) + "°") +
      " P" +
      Math.round(POWS[pi] * 100) +
      " S" +
      (OFFS[si] === 0 ? "0" : OFFS[si] > 0 ? "+" : "-");
    act.surge = false;
    return act;
  }
  PF.makeAction = makeAction;
  PF.allActions = function (state, me) {
    const out = [];
    for (let t = 0; t < 5; t++)
      for (let a = 0; a < 3; a++)
        for (let p = 0; p < 6; p++)
          for (let s = 0; s < 3; s++)
            out.push(makeAction(state, me, t, a, p, s));
    return out;
  };
  PF.quickActions = function (state, me) {
    // reduced set used for deeper plies
    const out = [];
    for (const t of [0, 1, 2])
      for (const p of [1, 3, 5]) out.push(makeAction(state, me, t, 1, p, 1));
    out.push(makeAction(state, me, 4, 1, 0, 1));
    return out;
  };
  PF.reachPower = function (pen, dist) {
    // power needed for the pen to slide `dist` cm
    const v = Math.sqrt(2 * pen.mu * G * Math.max(dist, 1));
    return v / ((VMAX * pen.spd) / Math.sqrt(pen.m));
  };

  // Narrow bridge shared with the AI modules. The physics engine owns the common units and action helpers.
  PF._internals = {
    W,
    H,
    G,
    VMAX,
    SPIN,
    DT,
    clamp,
    now,
    rng,
    gauss,
    makePen,
    makeAction,
    targetPoint,
    ANGS,
    POWS,
    OFFS,
    TNAME,
    LV,
  };
  return PF;
}
