import type { TrophyType } from "@/types";
import { TROPHY_SPRITES } from "@/components/trophies/trophy-sprites";

type Run = { x: number; y: number; w: number; color: string };

const RUNS: Record<TrophyType, { runs: Run[]; w: number; h: number }> = (() => {
  const out = {} as Record<TrophyType, { runs: Run[]; w: number; h: number }>;
  for (const [key, sprite] of Object.entries(TROPHY_SPRITES) as [
    TrophyType,
    (typeof TROPHY_SPRITES)[TrophyType],
  ][]) {
    const runs: Run[] = [];
    sprite.rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        let w = 1;
        while (row[x + w] === ch) w++;
        if (ch !== ".") runs.push({ x, y, w, color: sprite.palette[ch] });
        x += w;
      }
    });
    out[key] = { runs, w: sprite.rows[0].length, h: sprite.rows.length };
  }
  return out;
})();

/** Trofeo en pixel art. Se escala sin suavizar para mantener los píxeles nítidos. */
export function PixelTrophy({
  type,
  dimmed = false,
  className,
  title,
}: {
  type: TrophyType;
  dimmed?: boolean;
  className?: string;
  title?: string;
}) {
  const { runs, w, h } = RUNS[type];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      style={dimmed ? { filter: "grayscale(1) brightness(0.55)", opacity: 0.45 } : undefined}
    >
      {title && <title>{title}</title>}
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </svg>
  );
}
