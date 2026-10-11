/** DFS, DLS, IDDFS and bidirectional search over the finite shot-action tree. */
export function createUninformedStrategy({
  clamp,
  makeAction,
  ANGS,
  POWS,
  OFFS,
  TNAME,
  LV,
  ev,
  topMoves,
  movesFrom,
  slice,
}) {
  const maxDepth = LV.length;
  const key = (choices) => choices.join(",");
  const actionFor = (state, me, choices) =>
    makeAction(
      state,
      me,
      choices[0] ?? 0,
      choices[1] ?? 1,
      choices[2] ?? 3,
      choices[3] ?? 1,
    );
  function labelFor(choices) {
    const value = choices.at(-1);
    switch (choices.length) {
      case 0:
        return "start";
      case 1:
        return TNAME[value];
      case 2:
        return (ANGS[value] * 57.3).toFixed(0) + "°";
      case 3:
        return "P" + Math.round(POWS[value] * 100);
      default:
        return "S" + (OFFS[value] === 0 ? "0" : OFFS[value] > 0 ? "+" : "-");
    }
  }
  const threshold = (cfg) => clamp(cfg.goal ?? 0.5, 0, 1);
  const isGoal = (result, cfg) =>
    result.pSucc >= threshold(cfg) && result.pSelf === 0;
  function finish(state, me, ctx, evaluated, found) {
    let best = found || topMoves(evaluated, 1)[0];
    if (!best) {
      const act = actionFor(state, me, []);
      best = { act, ...ev(state, me, act, ctx, 2) };
      evaluated.push(best);
    }
    ctx.live.moves = movesFrom(evaluated, best.act.key);
    ctx.live.selected = best.act;
    ctx.live.extra.found = Boolean(found);
    return { action: best.act, moves: ctx.live.moves };
  }
  function* depthPass(state, me, cfg, ctx, limit) {
    const live = ctx.live;
    live.nodes = [{ id: 0, p: -1, d: 0, label: "start", order: 0 }];
    const stack = [{ id: 0, choices: [] }];
    const evaluated = [];
    let found = null,
      cutoff = false,
      expanded = 0,
      order = 0;
    while (stack.length && evaluated.length < cfg.leafBudget) {
      const node = stack.pop();
      const depth = node.choices.length;
      live.nodes[node.id].order = ++order;
      ctx.nodes++;
      if (depth === maxDepth) {
        const act = actionFor(state, me, node.choices);
        const result = { act, ...ev(state, me, act, ctx, 2) };
        evaluated.push(result);
        live.nodes[node.id].v = result.score;
        if (isGoal(result, cfg)) {
          found = result;
          live.nodes[node.id].goal = true;
        }
      } else if (depth === limit) {
        cutoff = true;
      } else {
        expanded++;
        for (let i = 0; i < LV[depth]; i++) {
          const choices = node.choices.concat(i);
          const id = live.nodes.length;
          live.nodes.push({
            id,
            p: node.id,
            d: depth + 1,
            label: labelFor(choices),
            order: 0,
          });
          stack.push({ id, choices });
        }
      }
      Object.assign(live.extra, {
        frontier: stack.length,
        expanded,
        depthLimit: limit,
        cutoff,
        evaluated: evaluated.length,
      });
      live.moves = movesFrom(evaluated, found?.act.key);
      yield* slice(ctx);
      if (found) break;
    }
    live.extra.budgetExhausted =
      !found && stack.length > 0 && evaluated.length >= cfg.leafBudget;
    return { evaluated, found, cutoff };
  }
  function* depthSearch(state, me, cfg, ctx, mode) {
    cfg = { ...cfg, leafBudget: Math.max(1, cfg.leafBudget ?? 90) };
    const limit =
      mode === "dfs"
        ? maxDepth
        : clamp(Math.floor(cfg.depthLimit ?? maxDepth), 0, maxDepth);
    let result;
    if (mode === "iddfs") {
      for (let depth = 0; depth <= limit; depth++) {
        ctx.live.extra.iterations = depth + 1;
        result = yield* depthPass(state, me, cfg, ctx, depth);
        if (result.found || !result.cutoff || ctx.live.extra.budgetExhausted)
          break;
      }
    } else result = yield* depthPass(state, me, cfg, ctx, limit);
    return finish(state, me, ctx, result.evaluated, result.found);
  }
  function* choicesFrom(prefix = []) {
    if (prefix.length === maxDepth) {
      yield prefix;
      return;
    }
    for (let i = 0; i < LV[prefix.length]; i++)
      yield* choicesFrom(prefix.concat(i));
  }
  function* bidirectional(state, me, cfg, ctx) {
    const live = ctx.live,
      evaluated = [],
      goals = [];
    const budget = Math.max(1, cfg.leafBudget ?? 90);
    // Physics has no inverse transition. Define backward start states as verified
    // complete shots, then traverse their actual action-prefix predecessors.
    for (const choices of choicesFrom()) {
      if (evaluated.length >= budget) break;
      const act = actionFor(state, me, choices);
      const result = { act, ...ev(state, me, act, ctx, 2) };
      evaluated.push(result);
      if (isGoal(result, cfg)) goals.push({ choices, result });
      live.moves = movesFrom(evaluated, null);
      Object.assign(live.extra, {
        evaluated: evaluated.length,
        goalCandidates: goals.length,
      });
      yield* slice(ctx);
    }
    live.nodes = [];
    const nodes = new Map();
    function addNode(choices) {
      const k = key(choices);
      if (nodes.has(k)) return nodes.get(k);
      const parent = choices.length ? addNode(choices.slice(0, -1)) : null;
      const node = {
        id: live.nodes.length,
        p: parent?.id ?? -1,
        d: choices.length,
        label: labelFor(choices),
        order: 0,
      };
      live.nodes.push(node);
      nodes.set(k, node);
      return node;
    }
    addNode([]);
    let forward = [[]],
      backward = goals.slice(),
      found = null,
      order = 0;
    const seenForward = new Set([""]),
      seenBackward = new Map();
    for (const goal of goals) {
      seenBackward.set(key(goal.choices), goal.result);
      const node = addNode(goal.choices);
      node.goal = true;
      node.v = goal.result.score;
    }
    let expanded = 0;
    while (forward.length && backward.length && !found) {
      const nextForward = [];
      for (const choices of forward) {
        addNode(choices).order = ++order;
        ctx.nodes++;
        expanded++;
        if (seenBackward.has(key(choices))) {
          found = seenBackward.get(key(choices));
          break;
        }
        if (choices.length < maxDepth)
          for (let i = 0; i < LV[choices.length]; i++) {
            const child = choices.concat(i),
              k = key(child);
            addNode(child);
            if (seenForward.has(k)) continue;
            seenForward.add(k);
            nextForward.push(child);
            if (seenBackward.has(k)) {
              found = seenBackward.get(k);
              live.extra.meetingDepth = child.length;
              break;
            }
          }
        yield* slice(ctx);
        if (found) break;
      }
      forward = nextForward;
      const nextBackward = [];
      if (!found)
        for (const entry of backward) {
          addNode(entry.choices).order = ++order;
          ctx.nodes++;
          expanded++;
          if (!entry.choices.length) continue;
          const choices = entry.choices.slice(0, -1),
            k = key(choices);
          if (seenBackward.has(k)) continue;
          seenBackward.set(k, entry.result);
          nextBackward.push({ choices, result: entry.result });
          if (seenForward.has(k)) {
            found = entry.result;
            live.extra.meetingDepth = choices.length;
            break;
          }
          yield* slice(ctx);
        }
      backward = nextBackward;
      Object.assign(live.extra, {
        frontier: forward.length + backward.length,
        forwardFrontier: forward.length,
        backwardFrontier: backward.length,
        expanded,
      });
      yield* slice(ctx);
    }
    Object.assign(live.extra, {
      frontier: forward.length + backward.length,
      expanded,
    });
    return finish(state, me, ctx, evaluated, found);
  }
  return { depthSearch, bidirectional };
}
