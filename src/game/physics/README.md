# Physics

`createPhysics()` in `engine.js` creates an independent simulation instance. It owns collision resolution, friction, rolling, shot simulation, action generation and state evaluation. It imports only pen catalogue data and runs without React, Three.js or a browser.

`src/game/engine.js` adds the AI strategies to this interface. The renderer reads table dimensions and pen properties from the engine. Keep random seeds explicit in regression tests, avoid mutating input snapshots during a shot, and preserve the knock-off-only win condition.
