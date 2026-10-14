import Link from "next/link";
import type { ReactNode } from "react";
import { getPlayerEffectiveRating, getPlayerTier, getPositionGroup } from "@/lib/players";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Carta de jugador con la estética de los menús de PES 6 / PS2:       */
/* azul metálico biselado, brillo de cristal, líneas de escaneo,       */
/* cursiva gruesa y selección amarilla.                                */
/* ------------------------------------------------------------------ */

const NAVY = "linear-gradient(180deg,#1b3f8f 0%,#0e2a66 34%,#08193f 100%)";
const GLASS = "linear-gradient(180deg,rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.06) 48%,transparent 50%)";
const BAR = "linear-gradient(180deg,#4a8af0 0%,#2259c2 50%,#16409a 51%,#0e2f78 100%)";
const YELLOW = "linear-gradient(180deg,#fff27a 0%,#ffd12e 45%,#f59a00 100%)";
const GOLD_FRAME = "linear-gradient(160deg,#fff3b0,#e8b53e 35%,#8a5a12 70%,#f7d774)";
const BLUE_FRAME = "linear-gradient(160deg,#9cc8ff,#3b72d6 35%,#123a8a 70%,#6fa8ff)";
const SCAN = "repeating-linear-gradient(0deg,rgba(255,255,255,0.045) 0 1px,transparent 1px 3px)";

const LINE_STRIPE: Record<string, string> = {
  gk: "#f5c542",
  def: "#5fb4ff",
  mid: "#3ee6a0",
  att: "#ff5468",
  all: "#9aa4b5",
};

type CardPlayer = {
  id: string;
  name: string;
  short_name?: string | null;
  position: string;
  photo_url?: string | null;
  nationality?: string | null;
  overall?: number | null;
  defending?: number | null;
};

type Club = { name: string; short_name?: string | null; logo_url?: string | null; primary_color?: string | null } | null;

export function PlayerCardPS2({
  player,
  club,
  clubLabel,
  price,
  href,
  footer,
}: {
  player: CardPlayer;
  club?: Club;
  clubLabel?: string;
  price?: string;
  href?: string;
  footer?: ReactNode;
}) {
  const rating = getPlayerEffectiveRating(player);
  const tier = getPlayerTier(player as never);
  const stripe = LINE_STRIPE[getPositionGroup(player.position)];
  const elite = rating >= 90;
  const name = (player.short_name || player.name).toUpperCase();

  const card = (
    <div
      className="rounded-[10px] p-[2px] shadow-[0_10px_22px_-10px_rgba(0,0,0,0.9)]"
      style={{ background: elite ? GOLD_FRAME : BLUE_FRAME }}
    >
      <div className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-[8px]" style={{ background: NAVY }}>
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: SCAN }} />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2" style={{ background: GLASS }} />

        {/* pestaña de posición + nivel */}
        <div className="relative flex items-center justify-between px-1.5 pt-1.5">
          <span
            className="-skew-x-12 border-l-[3px] bg-black/45 px-1.5 py-[1px]"
            style={{ borderColor: stripe }}
          >
            <span className="block skew-x-12 text-[10px] font-black italic tracking-wide text-white">{player.position}</span>
          </span>
          <span className="-skew-x-12 border border-[#ffe680] px-1.5" style={{ background: YELLOW }}>
            <span className="block skew-x-12 text-[10px] font-black italic text-[#0a1430]">{tier.tier}</span>
          </span>
        </div>

        {/* media + avatar */}
        <div className="relative flex flex-1 items-center justify-between gap-1 px-2">
          <span
            className="text-[34px] font-black italic leading-none tabular-nums text-white"
            style={{ textShadow: "0 2px 0 #06143a, 0 0 12px rgba(90,170,255,0.85)" }}
          >
            {rating || "–"}
          </span>
          <span
            className="flex aspect-square w-[46%] items-center justify-center overflow-hidden rounded-full text-2xl font-black italic text-white/90"
            style={{
              background: "radial-gradient(circle at 35% 30%,#5b8fe6,#132f6e 70%)",
              boxShadow: `0 0 0 2px ${elite ? "#ffd12e" : "#8fc4ff"}, inset 0 -6px 10px rgba(0,0,0,0.45), 0 0 14px rgba(80,150,255,0.45)`,
            }}
            aria-hidden
          >
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photo_url} alt="" className="size-full object-cover" />
            ) : (
              player.name.slice(0, 1).toUpperCase()
            )}
          </span>
        </div>

        {/* barra con el nombre */}
        <div
          className="relative mx-1 -skew-x-6 border-y border-[#7fb0ff]/60 px-1 py-[3px]"
          style={{ background: BAR, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)" }}
        >
          <p className="skew-x-6 truncate text-center text-[13px] font-black italic tracking-tight text-white drop-shadow-[0_1px_0_#06143a]">
            {name}
          </p>
        </div>

        {/* club y precio */}
        <div className="relative flex items-center justify-between gap-1 px-1.5 pb-1.5 pt-1">
          <span className="flex min-w-0 items-center gap-1">
            {club?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.logo_url} alt="" className="size-4 shrink-0 rounded-full object-cover ring-1 ring-white/30" />
            ) : club ? (
              <span className="size-3.5 shrink-0 rounded-full ring-1 ring-white/30" style={{ background: club.primary_color ?? "#888" }} />
            ) : null}
            <span className="truncate text-[9px] font-bold italic uppercase tracking-wide text-[#b9d6ff]">
              {clubLabel ?? club?.short_name ?? club?.name ?? player.nationality}
            </span>
          </span>
          {price && (
            <span className="shrink-0 text-[10px] font-black italic tabular-nums text-[#ffd12e]">{price}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {href ? (
        <Link
          href={href}
          aria-label={`${player.name}, ${player.position}, media ${rating}`}
          className={cn(
            "block rounded-[10px] outline-none transition-[transform,filter] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[#ffd12e]",
            "motion-safe:hover:-translate-y-0.5 hover:brightness-110",
          )}
        >
          {card}
        </Link>
      ) : (
        card
      )}
      {footer}
    </div>
  );
}

/** Botón con el estilo de selección de PES 6 (amarillo) o secundario (azul). */
export function PS2Button({
  children,
  onClick,
  primary = true,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "mx-auto h-9 w-[calc(100%-0.6rem)] -skew-x-12 border text-xs font-black italic uppercase tracking-wide transition-[filter,transform] hover:brightness-110 active:scale-[0.97]",
        primary ? "border-[#ffe680] text-[#0a1430]" : "border-[#5d93ef] text-white",
      )}
      style={{ background: primary ? YELLOW : BAR, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 0 rgba(0,0,0,0.5)" }}
    >
      <span className="block skew-x-12">{children}</span>
    </button>
  );
}
