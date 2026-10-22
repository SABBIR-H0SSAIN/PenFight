function LoadingPen({ color }: { color: "blue" | "orange" }) {
  return (
    <div className={`game-loading-pen game-loading-pen--${color}`}>
      <svg viewBox="0 0 200 36" fill="none" focusable="false">
        <path
          d="M12 5h132l34 8 14 5-14 5-34 8H12a7 7 0 0 1-7-7V12a7 7 0 0 1 7-7Z"
          fill="currentColor"
        />
        <path d="m148 6 30 7 14 5-14 5-30 7V6Z" fill="#c7d1d9" />
        <path d="m178 13 14 5-14 5V13Z" fill="#334155" />
        <path
          d="M14 5h36v26H14a7 7 0 0 1-7-7V12a7 7 0 0 1 7-7Z"
          fill="#14243a"
        />
        <path d="M50 5h5v26h-5z" fill="#d9e2eb" />
        <path
          d="M64 10h74"
          stroke="white"
          strokeOpacity=".5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M19 5v-1h47a3 3 0 0 1 0 6H24"
          stroke="#d9e2eb"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M124 7v22m6-21v20m6-18v16m6-15v14"
          stroke="#14243a"
          strokeOpacity=".25"
          strokeWidth="2"
        />
        <path
          d="M16 26h127"
          stroke="#14243a"
          strokeOpacity=".2"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/** Lightweight CSS animation stays available while the 3D runtime loads. */
export function GameLoading() {
  return (
    <div
      className="runtime-status game-loading"
      role="status"
      aria-live="polite"
    >
      <div className="game-loading-content">
        <span className="game-loading-eyebrow" aria-hidden="true">
          The desk is your arena
        </span>
        <div className="game-loading-arena" aria-hidden="true">
          <div className="game-loading-orbit" />
          <div className="game-loading-orbit game-loading-orbit--inner" />
          <span className="game-loading-crosshair" />
          <span className="game-loading-player game-loading-player--blue">
            01
          </span>
          <span className="game-loading-player game-loading-player--orange">
            02
          </span>
          <LoadingPen color="blue" />
          <LoadingPen color="orange" />
          <div className="game-loading-impact">
            <svg viewBox="0 0 80 80" fill="none" focusable="false">
              <path
                d="m40 12 5 18 17-10-10 17 18 5-18 4 10 17-17-10-5 18-5-18-17 10 10-17-18-4 18-5-10-17 17 10 5-18Z"
                fill="#fff0bb"
              />
              <path
                d="m15 9-5-5m55 5 5-5M12 65l-6 6m61-6 6 6"
                stroke="#ffae67"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="game-loading-ripple" />
        </div>
        <div className="game-loading-title" aria-hidden="true">
          Pen<span>Fight</span>
        </div>
        <span className="game-loading-subtitle" aria-hidden="true">
          Arena
        </span>
        <p className="game-loading-message">Preparing the classroom…</p>
        <div className="game-loading-track" aria-hidden="true">
          <span />
        </div>
        <p className="game-loading-hint" aria-hidden="true">
          One desk. Two pens. Bragging rights.
        </p>
      </div>
    </div>
  );
}
