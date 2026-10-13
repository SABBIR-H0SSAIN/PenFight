"use client";
import type { LiveDecision } from "@/game/state/types";
interface Fuzzy {
  in: { dist: number; risk: number; conf: number };
  mu: Record<string, Record<string, number>>;
  out: { power: number; attack: number; defend: number; strategy: string };
  fired: { f: number; text: string }[];
}
interface Extra {
  fuzzy?: Fuzzy;
  worstReply?: string | null;
  depth?: number;
  beam?: number;
  depthLimit?: number;
  cutoff?: boolean;
  iterations?: number;
  forwardFrontier?: number;
  backwardFrontier?: number;
  goalCandidates?: number;
  evaluated?: number;
  meetingDepth?: number;
  iters?: number;
  iter?: number;
  total?: number;
  frontier?: number;
  expanded?: number;
  found?: boolean;
  open?: number;
}
function MembershipBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="fz">
      <span>{label}</span>
      <i>
        <u
          style={{
            width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`,
          }}
        />
      </i>
      <b>{value.toFixed(2)}</b>
    </div>
  );
}
export function AlgorithmDetails({
  decision,
}: {
  decision: LiveDecision | null;
}) {
  if (!decision)
    return <p className="mute">Details appear after a decision.</p>;
  const x = decision.extra as Extra,
    fuzzy = x.fuzzy;
  return (
    <div>
      {fuzzy?.mu && (
        <>
          <h4>Fuzzy controller</h4>
          <p className="mute">
            Inputs: distance {fuzzy.in.dist.toFixed(1)} cm · risk{" "}
            {fuzzy.in.risk.toFixed(2)} · confidence {fuzzy.in.conf.toFixed(2)}
          </p>
          {Object.entries(fuzzy.mu).map(([name, values]) => (
            <div className="grp" key={name}>
              <b>{name}</b>
              {Object.entries(values).map(([label, value]) => (
                <MembershipBar key={label} label={label} value={value} />
              ))}
            </div>
          ))}
          <div className="grp">
            <b>Outputs</b>
            <MembershipBar label="flick power" value={fuzzy.out.power} />
            <MembershipBar label="attack" value={fuzzy.out.attack} />
            <MembershipBar label="defend" value={fuzzy.out.defend} />
            <p>
              Strategy: <b>{fuzzy.out.strategy}</b>
            </p>
          </div>
          <div className="grp">
            <b>Rules fired</b>
            {fuzzy.fired.slice(0, 5).map((rule, index) => (
              <p className="rule" key={index}>
                {rule.f.toFixed(2)} · {rule.text}
              </p>
            ))}
          </div>
        </>
      )}
      {decision.algo === "minimax" && (
        <>
          <h4>Minimax</h4>
          <p className="mute">
            Depth {x.depth} · root shortlist {x.beam}.
          </p>
          {x.worstReply && <p>Worst-case reply: {x.worstReply}</p>}
        </>
      )}
      {(x.iters != null || x.iter != null) && (
        <>
          <h4>MCTS</h4>
          <p className="mute">
            {x.iters || x.iter} iterations · root visits {x.total}. Node size
            shows visits.
          </p>
        </>
      )}
      {x.frontier != null && (
        <>
          <h4>Uninformed search</h4>
          <p className="mute">
            Frontier {x.frontier} · expanded {x.expanded} · goal{" "}
            {x.found
              ? "found"
              : x.cutoff
                ? "depth cutoff"
                : "not reached within budget"}
          </p>
        </>
      )}
      {x.depthLimit != null && (
        <p className="mute">
          Depth limit {x.depthLimit}
          {x.iterations != null ? ` · ${x.iterations} deepening passes` : ""}.
        </p>
      )}
      {x.goalCandidates != null && (
        <p className="mute">
          Goal discovery: {x.goalCandidates} verified shots from {x.evaluated}{" "}
          simulations.
          {x.forwardFrontier != null &&
            ` Forward frontier ${x.forwardFrontier} · backward frontier ${x.backwardFrontier}.`}
          {x.meetingDepth != null &&
            ` Frontiers met at depth ${x.meetingDepth}.`}
        </p>
      )}
      {x.open != null && (
        <>
          <h4>Informed search</h4>
          <p className="mute">Open list {x.open}</p>
        </>
      )}
      {decision.mistake && (
        <p className="warn">Human-like slip: it picked a runner-up shot.</p>
      )}
    </div>
  );
}
