/** Depth-limited MAX/MIN search over simulated shots, with worst-case replies. */
export function createMinimaxStrategy({ PF, ev, topMoves, slice }) {
  function* minimaxAI(state, me, cfg, ctx) {
    const live = ctx.live;
    const depth = Math.max(1, Math.floor(cfg.depth ?? 2));
    const beam = Math.max(1, Math.floor(cfg.beam ?? 8));
    const scored = [];
    for (const act of PF.allActions(state, me)) {
      scored.push({ act, ...ev(state, me, act, ctx, 1) });
      if ((scored.length & 31) === 0) yield* slice(ctx);
    }
    // The continuous physics action space is discretized and the root shortlist
    // is bounded. Within this tree, MAX chooses max and MIN chooses min.
    const candidates = topMoves(scored, beam);
    live.nodes.push({ id: 0, p: -1, d: 0, label: "AI (MAX)", order: 1 });
    function addNode(parent, level, act) {
      if (live.nodes.length >= 260) return null;
      const node = {
        id: live.nodes.length,
        p: parent,
        d: level,
        label: act.label.slice(0, 16),
        order: 0,
      };
      live.nodes.push(node);
      return node;
    }
    function* valueAfter(pens, who, remaining, parent, level) {
      ctx.nodes++;
      if (pens[0].out || pens[1].out || remaining === 0)
        return { value: PF.E(pens, me, ctx), reply: null };
      const actions = PF.quickActions(
        { pens, turn: who, flicks: [0, 0], round: 1, surge: [false, false] },
        who,
      );
      if (!actions.length) return { value: PF.E(pens, me, ctx), reply: null };
      const maximizing = who === me;
      let value = maximizing ? -Infinity : Infinity,
        reply = null;
      for (const act of actions) {
        const shot = PF.shoot(pens, who, act);
        ctx.sims++;
        const node = addNode(parent, level, act);
        const child = yield* valueAfter(
          shot.pens,
          1 - who,
          remaining - 1,
          node?.id ?? parent,
          level + 1,
        );
        if (node) node.v = child.value * 100;
        if (maximizing ? child.value > value : child.value < value) {
          value = child.value;
          reply = act;
        }
        yield* slice(ctx);
      }
      return { value, reply };
    }
    const moves = [];
    for (const candidate of candidates) {
      const shot = PF.shoot(state.pens, me, candidate.act);
      ctx.sims++;
      const node = addNode(0, 1, candidate.act);
      const result = yield* valueAfter(
        shot.pens,
        1 - me,
        depth - 1,
        node?.id ?? 0,
        2,
      );
      if (node) node.v = result.value * 100;
      moves.push({
        label: candidate.act.label,
        act: candidate.act,
        score: result.value * 100,
        prob: candidate.pSucc,
        hit: candidate.pHit,
        risk: candidate.pSelf,
        reply: result.reply,
      });
      live.moves = moves;
      yield* slice(ctx);
    }
    moves.sort((a, b) => b.score - a.score);
    moves[0].selected = true;
    live.moves = moves;
    live.selected = moves[0].act;
    live.extra.worstReply = moves[0].reply?.label ?? null;
    live.extra.depth = depth;
    live.extra.beam = beam;
    return { action: moves[0].act, moves };
  }
  return { minimaxAI };
}
