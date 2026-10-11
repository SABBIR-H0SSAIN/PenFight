export const ALGORITHMS = {
  dfs: "Depth-First Search",
  dls: "Depth-Limited Search",
  iddfs: "Iterative Deepening DFS",
  bidirectional: "Bidirectional Search",
  best: "Greedy Best-First Search",
  astar: "A* Search",
  fuzzy: "Fuzzy Logic",
  minimax: "Minimax",
  mcts: "Monte Carlo Tree Search",
};
export const ALGORITHM_SHORT = {
  dfs: "DFS",
  dls: "DLS",
  iddfs: "IDDFS",
  bidirectional: "Bidirectional",
  best: "Best-first",
  astar: "A*",
  fuzzy: "Fuzzy",
  minimax: "Minimax",
  mcts: "MCTS",
};
export const DIFFICULTIES = {
  beginner: {
    name: "Beginner",
    noise: { a: 0.11, p: 0.16 },
    mistake: 0.3,
    algo: "fuzzy",
    think: 500,
    ai: "Bunty",
  },
  advanced: {
    name: "Advanced",
    noise: { a: 0.05, p: 0.08 },
    mistake: 0.12,
    algo: "astar",
    think: 650,
    ai: "Rinku",
  },
  expert: {
    name: "Expert",
    noise: { a: 0.012, p: 0.025 },
    mistake: 0,
    algo: "mcts",
    think: 850,
    ai: "Reynolds",
  },
};
