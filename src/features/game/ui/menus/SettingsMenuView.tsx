"use client";
import { useGamePreferences } from "@/features/game/runtime/GameProvider";
import type { GameSettings } from "@/game/state/types";
import { MenuPage } from "./MenuPage";
const toggles = [
  ["amb", "Classroom ambience"],
  ["real", "Realistic physics (rolling, uneven desk)"],
  ["guide", "Aim guide"],
  ["follow", "Camera follows the pen"],
  ["replay", "Quick highlight after a knock-off"],
  ["slowmo", "Brief impact slow motion"],
  ["fps", "Show frame rate"],
] as const;
export function SettingsMenuView() {
  const { settings, setSettings } = useGamePreferences();
  return (
    <MenuPage view="settings" title="Settings" eyebrow="CUSTOMISE YOUR GAME">
      <label className="f">
        Player name
        <input
          type="text"
          maxLength={14}
          autoComplete="off"
          value={settings.name}
          onChange={(event) => setSettings({ name: event.target.value })}
        />
      </label>
      <label className="sw">
        Volume
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.vol * 100)}
          onChange={(event) =>
            setSettings({ vol: Number(event.target.value) / 100 })
          }
        />
      </label>
      <label className="f">
        Graphics quality
        <select
          value={settings.quality}
          onChange={(event) =>
            setSettings({
              quality: event.target.value as GameSettings["quality"],
            })
          }
        >
          <option value="auto">Auto (adapts to frame rate)</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label className="f">
        Table texture
        <select
          value={settings.tableSurface}
          onChange={(event) =>
            setSettings({
              tableSurface: event.target.value as GameSettings["tableSurface"],
            })
          }
        >
          <option value="oak">Classic oak · warm classroom wood</option>
          <option value="maple">Light maple · pale satin grain</option>
          <option value="walnut">Dark walnut · rich brown grain</option>
        </select>
      </label>
      <label className="sw">
        Desk friction <span>{Math.round(settings.friction * 100)}%</span>
        <input
          type="range"
          min={80}
          max={110}
          step={1}
          value={Math.round(settings.friction * 100)}
          onChange={(event) =>
            setSettings({ friction: Number(event.target.value) / 100 })
          }
        />
      </label>
      <div className="mute">
        80% = more sliding · 100% = original grip · 110% = less sliding. Applies
        to both players and AI.
      </div>
      {toggles.map(([key, label]) => (
        <label className="sw" key={key}>
          {label}
          <input
            type="checkbox"
            checked={settings[key]}
            onChange={(event) => setSettings({ [key]: event.target.checked })}
          />
        </label>
      ))}
    </MenuPage>
  );
}
