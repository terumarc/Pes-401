import Link from "next/link";
import type { ReactNode } from "react";
import { getPositionGroup, getPlayerEffectiveRating, getPlayerTier } from "@/lib/players";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Piezas comunes con el lenguaje de las apps de fantasy:              */
/* posición en color por línea, media grande, filas compactas.         */
/* ------------------------------------------------------------------ */

const LINE_TONE = {
  gk: { chip: "bg-amber-400 text-amber-950", ring: "ring-amber-400/60", text: "text-amber-300", label: "POR" },
  def: { chip: "bg-sky-400 text-sky-950", ring: "ring-sky-400/60", text: "text-sky-300", label: "DEF" },
  mid: { chip: "bg-emerald-400 text-emerald-950", ring: "ring-emerald-400/60", text: "text-emerald-300", label: "MED" },
  att: { chip: "bg-rose-400 text-rose-950", ring: "ring-rose-400/60", text: "text-rose-300", label: "DEL" },
  all: { chip: "bg-muted text-foreground", ring: "ring-border", text: "text-foreground", label: "—" },
} as const;

export function lineTone(position?: string | null) {
  return LINE_TONE[getPositionGroup(position)];
}

/** Ficha de posición: código real (CB, CMF…) sobre el color de su línea. */
export function PositionChip({ position, className }: { position: string; className?: string }) {
  const tone = lineTone(position);
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-8 items-center justify-center rounded-[5px] px-1 text-[12px] font-bold leading-none tracking-wide tabular-nums",
        tone.chip,
        className,
      )}
    >
      {position}
    </span>
  );
}

/** Avatar del jugador: foto o inicial, con aro del color de su línea. */
export function PlayerBadge({
  name,
  photoUrl,
  position,
  size = 44,
}: {
  name: string;
  photoUrl?: string | null;
  position: string;
  size?: number;
}) {
  const tone = lineTone(position);
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-white/15 to-white/[0.03] font-semibold text-foreground ring-2",
        tone.ring,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/** Media en grande, coloreada por nivel. */
export function RatingValue({ player, className }: { player: Parameters<typeof getPlayerEffectiveRating>[0] & { position?: string }; className?: string }) {
  const rating = getPlayerEffectiveRating(player);
  const tier = getPlayerTier(player as never);
  return (
    <span className={cn("flex flex-col items-end leading-none", className)}>
      <span className={cn("text-[22px] font-bold tabular-nums tracking-tight", rating >= 88 ? "text-primary" : "text-foreground")}>
        {rating || "–"}
      </span>
      <span className={cn("mt-1 text-[12px] font-semibold", tier.color)}>{tier.tier}</span>
    </span>
  );
}

type RowPlayer = {
  id: string;
  name: string;
  position: string;
  photo_url?: string | null;
  nationality?: string | null;
  overall?: number | null;
  defending?: number | null;
};

/** Fila de jugador estilo fantasy: avatar, nombre, club, media y una acción opcional. */
export function PlayerRow({
  player,
  subtitle,
  meta,
  action,
  href,
}: {
  player: RowPlayer;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <PlayerBadge name={player.name} photoUrl={player.photo_url} position={player.position} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <PositionChip position={player.position} />
          <span className="truncate text-[15px] font-semibold">{player.name}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
        {meta && <span className="mt-0.5 block truncate text-xs font-medium tabular-nums text-foreground/80">{meta}</span>}
      </span>
      <RatingValue player={player} />
    </>
  );

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
      {href ? (
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none transition-opacity active:opacity-60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {body}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
      )}
      {action && <span className="shrink-0 pl-1">{action}</span>}
    </div>
  );
}

/** Contenedor de filas: tarjeta con separadores, como una lista agrupada nativa. */
export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/80 bg-card/60 divide-y divide-border/60", className)}>
      {children}
    </div>
  );
}

/** Tira de cifras compacta que se desliza en horizontal en el móvil. */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; hint?: ReactNode }[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <dl className="flex gap-2 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {items.map((it) => (
          <div key={it.label} className="min-w-[8.5rem] shrink-0 rounded-2xl border border-border/80 bg-card/60 px-3.5 py-3">
            <dt className="text-[12px] font-medium text-muted-foreground">{it.label}</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums tracking-tight">{it.value}</dd>
            {it.hint && <dd className="mt-0.5 text-[12px] text-muted-foreground">{it.hint}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Fichas deslizables (filtros de posición, jornadas…). */
export function ChipScroller<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors select-none active:scale-[0.97]",
              active ? "bg-primary text-primary-foreground" : "bg-card/80 text-muted-foreground ring-1 ring-border hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("text-xs tabular-nums", active ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
