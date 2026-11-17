import type { Algorithm } from "@/game/state/types";
export const ALGORITHM_INFO: Record<Algorithm, string> = {
  dfs: "Depth-first search: uses a LIFO stack to explore the deepest action branch first. Stops at a verified knock-off goal or the simulation budget.",
  best: "Greedy best-first search: expands the action node with the lowest estimated remaining cost h(n), without including the path cost.",
  astar:
    "A*-style budgeted search: orders action nodes by f = g + h. g measures shot effort and h estimates remaining cost from simulated shot quality. This physics heuristic is not admissible, so optimality is not guaranteed.",
  minimax:
    "Minimax: alternates MAX for the AI and MIN for its opponent. Chooses the shot with the best worst-case reply value within a depth-limited, discretized action tree and root shortlist.",
  mcts: "Monte Carlo tree search: repeats UCB selection, expansion, random rollout and backpropagation. Keeps a board state at each node so replies stay aimed correctly. Estimates shot values with a shortlist and bounded rollouts.",
  fuzzy:
    "Fuzzy logic: converts distance, risk and confidence into memberships, applies rules and defuzzifies flick power and attack/defend balance.",
};
