import type { CSSProperties } from "react";
import type { TrophyType } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Trofeo 3D en pixel art. Cada imagen de /public/trophies es una tira de
 * FRAMES fotogramas (40×56 px) del modelo girando sobre su eje; se reproduce
 * a saltos, como un sprite, y se escala sin suavizar.
 * Se genera con scripts/render-trophies.py.
 */
const FRAMES = 16;
const SPRITE_W = 40;
const SPRITE_H = 56;

export function PixelTrophy({
  type,
  dimmed = false,
  spin = true,
  delay = 0,
  className,
  title,
}: {
  type: TrophyType;
  dimmed?: boolean;
  /** Girar. Desactívalo en iconos pequeños para no distraer. */
  spin?: boolean;
  /** Retraso en ms para que varios trofeos no giren sincronizados. */
  delay?: number;
  className?: string;
  title?: string;
}) {
  const style: CSSProperties = {
    aspectRatio: `${SPRITE_W} / ${SPRITE_H}`,
    backgroundImage: `url(/trophies/${type}.png)`,
    backgroundSize: `${FRAMES * 100}% 100%`,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
    animationDelay: delay ? `${delay}ms` : undefined,
    ...(dimmed ? { filter: "grayscale(1) brightness(0.55)", opacity: 0.45 } : null),
  };

  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("inline-block", spin && !dimmed && "trophy-spin", className)}
      style={style}
    />
  );
}
