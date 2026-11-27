import {
  HERO_BLOCKS,
  HERO_STAGE,
  HERO_WIRES,
  heroWirePath,
} from "@/presentation/components/landing-hero-canvas-layout";

// SVG wires behind the blocks; a lime dash runs along each wire to show media flowing to the reel.
export function HeroCanvasWires({ layout }: { layout: "d" | "m" }) {
  const stage = HERO_STAGE[layout];
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${stage.w} ${stage.h}`}
      className={`absolute inset-0 h-full w-full ${layout === "d" ? "hidden sm:block" : "sm:hidden"}`}
      fill="none"
    >
      {HERO_WIRES.map(([from, to], i) => {
        const d = heroWirePath(HERO_BLOCKS[from][layout], HERO_BLOCKS[to][layout]);
        // First and last coordinate pairs are the two port positions.
        const points = d.match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g) ?? [];
        const ports = [points[0], points[points.length - 1]].map((p) => p?.split(",").map(Number));
        return (
          <g key={`${from}-${to}`}>
            <path d={d} stroke="rgba(198,242,75,0.28)" strokeWidth={2.5} />
            {ports.map((p, j) =>
              p ? (
                <circle key={j} cx={p[0]} cy={p[1]} r={5} fill="#0d0e13" stroke="#c6f24b" strokeWidth={2} />
              ) : null,
            )}
            <path
              d={d}
              stroke="#c6f24b"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="10 26"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="72"
                to="0"
                dur={`${1.4 + (i % 3) * 0.2}s`}
                repeatCount="indefinite"
              />
            </path>
          </g>
        );
      })}
    </svg>
  );
}
