"use client";
import {
  useGamePreferences,
  useGameServices,
} from "@/features/game/runtime/GameProvider";
import { PenSelector } from "@/features/pen/ui/PenSelector";
import { MenuPage } from "./MenuPage";
export function LocalMatchMenuView() {
  const services = useGameServices();
  const { preferences, setPreferences } = useGamePreferences();
  const value = preferences.pvp;
  const update = (patch: Partial<typeof value>) =>
    setPreferences({ ...preferences, pvp: { ...value, ...patch } });
  return (
    <MenuPage view="pvp" title="Human vs Human" eyebrow="FRIENDLY MATCH">
      <p className="lead">
        Take turns on the same screen. The camera turns to face whoever is
        flicking.
      </p>
      <div className="two">
        <label className="f">
          Player 1
          <input
            type="text"
            maxLength={14}
            autoComplete="off"
            value={value.name1}
            onChange={(event) => update({ name1: event.target.value })}
          />
        </label>
        <label className="f">
          Player 2
          <input
            type="text"
            maxLength={14}
            autoComplete="off"
            value={value.name2}
            onChange={(event) => update({ name2: event.target.value })}
          />
        </label>
      </div>
      <div className="two">
        <section>
          <h3>Pen 1</h3>
          <PenSelector
            includePremium={false}
            label="Player 1 pen"
            value={value.pen1}
            onChange={(pen1) => update({ pen1 })}
          />
        </section>
        <section>
          <h3>Pen 2</h3>
          <PenSelector
            includePremium={false}
            label="Player 2 pen"
            value={value.pen2}
            onChange={(pen2) => update({ pen2 })}
          />
        </section>
      </div>
      <label className="f">
        First to
        <select
          value={value.goal}
          onChange={(event) => update({ goal: Number(event.target.value) })}
        >
          {[1, 3, 5].map((goal) => (
            <option key={goal} value={goal}>
              {goal} {goal === 1 ? "round" : "rounds"}
            </option>
          ))}
        </select>
      </label>
      <button
        className="mbtn primary"
        onClick={() => services.controller?.start("pvp")}
      >
        Play
      </button>
    </MenuPage>
  );
}
