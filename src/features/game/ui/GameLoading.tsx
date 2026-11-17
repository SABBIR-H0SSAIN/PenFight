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

export function GameLoading() {
  return (
    <div className="runtime-status game-loading">
      <div className="game-loading-content">
        <div className="game-loading-arena" aria-hidden="true">
          <LoadingPen color="blue" />
          <LoadingPen color="orange" />
        </div>
        <h1 className="game-loading-title">
          Pen<span>Fight</span>
          <span className="game-loading-subtitle">Arena</span>
        </h1>
        <div className="game-loading-status" role="status">
          <p>Loading the classroom…</p>
          <span className="game-loading-track" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
