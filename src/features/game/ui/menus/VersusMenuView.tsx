"use client";
import {
  useGamePreferences,
  useGameServices,
} from "@/features/game/runtime/GameProvider";
import { PenSelector } from "@/features/pen/ui/PenSelector";
import { DifficultySelect } from "@/features/game/ui/controls/DifficultySelect";
import { MenuPage } from "./MenuPage";
export function VersusMenuView() {
  const services = useGameServices();
  const { preferences, setPreferences } = useGamePreferences();
  const value = preferences.vs;
  return (
    <MenuPage view="vs" title="Human vs AI" eyebrow="YOUR NEXT CHALLENGE">
      <h3>Opponent</h3>
      <DifficultySelect
        label="Opponent difficulty"
        chips
        value={value.difficulty}
        onChange={(difficulty) =>
          setPreferences({ ...preferences, vs: { ...value, difficulty } })
        }
      />
      <h3>Your pen</h3>
      <PenSelector
        label="Your pen"
        value={value}
        onChange={(pen) =>
          setPreferences({ ...preferences, vs: { ...value, ...pen } })
        }
      />
      <p className="mute">
        Both players use this pen model. The AI gets a different colour.
      </p>
      <button
        className="mbtn primary"
        onClick={() => services.controller?.start("vs")}
      >
        Play
      </button>
    </MenuPage>
  );
}
