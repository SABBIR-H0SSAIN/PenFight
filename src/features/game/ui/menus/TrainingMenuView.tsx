"use client";
import {
  useGamePreferences,
  useGameServices,
} from "@/features/game/runtime/GameProvider";
import { PenSelector } from "@/features/pen/ui/PenSelector";
import { AlgorithmSelect } from "@/features/game/ui/controls/AlgorithmSelect";
import { DifficultySelect } from "@/features/game/ui/controls/DifficultySelect";
import { MenuPage } from "./MenuPage";
export function TrainingMenuView() {
  const services = useGameServices();
  const { preferences, setPreferences } = useGamePreferences();
  const value = preferences.train;
  return (
    <MenuPage view="train" title="Training Mode" eyebrow="EXPERIMENT NOTEBOOK">
      <p className="lead">
        Practice with the AI Lab open. Ask any algorithm for a hint on your own
        turn.
      </p>
      <h3>Opponent accuracy</h3>
      <DifficultySelect
        label="Training opponent accuracy"
        chips
        value={value.difficulty}
        onChange={(difficulty) =>
          setPreferences({ ...preferences, train: { ...value, difficulty } })
        }
      />
      <label className="f">
        Opponent algorithm
        <AlgorithmSelect
          label="Training algorithm"
          auto
          value={value.algorithm}
          onChange={(algorithm) =>
            setPreferences({ ...preferences, train: { ...value, algorithm } })
          }
        />
      </label>
      <h3>Your pen</h3>
      <PenSelector
        label="Training pen"
        value={value}
        onChange={(pen) =>
          setPreferences({ ...preferences, train: { ...value, ...pen } })
        }
      />
      <button
        className="mbtn primary"
        onClick={() => services.controller?.start("train")}
      >
        Enter lab
      </button>
    </MenuPage>
  );
}
