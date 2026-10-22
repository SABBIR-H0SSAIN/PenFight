"use client";
import { useState } from "react";
import { useGameServices } from "@/features/game/runtime/GameProvider";
import { PenPointer } from "@/features/pen/ui/PenPointer";
import { BrandLogo } from "../BrandLogo";
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
  const [activeView, setActiveView] = useState<MenuView | null>(null);
  return (
    <div className="view" data-view="main">
      <h1 className="main-menu-brand" aria-label="Pen Fight Arena">
        <BrandLogo />
      </h1>
      <p className="lead">Flick your opponent&apos;s pen off the desk.</p>
      <div className="written-options">
        {modes.map((mode, index) => (
          <button
            type="button"
            className={`mbtn${index === 0 ? " primary" : ""}`}
            key={mode.view}
            onMouseEnter={() => setActiveView(mode.view)}
            onFocus={() => setActiveView(mode.view)}
            onClick={() => services.controller?.showView(mode.view)}
          >
            <span className="menu-choice-label">
              <b className="ink-num">0{index + 1}</b>
              <span className="menu-choice-name">{mode.name}</span>
            </span>
            <span className="menu-choice-indicator" aria-hidden="true">
              {activeView === mode.view ? (
                <PenPointer />
              ) : (
                <span className="paper-arrow">›</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
