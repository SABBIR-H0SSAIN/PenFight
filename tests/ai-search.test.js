import test from "node:test";
import assert from "node:assert/strict";
import { createUninformedStrategy } from "../src/game/ai/strategies/uninformed.js";
import { createMinimaxStrategy } from "../src/game/ai/strategies/minimax.js";
import { createSearchStrategy } from "../src/game/ai/strategies/search.js";
import { createMctsStrategy } from "../src/game/ai/strategies/mcts.js";
import { createGameEngine } from "../src/game/engine.js";

function run(generator) {
  let step;
  do {
    step = generator.next();
  } while (!step.done);
  return step.value;
}
function setup(goal = "1,2,3,2", risk = 0) {
  const ctx = {
    nodes: 0,
    evals: 0,
    sims: 0,
    live: { nodes: [], moves: [], extra: {} },
  };
  const helpers = {
    clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
    makeAction: (_state, _me, ...choices) => ({
      key: choices.join(","),
      label: choices.join(","),
    }),
    ANGS: [-0.07, 0, 0.07],
    POWS: [0.35, 0.5, 0.62, 0.74],
    OFFS: [-0.7, 0, 0.7],
    TNAME: ["attack", "guard"],
    LV: [2, 3, 4, 3],
    ev: (_state, _me, act, ctx, samples) => {
      ctx.evals++;
      ctx.sims += samples;
      return {
        score: act.key === goal ? 100 : 20,
        pSucc: act.key === goal ? 1 : 0,
        pSelf: risk,
        pHit: 1,
      };
    },
    topMoves: (list, n) =>
      list
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, n),
    movesFrom: (list, selected) =>
      list.map((m) => ({ ...m, selected: m.act.key === selected })),
    slice: function* () {
      yield null;
    },
  };
  return { ctx, helpers, ...createUninformedStrategy(helpers) };
}

test("registered algorithms and difficulty defaults match the allowed set", () => {
  const engine = createGameEngine();
  assert.deepEqual(
    Object.keys(engine.ALGOS).sort(),
    ["dfs", "best", "astar", "minimax", "mcts", "fuzzy"].sort(),
  );
  assert.deepEqual(
    Object.keys(engine.SHORT).sort(),
    Object.keys(engine.ALGOS).sort(),
  );
  for (const level of Object.values(engine.LEVELS))
    assert.ok(Object.hasOwn(engine.ALGOS, level.algo));
  assert.equal(engine.LEVELS.expert.algo, "mcts");
});
test("DFS reaches an attacking leaf before defensive branches and stops at a verified goal", () => {
  const { ctx, depthSearch } = setup("0,2,3,2");
  const result = run(depthSearch({}, 0, { leafBudget: 20 }, ctx));
  assert.equal(result.action.key, "0,2,3,2");
  assert.equal(ctx.evals, 1);
  assert.equal(ctx.live.extra.found, true);
});
test("minimax chooses the best worst-case reply rather than the expected reply", () => {
  const { ctx, helpers } = setup();
  const actions = [
    { key: "A", label: "A" },
    { key: "B", label: "B" },
  ];
  const replies = [
    { key: "bad", label: "bad" },
    { key: "good", label: "good" },
  ];
  const utilities = { A: { bad: 0.1, good: 0.9 }, B: { bad: 0.4, good: 0.5 } };
  const PF = {
    allActions: () => actions,
    quickActions: () => replies,
    shoot: (pens, _who, act) => ({
      pens: pens.branch
        ? {
            branch: pens.branch,
            value: utilities[pens.branch][act.key],
            0: { out: true },
            1: {},
          }
        : { branch: act.key, 0: {}, 1: {} },
    }),
    E: (pens) => pens.value ?? 0.5,
  };
  const { minimaxAI } = createMinimaxStrategy({
    ...helpers,
    PF,
    ev: (_state, _me, act) => ({
      score: act.key === "A" ? 90 : 80,
      pSucc: 0,
      pHit: 1,
      pSelf: 0,
    }),
  });
  const result = run(
    minimaxAI(
      { pens: { 0: {}, 1: {} } },
      0,
      { depth: 2, beam: 2, maxVisibleNodes: 1 },
      ctx,
    ),
  );
  assert.equal(result.action.key, "B");
  assert.equal(result.moves[0].score, 40);
  assert.equal(ctx.live.extra.worstReply, "bad");
  assert.equal(
    ctx.live.nodes.length,
    1,
    "display cap does not truncate minimax search",
  );
});
test("obsolete decision identifiers resolve to the supported A* default", () => {
  const engine = createGameEngine();
  const state = engine.newState(["ball", "gel"], engine.rng(31), 0);
  for (const algo of [
    "dls",
    "iddfs",
    "bidirectional",
    "bfs",
    "planner",
    "hybrid",
    "unknown",
  ]) {
    const result = engine.runSync(
      engine.decide(state, 0, { algo, seed: 42, budgetScale: 0.02 }),
    );
    assert.equal(result.info.algo, "astar");
    assert.ok(Number.isFinite(result.action.pow));
  }
});

test("DFS respects configured shallow and zero depth limits", () => {
  for (const depthLimit of [0, 2]) {
    const { ctx, depthSearch } = setup();
    const result = run(depthSearch({}, 0, { depthLimit }, ctx));
    assert.ok(ctx.live.nodes.every((n) => n.d <= depthLimit));
    assert.equal(ctx.live.extra.cutoff, true);
    assert.equal(ctx.live.extra.found, false);
    assert.equal(ctx.evals, 1);
    assert.ok(result.action.key);
  }
});

test("best-first and A* respect depth limits and keep a playable fallback", () => {
  for (const astar of [false, true]) {
    for (const depthLimit of [0, 2, 4]) {
      const { ctx, helpers } = setup();
      const { informed } = createSearchStrategy(helpers);
      const result = run(
        informed({}, 0, { depthLimit, evalBudget: 1000 }, ctx, astar),
      );
      assert.ok(ctx.live.nodes.every((n) => n.d <= depthLimit));
      assert.equal(ctx.live.extra.cutoff, depthLimit < 4);
      assert.equal(ctx.live.extra.found, depthLimit === 4);
      assert.ok(result.action.key);
    }
  }
});

test("MCTS rollout depth changes simulation work independently of visible nodes", () => {
  for (const rolloutDepth of [0, 2]) {
    const { ctx, helpers } = setup();
    ctx.rng = () => 0;
    const action = { key: "shot", label: "shot" };
    const pens = { 0: {}, 1: {} };
    const { mctsAI } = createMctsStrategy({
      ...helpers,
      ev: () => ({ score: 50 }),
      stats: () => ({}),
      PF: {
        allActions: () => [action],
        quickActions: () => [action],
        shoot: () => ({ pens }),
        E: () => 0.5,
      },
    });
    const result = run(
      mctsAI(
        { pens },
        0,
        {
          iters: 1,
          depth: 1,
          rolloutDepth,
          maxVisibleNodes: 1,
        },
        ctx,
      ),
    );
    assert.equal(ctx.sims, 1 + rolloutDepth);
    assert.equal(ctx.live.nodes.length, 1);
    assert.equal(result.action.key, "shot");
  }
});

test("recorded A* costs and MCTS visits describe the actual selected shots", () => {
  const engine = createGameEngine();
  const state = engine.newState(["ball", "gel"], engine._internals.rng(42), 0);
  const astar = run(engine.decide(state, 0, { algo: "astar", seed: 42 }));
  const leaf = astar.info.nodes.find(
    (node) => node.actionKey === astar.action.key,
  );
  assert.ok(leaf, "the selected shot should point to an actual tree leaf");
  assert.equal(leaf.f, leaf.g + leaf.h);
  const mcts = run(
    engine.decide(state, 0, { algo: "mcts", seed: 42, iters: 40 }),
  );
  const chosen = mcts.info.moves.find((move) => move.selected);
  const branch = mcts.info.nodes.find(
    (node) => node.d === 1 && node.actionKey === mcts.action.key,
  );
  assert.ok(branch);
  assert.equal(branch.n, chosen.visits);
  assert.equal(branch.v, (branch.reward / branch.n) * 100);
  assert.equal(chosen.prob, undefined);
});

test("greedy chooses the lowest h while A* can prefer a lower g + h", () => {
  for (const astar of [false, true]) {
    const { ctx, helpers } = setup();
    const { informed } = createSearchStrategy({
      ...helpers,
      ev: (_state, _me, act) => ({
        score: act.key.startsWith("1,") ? 52 : 50,
        pSucc: 0,
        pSelf: 0,
      }),
    });
    run(informed({}, 0, { evalBudget: 3, goal: 0 }, ctx, astar));
    const firstTarget = ctx.live.nodes.find((node) => node.order === 2);
    assert.equal(firstTarget.label, astar ? "attack" : "guard");
    assert.equal(ctx.live.extra.found, false);
  }
});

test("MCTS reuses board positions and learns to avoid a strong opponent reply", () => {
  const { ctx, helpers } = setup();
  ctx.rng = () => 0.2;
  ctx.noise = { a: 0.1, p: 0.1 };
  const action = (key) => ({ key, label: key });
  const values = {
    trap: { punish: 0, miss: 1 },
    safe: { punish: 0.4, miss: 0.6 },
  };
  const root = [{}, {}];
  const transitions = new Set();
  const { mctsAI } = createMctsStrategy({
    ...helpers,
    ev: (_state, _me, act) => ({ score: act.key === "trap" ? 90 : 80 }),
    stats: () => ({}),
    PF: {
      allActions: () => [action("trap"), action("safe")],
      quickActions: ({ pens }) =>
        ["miss", "punish"].map((key) => ({
          ...action(key),
          parent: pens,
        })),
      shoot(pens, who, act, options) {
        assert.equal(options.noise, undefined);
        const transition = who === 0 ? act.key : `${pens.branch}/${act.key}`;
        assert.ok(
          !transitions.has(transition),
          "tree edge should be simulated only once",
        );
        transitions.add(transition);
        if (who === 1) assert.equal(act.parent, pens);
        const next = [{ out: who === 1 }, {}];
        next.branch = who === 0 ? act.key : pens.branch;
        next.value = who === 1 ? values[pens.branch][act.key] : 0.5;
        return { pens: next };
      },
      E: (pens) => pens.value,
    },
  });
  const result = run(
    mctsAI(
      { pens: root },
      0,
      {
        depth: 2,
        rolloutDepth: 0,
        rootK: 2,
        iters: 180,
        c: 0.5,
      },
      ctx,
    ),
  );
  assert.equal(result.action.key, "safe");
  assert.equal(transitions.size, 6);
  for (const branch of ctx.live.nodes.filter((node) => node.d === 1)) {
    const punish = ctx.live.nodes.find(
      (node) => node.p === branch.id && node.label === "punish",
    );
    const miss = ctx.live.nodes.find(
      (node) => node.p === branch.id && node.label === "miss",
    );
    assert.ok(
      punish.n > miss.n,
      "opponent selection must favor its own reward",
    );
  }
});

test("all six strategies hit a reproducible straight shot from either side", () => {
  const engine = createGameEngine();
  for (const me of [0, 1]) {
    const state = engine.newState(["ball", "gel"], engine.rng(0), me);
    state.pens[me] = engine.makePen("ball", 30, me ? 60 : 40, Math.PI / 2);
    state.pens[1 - me] = engine.makePen("gel", 30, me ? 81 : 19, 0);
    for (const algo of Object.keys(engine.ALGOS)) {
      const decision = run(engine.decide(state, me, { algo, seed: 0 }));
      const shot = engine.shoot(state.pens, me, decision.action);
      assert.ok(
        shot.hit,
        `${algo} player ${me} should contact the opposing pen`,
      );
      assert.equal(
        shot.out,
        1 - me,
        `${algo} player ${me} should finish the knockout`,
      );
    }
  }
});

test("fuzzy rules cover distance, risk and confidence and favor defense near the edge", () => {
  const engine = createGameEngine();
  for (let distance = 0; distance <= 115; distance += 5)
    for (let risk = 0; risk <= 10; risk++)
      for (let confidence = 0; confidence <= 10; confidence++) {
        const { fired, out } = engine.fuzzy(
          distance,
          risk / 10,
          confidence / 10,
        );
        assert.ok(fired.length > 0);
        for (const value of [out.power, out.attack, out.defend])
          assert.ok(value >= 0 && value <= 1);
      }
  assert.equal(engine.fuzzy(20, 0, 0.5).out.strategy, "Attack");
  assert.equal(engine.fuzzy(20, 1, 0.5).out.strategy, "Defend");
});
