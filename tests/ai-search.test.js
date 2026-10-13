import test from "node:test";
import assert from "node:assert/strict";
import { createUninformedStrategy } from "../src/game/ai/strategies/uninformed.js";
import { createMinimaxStrategy } from "../src/game/ai/strategies/minimax.js";
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
    [
      "dfs",
      "dls",
      "iddfs",
      "bidirectional",
      "best",
      "astar",
      "minimax",
      "mcts",
      "fuzzy",
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(engine.SHORT).sort(),
    Object.keys(engine.ALGOS).sort(),
  );
  for (const level of Object.values(engine.LEVELS))
    assert.ok(Object.hasOwn(engine.ALGOS, level.algo));
  assert.equal(engine.LEVELS.expert.algo, "mcts");
});
test("DFS uses the deepest LIFO branch and stops at a verified goal", () => {
  const { ctx, depthSearch } = setup();
  const result = run(depthSearch({}, 0, { leafBudget: 20 }, ctx, "dfs"));
  assert.equal(result.action.key, "1,2,3,2");
  assert.equal(ctx.evals, 1);
  assert.equal(ctx.live.extra.found, true);
});
test("DLS stops at the depth limit and reports cutoff with a playable fallback", () => {
  const { ctx, depthSearch } = setup();
  const result = run(
    depthSearch({}, 0, { leafBudget: 20, depthLimit: 2 }, ctx, "dls"),
  );
  assert.equal(ctx.live.extra.cutoff, true);
  assert.equal(ctx.live.extra.found, false);
  assert.ok(ctx.live.nodes.every((n) => n.d <= 2));
  assert.equal(ctx.evals, 1, "only the fixed fallback is simulated");
  assert.ok(result.action.key);
});
test("IDDFS increases depth limits from zero to a complete four-choice shot", () => {
  const { ctx, depthSearch } = setup();
  run(depthSearch({}, 0, { leafBudget: 20 }, ctx, "iddfs"));
  assert.equal(ctx.live.extra.iterations, 5);
  assert.equal(ctx.live.extra.depthLimit, 4);
  assert.equal(ctx.live.extra.found, true);
  assert.equal(ctx.evals, 1);
});
test("bidirectional frontiers meet through actual goal-prefix predecessors", () => {
  const { ctx, bidirectional } = setup("0,0,0,0");
  const result = run(bidirectional({}, 0, { leafBudget: 1 }, ctx));
  assert.equal(result.action.key, "0,0,0,0");
  assert.equal(ctx.live.extra.found, true);
  assert.equal(ctx.live.extra.meetingDepth, 2);
  assert.equal(ctx.live.extra.goalCandidates, 1);
  assert.equal(
    ctx.evals,
    1,
    "goal discovery is counted in the simulation budget",
  );
});
test("bidirectional search reports no goal when verified shots are unsafe", () => {
  const { ctx, bidirectional } = setup("0,0,0,0", 1);
  run(bidirectional({}, 0, { leafBudget: 1 }, ctx));
  assert.equal(ctx.live.extra.goalCandidates, 0);
  assert.equal(ctx.live.extra.found, false);
  assert.equal(ctx.live.extra.meetingDepth, undefined);
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
    minimaxAI({ pens: { 0: {}, 1: {} } }, 0, { depth: 2, beam: 2 }, ctx),
  );
  assert.equal(result.action.key, "B");
  assert.equal(result.moves[0].score, 40);
  assert.equal(ctx.live.extra.worstReply, "bad");
});
test("obsolete decision identifiers resolve to the supported A* default", () => {
  const engine = createGameEngine();
  const state = engine.newState(["ball", "gel"], engine.rng(31), 0);
  for (const algo of ["bfs", "planner", "hybrid", "unknown"]) {
    const result = engine.runSync(
      engine.decide(state, 0, { algo, seed: 42, budgetScale: 0.02 }),
    );
    assert.equal(result.info.algo, "astar");
    assert.ok(Number.isFinite(result.action.pow));
  }
});
