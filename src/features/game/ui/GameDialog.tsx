"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Notebook dialog with keyboard focus kept on the active modal. */
export function GameDialog({
  id,
  title,
  children,
  won,
}: {
  id: "pause" | "end";
  title: string;
  children: ReactNode;
  won?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      id={id}
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      data-won={won ? 1 : 0}
      ref={panel}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = Array.from(
          panel.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) || [],
        );
        const first = buttons[0],
          last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="card">
        <span className="dialog-eyebrow">
          {id === "pause"
            ? "TIME OUT · CLASSROOM 07"
            : "MATCH REPORT · CLASSROOM 07"}
        </span>
        <h2 id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
