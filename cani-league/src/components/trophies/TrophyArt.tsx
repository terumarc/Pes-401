import { useId } from "react";
import type { TrophyType } from "@/types";

type Metal = { light: string; mid: string; dark: string };

const GOLD: Metal = { light: "#fff3c4", mid: "#e8b53e", dark: "#8a5a12" };
const SILVER: Metal = { light: "#ffffff", mid: "#c9d1db", dark: "#5f6b7a" };
const WOOD = { light: "#6b4128", dark: "#2b170c" };

/**
 * Trofeos ilustrados a mano para la sala de trofeos.
 * Diseños propios (sin logos oficiales); cada competición tiene su silueta.
 */
export function TrophyArt({
  type,
  dimmed = false,
  className,
}: {
  type: TrophyType;
  dimmed?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const metal = type === "league" || type === "cup" ? GOLD : SILVER;
  const g = (name: string) => `${name}-${uid}`;

  return (
    <svg
      viewBox="0 0 100 140"
      className={className}
      role="img"
      aria-hidden
      style={
        dimmed
          ? { filter: "grayscale(1) brightness(0.45)", opacity: 0.55 }
          : { filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" }
      }
    >
      <defs>
        <linearGradient id={g("metal")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={metal.dark} />
          <stop offset="0.35" stopColor={metal.light} />
          <stop offset="0.6" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
        <linearGradient id={g("metalV")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
        <linearGradient id={g("wood")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={WOOD.light} />
          <stop offset="1" stopColor={WOOD.dark} />
        </linearGradient>
        <linearGradient id={g("green")} x1="0" x2="1">
          <stop offset="0" stopColor="#0f5132" />
          <stop offset="0.45" stopColor="#7ee2b0" />
          <stop offset="1" stopColor="#0f5132" />
        </linearGradient>
        <linearGradient id={g("ruby")} x1="0" x2="1">
          <stop offset="0" stopColor="#5c0b14" />
          <stop offset="0.45" stopColor="#e2475a" />
          <stop offset="1" stopColor="#5c0b14" />
        </linearGradient>
      </defs>

      {type === "league" && <LeagueTrophy g={g} />}
      {type === "champions" && <ChampionsTrophy g={g} />}
      {type === "cup" && <CupTrophy g={g} />}
      {type === "conference" && <ConferenceTrophy g={g} />}
    </svg>
  );
}

type G = { g: (name: string) => string };

/** Liga: copa alta y esbelta con corona de laurel y peana escalonada. */
function LeagueTrophy({ g }: G) {
  return (
    <>
      <rect x="22" y="122" width="56" height="14" rx="2" fill={`url(#${g("wood")})`} />
      <rect x="28" y="112" width="44" height="11" rx="2" fill={`url(#${g("wood")})`} />
      <rect x="34" y="104" width="32" height="8" rx="1.5" fill={`url(#${g("metal")})`} />
      <path d="M44 104 L46 82 L54 82 L56 104 Z" fill={`url(#${g("metal")})`} />
      <ellipse cx="50" cy="82" rx="8" ry="3" fill={`url(#${g("metal")})`} />
      <path
        d="M27 12 H73 C73 46 64 70 50 76 C36 70 27 46 27 12 Z"
        fill={`url(#${g("metal")})`}
      />
      <ellipse cx="50" cy="12" rx="23" ry="4.5" fill={`url(#${g("metalV")})`} />
      <path d="M28 20 C14 20 14 44 33 50" fill="none" stroke={`url(#${g("metal")})`} strokeWidth="4" strokeLinecap="round" />
      <path d="M72 20 C86 20 86 44 67 50" fill="none" stroke={`url(#${g("metal")})`} strokeWidth="4" strokeLinecap="round" />
      {/* laurel */}
      <path d="M40 54 C34 48 34 38 38 32" fill="none" stroke="#7a4d0c" strokeWidth="1.6" opacity="0.7" />
      <path d="M60 54 C66 48 66 38 62 32" fill="none" stroke="#7a4d0c" strokeWidth="1.6" opacity="0.7" />
      <path d="M50 30 L53 37 L60 37 L54.5 41.5 L56.5 48.5 L50 44.5 L43.5 48.5 L45.5 41.5 L40 37 L47 37 Z" fill="#fff6d6" opacity="0.9" />
      <path d="M33 16 C35 34 39 52 46 66" fill="none" stroke="#fff" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
    </>
  );
}

/** Champions: gran copa plateada con asas amplias que bajan hasta el pie. */
function ChampionsTrophy({ g }: G) {
  return (
    <>
      <rect x="26" y="124" width="48" height="12" rx="2" fill={`url(#${g("wood")})`} />
      <path d="M34 124 C36 112 42 106 50 104 C58 106 64 112 66 124 Z" fill={`url(#${g("metal")})`} />
      <path d="M46 104 L47 86 L53 86 L54 104 Z" fill={`url(#${g("metal")})`} />
      <path
        d="M30 14 H70 C72 44 64 74 50 86 C36 74 28 44 30 14 Z"
        fill={`url(#${g("metal")})`}
      />
      <ellipse cx="50" cy="14" rx="20" ry="4" fill={`url(#${g("metalV")})`} />
      {/* asas grandes */}
      <path
        d="M31 22 C6 14 2 50 14 72 C22 88 34 98 44 104"
        fill="none"
        stroke={`url(#${g("metal")})`}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M69 22 C94 14 98 50 86 72 C78 88 66 98 56 104"
        fill="none"
        stroke={`url(#${g("metal")})`}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M36 20 C37 42 41 62 48 78" fill="none" stroke="#fff" strokeWidth="2.2" opacity="0.5" strokeLinecap="round" />
      <circle cx="50" cy="44" r="7" fill="none" stroke="#3b4656" strokeWidth="1.4" opacity="0.6" />
      <circle cx="50" cy="44" r="2.2" fill="#3b4656" opacity="0.55" />
    </>
  );
}

/** Copa de Liga: copa clásica de boca ancha con tapa, remate y cinta roja. */
function CupTrophy({ g }: G) {
  return (
    <>
      <rect x="24" y="122" width="52" height="14" rx="2" fill={`url(#${g("wood")})`} />
      <rect x="24" y="126" width="52" height="4" fill={`url(#${g("ruby")})`} />
      <path d="M36 122 L40 110 H60 L64 122 Z" fill={`url(#${g("metal")})`} />
      <path d="M46 110 L47 90 H53 L54 110 Z" fill={`url(#${g("metal")})`} />
      <ellipse cx="50" cy="90" rx="9" ry="3" fill={`url(#${g("metal")})`} />
      <path d="M20 36 H80 C80 62 68 84 50 88 C32 84 20 62 20 36 Z" fill={`url(#${g("metal")})`} />
      {/* tapa y remate */}
      <path d="M22 36 C26 26 74 26 78 36 Z" fill={`url(#${g("metalV")})`} />
      <rect x="47" y="18" width="6" height="10" rx="1.5" fill={`url(#${g("metal")})`} />
      <circle cx="50" cy="15" r="5" fill={`url(#${g("metalV")})`} />
      <path d="M21 44 C8 44 8 66 26 68" fill="none" stroke={`url(#${g("metal")})`} strokeWidth="4" strokeLinecap="round" />
      <path d="M79 44 C92 44 92 66 74 68" fill="none" stroke={`url(#${g("metal")})`} strokeWidth="4" strokeLinecap="round" />
      {/* cinta */}
      <path d="M26 50 C40 56 60 56 74 50 L72 58 C58 63 42 63 28 58 Z" fill={`url(#${g("ruby")})`} />
      <path d="M27 42 C29 58 36 72 46 80" fill="none" stroke="#fff" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
    </>
  );
}

/** Conference: trofeo moderno, columna estilizada con anillo esmeralda. */
function ConferenceTrophy({ g }: G) {
  return (
    <>
      <rect x="28" y="124" width="44" height="12" rx="6" fill="#1b222c" />
      <rect x="28" y="124" width="44" height="3" rx="1.5" fill={`url(#${g("green")})`} />
      <path d="M40 124 L44 96 H56 L60 124 Z" fill={`url(#${g("metal")})`} />
      <path
        d="M44 96 C34 80 30 50 36 22 C40 10 60 10 64 22 C70 50 66 80 56 96 Z"
        fill={`url(#${g("metal")})`}
      />
      {/* anillo */}
      <ellipse cx="50" cy="56" rx="22" ry="7" fill="none" stroke={`url(#${g("green")})`} strokeWidth="4" />
      <path d="M28 56 C30 62 70 62 72 56" fill="none" stroke="#0b3a24" strokeWidth="1" opacity="0.6" />
      <path d="M41 26 C38 46 40 72 47 90" fill="none" stroke="#fff" strokeWidth="2" opacity="0.45" strokeLinecap="round" />
      <path d="M50 14 L52 19 L57 19 L53 22 L54.5 27 L50 24 L45.5 27 L47 22 L43 19 L48 19 Z" fill="#7ee2b0" />
    </>
  );
}
