"use client";
import { useState } from "react";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
import { ALGORITHM_INFO } from "./descriptions";
import { ALGORITHMS } from "@/game/ai/catalog.js";
import { AlgorithmSelect } from "@/features/game/ui/controls/AlgorithmSelect";
import { AlgorithmDetails } from "./AlgorithmDetails";
import { MoveList } from "./MoveList";
import { SearchTree } from "./SearchTree";
import { BenchmarkPanel } from "./BenchmarkPanel";
const tabs = {
  moves: "Moves",
  tree: "Search tree",
  detail: "Details",
  bench: "Benchmark",
};
export function AiLab() {
  const services = useGameServices(),
    state = useGameState([
      "live",
      "labOpen",
      "labAlgo",
      "mode",
      "hintBusy",
      "hintAvailable",
    ]);
  const [tab, setTab] = useState<keyof typeof tabs>("moves");
  const live = state.live,
    stats = live?.stats;
  return (
    <aside id="lab" hidden={!state.labOpen} aria-label="AI Lab">
      <div className="lh">
        <AlgorithmSelect
          label="Lab algorithm"
          value={state.labAlgo}
          onChange={(value) => {
            if (value !== "auto") services.controller?.changeAlgorithm(value);
          }}
        />
        <button
          aria-label="Close lab"
          onClick={() => services.controller?.closeLab()}
        >
          ✕
        </button>
      </div>
      <div className="stats">
        {stats ? (
          <>
            <span>{ALGORITHMS[live!.algo]}</span>
            <span>
              evals <b>{stats.evals || 0}</b>
            </span>
            <span>
              sims <b>{(stats.sims || 0).toLocaleString()}</b>
            </span>
            <span>
              nodes <b>{stats.nodes || 0}</b>
            </span>
            <span>
              <b>{stats.ms || 0}</b> ms
            </span>
          </>
        ) : (
          <span>Waiting for a decision</span>
        )}
      </div>
      <div className="info">{ALGORITHM_INFO[state.labAlgo]}</div>
      <div className="tabs" role="tablist" aria-label="AI inspection">
        {(Object.keys(tabs) as (keyof typeof tabs)[]).map((key) => (
          <button
            key={key}
            id={`lab-tab-${key}`}
            role="tab"
            aria-selected={key === tab}
            aria-controls={`lab-panel-${key}`}
            onClick={() => setTab(key)}
          >
            {tabs[key]}
          </button>
        ))}
      </div>
      <div
        className="pane"
        id={`lab-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`lab-tab-${tab}`}
      >
        {tab === "moves" && (
          <>
            <MoveList moves={live?.moves || []} />
            {state.mode === "train" && (
              <div id="hintBtns">
                <button
                  className="btn"
                  disabled={state.hintBusy}
                  onClick={() => void services.controller?.requestHint()}
                >
                  Suggest my move
                </button>
                {state.hintAvailable && (
                  <button
                    className="btn ghost"
                    onClick={() => services.controller?.applyHint()}
                  >
                    Play suggestion
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {tab === "tree" && state.labOpen && <SearchTree decision={live} />}
        {tab === "detail" && <AlgorithmDetails decision={live} />}
        {tab === "bench" && <BenchmarkPanel />}
      </div>
    </aside>
  );
}
