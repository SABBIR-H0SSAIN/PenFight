/** Algorithm labels, difficulty presets, search budgets and benchmark defaults. */
const algorithmNames = {
  dfs: "Depth-First Search",
  dls: "Depth-Limited Search",
  iddfs: "Iterative Deepening DFS",
  best: "Greedy Best-First Search",
  astar: "A* Search",
  fuzzy: "Fuzzy Logic",
  minimax: "Minimax",
  mcts: "Monte Carlo Tree Search",
};
const algorithmShortNames = {
  dfs: "DFS",
  dls: "DLS",
  iddfs: "IDDFS",
  best: "Best-first",
  astar: "A*",
  fuzzy: "Fuzzy",
  minimax: "Minimax",
  mcts: "MCTS",
};
const difficulties = {
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
export type ConfigAlgorithm = keyof typeof algorithmNames;
export type ConfigDifficulty = keyof typeof difficulties;
export const aiConfig = {
  algorithms: algorithmNames,
  shortNames: algorithmShortNames,
  difficulties: difficulties,
  defaultAlgorithm: "astar" as ConfigAlgorithm,
  sliceMs: 7,
  budgets: {
    // Shot-action trees have four choices: target, angle, power, spin.
    // Limits below four produce a cutoff and a playable fallback shot.
    dfs: { leafBudget: 90, depthLimit: 4, goal: 0.5 },
    dls: { leafBudget: 90, depthLimit: 4, goal: 0.5 },
    iddfs: { leafBudget: 90, depthLimit: 4, goal: 0.5 },
    best: { evalBudget: 110, depthLimit: 4, goal: 2 / 3 },
    astar: { evalBudget: 130, depthLimit: 4, goal: 2 / 3 },
    // depth counts simulated moves; beam limits the root shortlist.
    // maxVisibleNodes limits recorded visualization nodes, not search work.
    minimax: { depth: 2, beam: 8, maxVisibleNodes: 260 },
    // MCTS expands to depth, then simulates up to rolloutDepth extra moves.
    // c controls exploration; rootK limits the initial candidate shortlist.
    mcts: {
      iters: 3000,
      c: 0.8,
      depth: 3,
      rolloutDepth: 1,
      rootK: 24,
      pickVisits: false,
      maxVisibleNodes: 420,
    },
    fuzzy: {},
  },
  benchmark: {
    seed: 4000,
    budgetScale: 0.4,
    sliceMs: 14,
    algorithmA: "fuzzy" as ConfigAlgorithm,
    algorithmB: "mcts" as ConfigAlgorithm,
    difficulty: "advanced" as ConfigDifficulty,
    rounds: 20,
  },
};
