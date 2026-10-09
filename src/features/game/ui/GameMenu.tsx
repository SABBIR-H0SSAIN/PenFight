"use client";
import { useGameState } from "@/features/game/runtime/GameProvider";
import { AiBattleMenuView } from "./menus/AiBattleMenuView";
import { LocalMatchMenuView } from "./menus/LocalMatchMenuView";
import { MainMenuView } from "./menus/MainMenuView";
import { SettingsMenuView } from "./menus/SettingsMenuView";
import { TrainingMenuView } from "./menus/TrainingMenuView";
import { VersusMenuView } from "./menus/VersusMenuView";
const views = {
  main: MainMenuView,
  vs: VersusMenuView,
  train: TrainingMenuView,
  aivai: AiBattleMenuView,
  pvp: LocalMatchMenuView,
  settings: SettingsMenuView,
};
export function GameMenu() {
  const state = useGameState(["menuVisible", "view", "ready"]);
  if (!state.menuVisible) return null;
  const View = views[state.view];
  return (
    <div id="menu" inert={!state.ready}>
      <div className="col">
        <div className="spiral" aria-hidden="true" />
        <View />
      </div>
    </div>
  );
}
