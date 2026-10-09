"use client";
import type { ReactNode } from "react";
import { useGameServices } from "@/features/game/runtime/GameProvider";
import type { MenuView } from "@/game/state/types";
export function MenuPage({
  view,
  title,
  eyebrow,
  children,
}: {
  view: MenuView;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const services = useGameServices();
  return (
    <div className="view" data-view={view}>
      <div className="exercise-top">
        <span>{eyebrow}</span>
        <span>✎</span>
      </div>
      <button
        className="back"
        type="button"
        onClick={() => services.controller?.back()}
      >
        ← Back
      </button>
      <div className="title">{title}</div>
      {children}
    </div>
  );
}
