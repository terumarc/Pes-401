import type React from "react";
/**
 * Avatar pixel art generado para cada jugador (busto con la camiseta de su
 * club). Es determinista: el mismo jugador siempre tiene el mismo avatar.
 * Genérico a propósito: no reproduce el aspecto de ninguna persona real.
 */

const SIZE = 20;

const SKIN = [
  ["#f6d2b4", "#d9a988"],
  ["#eab38b", "#c98d66"],
  ["#c98e62", "#a46d45"],
  ["#9c6a43", "#7a4f2f"],
  ["#6e4528", "#52321c"],
] as const;

const HAIR = ["#1d1510", "#3b2416", "#6b3f1f", "#a5672e", "#d9b26a", "#8a8a8a", "#e8e2d4", "#5a1c12"];

type Style = "short" | "buzz" | "bald" | "long" | "curly" | "mohawk" | "side";
const STYLES: Style[] = ["short", "short", "buzz", "side", "curly", "long", "bald", "mohawk"];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function shade(hex: string, f: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function build(seed: string, shirt: string, trim: string) {
  const rnd = hash(seed);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
  const [skin, skinDark] = pick(SKIN);
  const hair = pick(HAIR);
  const style = pick(STYLES);
  const beard = rnd() < 0.3;
  const px: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) px[y][x] = c;
  };

  // camiseta (hombros) con cuello en pico
  for (let y = 15; y < SIZE; y++) {
    const half = 5 + (y - 15) + (y > 16 ? 1 : 0);
    for (let x = 10 - half; x < 10 + half; x++) set(x, y, y === 15 ? shade(shirt, 1.15) : shirt);
  }
  for (let y = 15; y < SIZE; y++) {
    const x0 = 10 - Math.max(0, 3 - (y - 15));
    const x1 = 9 + Math.max(0, 3 - (y - 15));
    if (y <= 17) { set(x0, y, trim); set(x1, y, trim); }
  }
  set(9, 16, skinDark); set(10, 16, skinDark);
  // cuello
  for (let y = 13; y < 16; y++) for (let x = 8; x < 12; x++) set(x, y, y === 13 ? skinDark : skin);
  // cabeza
  for (let y = 4; y < 14; y++)
    for (let x = 6; x < 14; x++) {
      const corner = (y === 4 || y === 13) && (x === 6 || x === 13);
      if (!corner) set(x, y, skin);
    }
  for (let y = 6; y < 13; y++) set(13, y, skinDark); // sombra lateral
  set(5, 8, skin); set(5, 9, skinDark); set(14, 8, skinDark); set(14, 9, skinDark); // orejas
  // ojos, cejas y boca
  set(8, 8, "#1b1b22"); set(11, 8, "#1b1b22");
  set(8, 7, shade(hair, 0.9)); set(11, 7, shade(hair, 0.9));
  set(9, 11, shade(skinDark, 0.85)); set(10, 11, shade(skinDark, 0.85));
  set(10, 9, skinDark);
  if (beard) {
    for (let x = 6; x < 14; x++) set(x, 12, shade(hair, 1));
    set(6, 11, hair); set(13, 11, hair); set(7, 13, hair); set(12, 13, hair);
    for (let x = 8; x < 12; x++) set(x, 13, hair);
    set(9, 11, shade(skinDark, 0.85)); set(10, 11, shade(skinDark, 0.85));
  }
  // pelo
  const top = (from: number, to: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = from; x <= to; x++) set(x, y, hair);
  };
  switch (style) {
    case "short":
      top(6, 13, 3, 4); top(5, 6, 5, 6); top(13, 14, 5, 6); top(7, 12, 5, 5); break;
    case "buzz":
      top(6, 13, 4, 4); set(6, 5, hair); set(13, 5, hair); break;
    case "side":
      top(6, 13, 3, 4); top(5, 7, 5, 7); top(8, 11, 5, 5); set(13, 5, hair); break;
    case "curly":
      top(5, 14, 2, 4); top(5, 6, 5, 7); top(13, 14, 5, 7);
      for (let x = 5; x <= 14; x += 2) set(x, 1, hair); break;
    case "long":
      top(6, 13, 3, 4); top(5, 6, 5, 13); top(13, 14, 5, 13); break;
    case "mohawk":
      top(9, 10, 1, 4); break;
    case "bald":
      set(7, 4, shade(skin, 1.08)); set(8, 4, shade(skin, 1.08)); break;
  }

  // contorno oscuro
  const out: { x: number; y: number; c: string }[] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      if (px[y][x]) out.push({ x, y, c: px[y][x]! });
      else {
        const n = [px[y - 1]?.[x], px[y + 1]?.[x], px[y]?.[x - 1], px[y]?.[x + 1]];
        if (n.some(Boolean) && y < SIZE - 1) out.push({ x, y, c: "#0b0e16" });
      }
    }
  return out;
}

export function PixelAvatar({
  seed,
  shirt,
  trim,
  className,
  style,
}: {
  seed: string;
  /** Color principal del club (camiseta). */
  shirt?: string | null;
  /** Color secundario del club (cuello). */
  trim?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const body = shirt || "#5d6675";
  const pixels = build(seed, body, trim || shade(body, 1.6));
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} shapeRendering="crispEdges" className={className} style={style} aria-hidden>
      {pixels.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={1} height={1} fill={p.c} />
      ))}
    </svg>
  );
}
