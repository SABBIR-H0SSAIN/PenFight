/** Cancellable headless runner. It uses the same engine and knock-off rule as play. */
export function createBenchmarkRunner(PF, ui) {
  let token = 0;
  const stop = (notify = true) => {
    token++;
    if (notify)
      ui.set({
        benchmark: {
          ...ui.get().benchmark,
          running: false,
          status: "Benchmark stopped. Only completed knock-off rounds count.",
        },
      });
  };
  async function run(A, B, N, level) {
    const id = ++token,
      L = PF.LEVELS[level];
    const cfg = (algo) => ({
      algo,
      noise: L.noise,
      mistake: L.mistake,
    });
    const wins = [0, 0],
      ms = [0, 0],
      decisions = [0, 0];
    let turns = 0,
      outs = 0;
    ui.set({
      benchmark: {
        running: true,
        status: "Starting headless matches…",
        result: null,
      },
    });
    for (let i = 0; i < N && id === token; i++) {
      const gen = PF.playRound([cfg(A), cfg(B)], {
        seed: 4000 + i,
        first: i % 2,
        budgetScale: 0.4,
        types: ["ball", "gel"],
        onDecision: (me, time) => {
          ms[me] += time;
          decisions[me]++;
        },
      });
      let step;
      while (id === token) {
        const start = performance.now();
        do {
          step = gen.next();
          if (
            step.value?.roundInProgress &&
            (step.value.turns === 1 || step.value.turns % 5 === 0)
          )
            ui.set({
              benchmark: {
                ...ui.get().benchmark,
                status: `Match ${i + 1}/${N} · ${step.value.turns} flicks. First pen off the desk loses.`,
              },
            });
        } while (!step.done && performance.now() - start < 14);
        if (step.done) break;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (id !== token) {
        gen.return();
        return;
      }
      const result = step.value;
      if (result.winner >= 0) wins[result.winner]++;
      turns += result.turns;
      if (result.how === "out") outs++;
      ui.set({
        benchmark: {
          running: i + 1 < N,
          status: `${i + 1} / ${N} rounds complete`,
          result: {
            names: [PF.SHORT[A], PF.SHORT[B]],
            wins: [...wins],
            averageMs: ms.map((value, side) =>
              decisions[side] ? Math.round(value / decisions[side]) : 0,
            ),
            done: i + 1,
            total: N,
            turns,
            outs,
          },
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return { run, stop };
}
