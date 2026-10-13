import type { Algorithm } from "@/game/state/types";
export const ALGORITHM_INFO: Record<Algorithm, string> = {
  dfs: "Depth-first search: uses a LIFO stack to explore the deepest action branch first. Stops at a verified knock-off goal or the simulation budget.",
  dls: "Depth-limited search: performs DFS with a fixed depth limit. This shot tree has four choices: target, angle, power and spin. A shallower limit produces a cutoff and a fallback shot.",
  iddfs:
    "Iterative deepening DFS: repeats depth-limited search with increasing limits from zero to four, stopping at a verified goal or the simulation budget.",
  bidirectional:
    "Bidirectional search: first simulates candidate shots to identify goal leaves, then searches forward from the empty action and backward through goal-action prefixes until the frontiers meet. Physics is not reversed; goal discovery counts toward the simulation budget.",
  best: "Greedy best-first search: expands the action node with the lowest estimated remaining cost h(n), without including the path cost.",
  astar:
    "A*-style budgeted search: orders action nodes by f = g + h. g measures shot effort and h estimates remaining cost from simulated shot quality. This physics heuristic is not admissible, so optimality is not guaranteed.",
  minimax:
    "Minimax: alternates MAX for the AI and MIN for its opponent. Chooses the shot with the best worst-case reply value within a depth-limited, discretized action tree and root shortlist.",
  mcts: "Monte Carlo tree search: repeats UCB selection, expansion, random rollout and backpropagation. Uses a discretized action shortlist and bounded rollout depth to estimate shot values.",
  fuzzy:
    "Fuzzy logic: converts distance, risk and confidence into memberships, applies rules and defuzzifies flick power and attack/defend balance.",
};
