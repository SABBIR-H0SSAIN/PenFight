import type { GameUiStore } from "@/game/state/store";
import type { Algorithm, GameMode, MenuView } from "@/game/state/types";
import type { Difficulty } from "@/game/contracts";
import type { SceneWorld } from "@/game/scene/types";
export interface GameController {
  start(mode: Exclude<GameMode, "menu">): void;
  openMenu(): void;
  pause(): void;
  resume(): void;
  settings(): void;
  back(): void;
  changeAlgorithm(algo: Algorithm): void;
  showView(view: MenuView): void;
  toggleLab(): void;
  closeLab(): void;
  toggleSurge(): void;
  skipReplay(): void;
  setSpeed(speed: number): void;
  requestHint(): Promise<void>;
  applyHint(): void;
  dispose(): void;
  benchmark: {
    run(
      a: Algorithm,
      b: Algorithm,
      rounds: number,
      level: Difficulty,
    ): Promise<void>;
    stop(notify?: boolean): void;
  };
}
export function createController(options: {
  engine: unknown;
  world: SceneWorld;
  sound: unknown;
  canvas: HTMLCanvasElement;
  ui: GameUiStore;
}): GameController;
