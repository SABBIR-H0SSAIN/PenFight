"use client";
import { useState, type MouseEvent, type FocusEvent } from "react";
import { useGameServices } from "@/features/game/runtime/GameProvider";
import { PenPointer } from "@/features/pen/ui/PenPointer";
import type { MenuView } from "@/game/state/types";
const modes: { view: MenuView; name: string; detail: string }[] = [
  { view: "pvp", name: "Two Players", detail: "Pass the pen to a friend" },
  { view: "vs", name: "Play vs AI", detail: "Take on the class champion" },
  { view: "aivai", name: "AI vs AI Battle", detail: "Watch two minds clash" },
  { view: "train", name: "Practice Lab", detail: "Learn, aim and experiment" },
  { view: "settings", name: "Settings", detail: "Adjust the rules and feel" },
];
export function MainMenuView() {
  const services = useGameServices();
  const [top, setTop] = useState(215);
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
      <div className="exercise-top">
        <span>
          EXERCISE BOOK <b>NO. 07</b>
        </span>
        <span>CLASSROOM CHAMPIONSHIP</span>
      </div>
      <div className="title">
        PEN FIGHT<span>AI ARENA</span>
      </div>
      <p className="lead">Two pens. One desk. Last pen standing wins.</p>
      <div className="page-label">
        TODAY&apos;S LESSON <span>✎ choose your game</span>
      </div>
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
              <small>{mode.detail}</small>
            </span>
            <span className="paper-arrow">›</span>
          </button>
        ))}
      </div>
      <PenPointer top={top} />
      <p className="scribble-footer">
        Don&apos;t let your pen fall! <span>↗</span>
      </p>
      <p className="foot">
        RULE 1: No flick limit — play until a pen falls.
        <br />
        RULE 2: Try the Matador pen skins!
      </p>
    </div>
  );
}
