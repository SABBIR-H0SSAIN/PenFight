"use client";
import { useState, type MouseEvent, type FocusEvent } from "react";
import { useGameServices } from "@/features/game/runtime/GameProvider";
import { PenPointer } from "@/features/pen/ui/PenPointer";
import type { MenuView } from "@/game/state/types";
const modes: { view: MenuView; name: string }[] = [
  { view: "pvp", name: "Two Players" },
  { view: "vs", name: "Play vs AI" },
  { view: "aivai", name: "AI vs AI Battle" },
  { view: "train", name: "Practice Lab" },
  { view: "settings", name: "Settings" },
];
export function MainMenuView() {
  const services = useGameServices();
  const [top, setTop] = useState<number | null>(null);
  function movePointer(
    event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
  ) {
    const button = event.currentTarget,
      view = button.closest(".view");
    if (view)
      setTop(
        button.getBoundingClientRect().top -
          view.getBoundingClientRect().top +
          button.offsetHeight / 2 -
          15,
      );
  }
  return (
    <div className="view" data-view="main">
      <div className="title">
        PEN FIGHT<span>AI ARENA</span>
      </div>
      <p className="lead">Flick your opponent&apos;s pen off the desk.</p>
      <div className="written-options">
        {modes.map((mode, index) => (
          <button
            type="button"
            className={`mbtn${index === 0 ? " primary" : ""}`}
            key={mode.view}
            onMouseEnter={movePointer}
            onFocus={movePointer}
            onClick={() => services.controller?.showView(mode.view)}
          >
            <span>
              <b className="ink-num">0{index + 1}</b>
              {mode.name}
            </span>
            <span className="paper-arrow">›</span>
          </button>
        ))}
      </div>
      {top !== null ? <PenPointer top={top} /> : null}
    </div>
  );
}
