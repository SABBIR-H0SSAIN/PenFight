"use client";
import { useState } from "react";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
import { AlgorithmSelect } from "@/features/game/ui/controls/AlgorithmSelect";
import { DifficultySelect } from "@/features/game/ui/controls/DifficultySelect";
import type { Algorithm } from "@/game/state/types";
import type { Difficulty } from "@/game/contracts";
export function BenchmarkPanel() {
  const services = useGameServices(),
    { benchmark } = useGameState(["benchmark"]);
  const [a, setA] = useState<Algorithm>("fuzzy"),
    [b, setB] = useState<Algorithm>("mcts");
  const [rounds, setRounds] = useState(20),
    [level, setLevel] = useState<Difficulty>("advanced");
  const result = benchmark.result;
  async function run() {
    try {
      await services.controller?.benchmark.run(a, b, rounds, level);
    } catch (error) {
      services.ui.set({
        benchmark: {
          ...services.ui.get().benchmark,
          running: false,
          status: error instanceof Error ? error.message : "Benchmark failed.",
        },
      });
    }
  }
  return (
    <>
      <div className="row2">
        <AlgorithmSelect
          label="Benchmark algorithm A"
          value={a}
          onChange={(value) => {
            if (value !== "auto") setA(value);
          }}
        />
        <AlgorithmSelect
          label="Benchmark algorithm B"
          value={b}
          onChange={(value) => {
            if (value !== "auto") setB(value);
          }}
        />
      </div>
      <div className="row2">
        <select
          aria-label="Benchmark rounds"
          value={rounds}
          onChange={(event) => setRounds(Number(event.target.value))}
        >
          {[10, 20, 40].map((count) => (
            <option key={count} value={count}>
              {count} rounds
            </option>
          ))}
        </select>
        <DifficultySelect
          label="Benchmark accuracy"
          value={level}
          onChange={setLevel}
        />
      </div>
      <div className="benchmark-actions">
        <button
          className="btn"
          disabled={benchmark.running}
          onClick={() => void run()}
        >
          Run headless matches
        </button>
        <button
          className="btn ghost"
          disabled={!benchmark.running}
          onClick={() => services.controller?.benchmark.stop()}
        >
          Stop
        </button>
      </div>
      <div id="bnOut">
        <p className="mute" role="status">
          {benchmark.status ||
            "Runs the real engine without graphics, alternating who flicks first."}
        </p>
        {result && (
          <>
            <table>
              <thead>
                <tr>
                  <th />
                  <th>{result.names[0]} (A)</th>
                  <th>{result.names[1]} (B)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Rounds won</td>
                  {result.wins.map((wins, index) => (
                    <td key={index}>
                      {wins} · {Math.round((wins / result.done) * 100)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>ms / decision</td>
                  {result.averageMs.map((value, index) => (
                    <td key={index}>{value}</td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mute">
              {result.done} / {result.total} rounds · avg{" "}
              {(result.turns / result.done).toFixed(1)} flicks · {result.outs}{" "}
              knock-offs
            </p>
            <div className="prog">
              <i style={{ width: `${(result.done / result.total) * 100}%` }} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
