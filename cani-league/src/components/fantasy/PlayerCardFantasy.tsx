import Link from "next/link";
import type { ReactNode } from "react";
import { getPlayerEffectiveRating, getPlayerTier } from "@/lib/players";
import { lineTone } from "@/components/fantasy/primitives";
import { cn } from "@/lib/utils";

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

type Club = { name: string; logo_url?: string | null; primary_color?: string | null } | null;

/** Acabado de la carta según la media, como las cartas de los juegos de fútbol. */
function finish(rating: number) {
  if (rating >= 90)
    return {
      bg: "linear-gradient(160deg,#fff3c4 0%,#e9bd52 28%,#a87418 70%,#5b3c08 100%)",
      ink: "text-[#2b1a00]",
      sub: "text-[#4a3108]/80",
      edge: "ring-[#ffe08a]/70",
      shine: true,
    };
  if (rating >= 84)
    return {
      bg: "linear-gradient(160deg,#f4f6f9 0%,#c4ccd6 30%,#7f8a98 72%,#3c4450 100%)",
      ink: "text-[#151a21]",
      sub: "text-[#232a33]/75",
      edge: "ring-white/50",
      shine: true,
    };
  return {
    bg: "linear-gradient(160deg,#3a3f48 0%,#262a31 45%,#16181c 100%)",
    ink: "text-foreground",
    sub: "text-muted-foreground",
    edge: "ring-white/10",
    shine: false,
  };
}

function Crest({ club }: { club: Club }) {
  if (!club) return null;
  if (club.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={club.logo_url} alt="" className="size-4 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      className="size-4 shrink-0 rounded-full ring-1 ring-black/20"
      style={{ backgroundColor: club.primary_color ?? "#666" }}
      aria-hidden
    />
  );
}

/** Carta de jugador estilo fantasy. `footer` va pegado debajo (precio, botón…). */
export function PlayerCardFantasy({
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
  const tone = lineTone(player.position);
  const f = finish(rating);
  const displayName = player.short_name || player.name;

  const card = (
    <div
      className={cn(
        "relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl p-2.5 ring-1 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.7)]",
        f.edge,
      )}
      style={{ background: f.bg }}
    >
      {f.shine && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-y-6 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
      )}

      {/* media y posición */}
      <div className={cn("relative flex items-start justify-between", f.ink)}>
        <div className="flex flex-col items-center leading-none">
          <span className="text-[26px] font-black tabular-nums tracking-tight">{rating || "–"}</span>
          <span className={cn("mt-1 rounded-[4px] px-1 py-0.5 text-[9px] font-bold", tone.chip)}>{player.position}</span>
        </div>
        <span className={cn("rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-sm", f.shine ? "text-white" : tier.color)}>
          {tier.tier}
        </span>
      </div>

      {/* avatar */}
      <div className="relative flex flex-1 items-center justify-center">
        <span
          className={cn(
            "flex size-[42%] min-w-14 items-center justify-center overflow-hidden rounded-full text-2xl font-black shadow-inner ring-2",
            f.shine ? "bg-black/15 text-white/90 ring-white/40" : "bg-white/[0.06] text-foreground/80 ring-white/10",
          )}
          style={{ aspectRatio: "1" }}
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

      {/* nombre, club y precio */}
      <div className="relative text-center">
        <p className={cn("truncate text-[15px] font-extrabold leading-tight tracking-tight", f.ink)}>{displayName}</p>
        <p className={cn("mt-0.5 flex items-center justify-center gap-1 truncate text-[10px] font-medium", f.sub)}>
          <Crest club={club ?? null} />
          <span className="truncate">{clubLabel ?? club?.name ?? player.nationality}</span>
        </p>
        {price && (
          <p className={cn("mt-1.5 rounded-lg bg-black/25 py-1 text-[12px] font-bold tabular-nums", f.shine ? "text-white" : "text-foreground")}>
            {price}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {href ? (
        <Link
          href={href}
          aria-label={`${player.name}, ${player.position}, media ${rating}`}
          className="block rounded-2xl outline-none transition-transform active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-0.5"
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

/** Rejilla de cartas: 2 por fila en el móvil y más en pantallas grandes. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{children}</div>;
}
