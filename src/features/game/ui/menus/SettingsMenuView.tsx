"use client";
import { CONFIG_LIMITS } from "@/config/config";
import {
  useGamePreferences,
  useGameState,
} from "@/features/game/runtime/GameProvider";
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
  const { cameraPinned } = useGameState(["cameraPinned"]);
  return (
    <MenuPage view="settings" title="Settings">
      <label className="f">
        Player name
        <input
          type="text"
          maxLength={CONFIG_LIMITS.nameLength}
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
          <option value="auto">Auto</option>
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
          <option value="oak">Classic oak</option>
          <option value="maple">Light maple</option>
          <option value="walnut">Dark walnut</option>
        </select>
      </label>
      <label className="sw">
        Desk friction <span>{Math.round(settings.friction * 100)}%</span>
        <input
          type="range"
          min={CONFIG_LIMITS.friction.min * 100}
          max={CONFIG_LIMITS.friction.max * 100}
          step={1}
          value={Math.round(settings.friction * 100)}
          onChange={(event) =>
            setSettings({ friction: Number(event.target.value) / 100 })
          }
        />
      </label>
      <div className="mute">
        Lower friction means more sliding. Applies to both pens.
      </div>
      {toggles.map(([key, label]) => (
        <label className="sw settings-toggle" key={key}>
          {label}
          <input
            type="checkbox"
            disabled={key === "follow" && cameraPinned}
            title={
              key === "follow" && cameraPinned
                ? "Unpin the camera to use Follow"
                : undefined
            }
            checked={settings[key]}
            onChange={(event) => setSettings({ [key]: event.target.checked })}
          />
        </label>
      ))}
    </MenuPage>
  );
}
