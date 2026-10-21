"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  useGameServices,
  useGameState,
} from "@/features/game/runtime/GameProvider";
import type { MenuView } from "@/game/state/types";
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
const motionQuery = "(prefers-reduced-motion: reduce)";
const compactQuery = "(max-width: 760px), (pointer: coarse)";
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const prefersReducedMotion = () => window.matchMedia(motionQuery).matches;
const serverReducedMotion = () => true;
function subscribeCompact(callback: () => void) {
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const prefersCompactTurn = () => window.matchMedia(compactQuery).matches;
const serverCompactTurn = () => false;

/** Only the turning sheet is duplicated, and only for the duration of a turn. */
function NotebookPages({ view }: { view: MenuView }) {
  const { ui } = useGameServices();
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    serverReducedMotion,
  );
  const compact = useSyncExternalStore(
    subscribeCompact,
    prefersCompactTurn,
    serverCompactTurn,
  );
  const pageTurnMs = compact ? 220 : 280;
  const pageTurnStyle = {
    "--notebook-turn-duration": `${pageTurnMs}ms`,
  } as CSSProperties;
  const [page, setPage] = useState<{
    view: MenuView;
    previous: MenuView | null;
    id: number;
  }>({ view, previous: null, id: 0 });
  const content = useRef<HTMLDivElement>(null);
  if (page.view !== view) {
    setPage({
      view,
      previous: reducedMotion ? null : page.view,
      id: page.id + 1,
    });
  }
  const turning = page.previous !== null && !reducedMotion;
  const backward = page.view === "main";
  const UnderView = views[backward && turning ? page.previous! : page.view];
  const TurnView = views[backward ? page.view : (page.previous ?? page.view)];

  useLayoutEffect(() => {
    // Leave the last classroom frame on screen while CSS composites the paper.
    ui.set({ menuTurning: turning });
    return () => ui.set({ menuTurning: false });
  }, [turning, ui]);

  useEffect(() => {
    if (page.previous === null) return;
    // Also release the controls if an animation is interrupted or disabled.
    const timeout = window.setTimeout(
      () => {
        setPage((current) =>
          current.id === page.id ? { ...current, previous: null } : current,
        );
      },
      reducedMotion ? 0 : pageTurnMs + 50,
    );
    return () => window.clearTimeout(timeout);
  }, [page.id, page.previous, reducedMotion, pageTurnMs]);

  useLayoutEffect(() => {
    if (!turning && page.id > 0) {
      content.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus({ preventScroll: true });
    }
  }, [turning, page.id]);

  return (
    <div
      className="notebook-pages"
      style={pageTurnStyle}
      data-turn={turning ? (backward ? "backward" : "forward") : undefined}
      data-compact={compact || undefined}
      aria-busy={turning}
    >
      <div
        className="notebook-page-scroll"
        key={backward && turning ? page.previous : page.view}
        ref={content}
        inert={turning}
        aria-hidden={turning || undefined}
      >
        <UnderView />
      </div>
      {turning && (
        <>
          <div className="notebook-cast-shadow" aria-hidden="true" />
          <div
            className="notebook-turning-sheet"
            key={page.id}
            aria-hidden="true"
            inert
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              setPage((current) =>
                current.id === page.id
                  ? { ...current, previous: null }
                  : current,
              );
            }}
          >
            <div className="notebook-face notebook-face--front">
              <div className="notebook-page-scroll">
                <TurnView />
              </div>
            </div>
            <div className="notebook-face notebook-face--back">
              <span className="notebook-paper-watermark">PenFight Arena</span>
            </div>
            <div className="notebook-page-curl" />
          </div>
        </>
      )}
    </div>
  );
}
export function GameMenu() {
  const state = useGameState(["menuVisible", "view", "ready"]);
  if (!state.menuVisible) return null;
  return (
    <div id="menu" inert={!state.ready}>
      <div className="col">
        <div className="spiral" aria-hidden="true" />
        <NotebookPages view={state.view} />
      </div>
    </div>
  );
}
