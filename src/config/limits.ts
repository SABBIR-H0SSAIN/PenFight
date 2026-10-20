/** Supported UI and engine constraints, shared by controls and validation. */
export const CONFIG_LIMITS = {
  nameLength: 14,
  friction: { min: 0.8, max: 1.1 },
  elevation: { min: 45, max: 89 },
  zoom: { min: 0.5, max: 2 },
  speeds: [1, 2, 4],
  goals: [1, 3, 5],
  benchmarkRounds: [10, 20, 40],
};
