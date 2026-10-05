export function PenPointer({ top }: { top: number }) {
  return (
    <div className="pen-pointer" aria-hidden="true" style={{ top }}>
      <svg viewBox={"0 0 155 34"} xmlns={"http://www.w3.org/2000/svg"}>
        <defs>
          <linearGradient id={"ppbody"} x1={"0"} x2={"0"} y1={"0"} y2={"1"}>
            <stop stopColor={"#5295cd"}></stop>
            <stop offset={".48"} stopColor={"#e2f4ff"}></stop>
            <stop offset={"1"} stopColor={"#3b77a6"}></stop>
          </linearGradient>
        </defs>
        <path d={"M7 17L20 10V24z"} fill={"#a9abb0"}></path>
        <path
          d={"M1 17H8"}
          stroke={"#272e35"}
          strokeWidth={"2"}
          strokeLinecap={"round"}
        ></path>
        <path d={"M20 10h10v14H20z"} fill={"#b3c0cb"}></path>
        <rect
          x={"30"}
          y={"8"}
          width={"119"}
          height={"18"}
          rx={"6"}
          fill={"url(#ppbody)"}
          stroke={"#4b6f9a"}
          strokeWidth={"1"}
        ></rect>
        <rect
          x={"116"}
          y={"7"}
          width={"26"}
          height={"4"}
          rx={"2"}
          fill={"#d0dbe6"}
        ></rect>
        <rect
          x={"31"}
          y={"9"}
          width={"9"}
          height={"16"}
          rx={"2"}
          fill={"#6e899f"}
        ></rect>
        <path d={"M56 12h65"} stroke={"#fff"} strokeOpacity={".8"}></path>
        <text
          x={"65"}
          y={"20"}
          fontSize={"8"}
          fill={"#245079"}
          fontWeight={"bold"}
          fontFamily={"sans-serif"}
        >
          MATADOR
        </text>
      </svg>
    </div>
  );
}
