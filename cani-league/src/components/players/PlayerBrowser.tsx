"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { PixelAvatar } from "@/components/fantasy/PixelAvatar";
import { TransferModal } from "@/components/market/TransferModal";
import { formatMoney } from "@/lib/format/money";
import { getPlayerEffectiveRating, getPlayerFixedPrice, getPlayerTier, getPositionGroup } from "@/lib/players";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types";
import { searchPlayersAction } from "@/app/actions/player-search";
import type { PlayerSearchResult } from "@/lib/data/player-search";

type Row = Player & { team?: Partial<Team> | null };

const TIER_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "S+", label: "S+" },
  { key: "S", label: "S" },
  { key: "A", label: "A" },
  { key: "B", label: "B" },
  { key: "C", label: "C" },
  { key: "D", label: "D" },
] as const;

const GROUPS = [
  { key: "all", label: "Todos" },
  { key: "gk", label: "POR" },
  { key: "def", label: "DEF" },
  { key: "mid", label: "MED" },
  { key: "att", label: "DEL" },
] as const;

const SORTS = [
  { key: "rating", label: "Media" },
  { key: "price", label: "Precio" },
  { key: "name", label: "Nombre" },
  { key: "age", label: "Edad" },
] as const;


function compactMoney(v: number) {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  return formatMoney(v);
}

function isFree(p: Row) {
  const n = p.team?.name?.toLowerCase() ?? "";
  return !p.team_id || !p.team || n.includes("libre") || n.includes("sin equipo");
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { key: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-9 w-full rounded-[9px] bg-input p-[2px] sm:max-w-md">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={cn(
              "flex-1 rounded-[7px] text-[length:min(0.7647rem,19.5px)] font-semibold transition-colors",
              active ? "bg-[#636366] text-white" : "text-[#ebebf5]/60",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Buscador de jugadores al estilo iOS: campo de búsqueda, control segmentado por línea
 * y lista agrupada. En modo mercado cada fila lleva su precio y el botón de fichar.
 */
export function PlayerBrowser({
  initial,
  teams,
  mode,
  marketOpen = true,
}: {
  /** Primera página (40) ya buscada en el servidor con los filtros por defecto. */
  initial: PlayerSearchResult;
  teams: Team[];
  mode: "players" | "market";
  /** Con la ventana de fichajes cerrada los botones de fichar se desactivan. */
  marketOpen?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]["key"]>("all");
  const [tier, setTier] = useState<(typeof TIER_FILTERS)[number]["key"]>("all");
  const [origin, setOrigin] = useState<"all" | "free" | "club">("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("rating");
  const [buying, setBuying] = useState<Row | null>(null);
  const [result, setResult] = useState(initial);
  const [loading, startLoading] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const request = useRef(0);
  const firstRun = useRef(true);

  // Cada cambio de búsqueda o filtro pide la primera página al servidor (la búsqueda espera 250 ms a que dejes de escribir).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = ++request.current;
    const t = setTimeout(
      () =>
        startLoading(async () => {
          try {
            const r = await searchPlayersAction({ q: query, group, tier, origin, sort, offset: 0 });
            if (id === request.current) {
              setResult(r);
              setFailed(false);
            }
          } catch {
            if (id === request.current) setFailed(true);
          }
        }),
      query ? 250 : 0,
    );
    return () => clearTimeout(t);
  }, [query, group, tier, origin, sort]);

  async function loadMore() {
    const id = request.current;
    setLoadingMore(true);
    try {
      const r = await searchPlayersAction({ q: query, group, tier, origin, sort, offset: result.rows.length });
      if (id === request.current) setResult((prev) => ({ rows: [...prev.rows, ...r.rows], total: r.total }));
    } catch {
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const shown = result.rows as Row[];
  const total = result.total;

  return (
    <div className="space-y-4">
      {/* Campo de búsqueda de iOS */}
      <label className="relative block">
        <span className="sr-only">Buscar jugadores</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Nombre, club o país"
          className="h-11 w-full rounded-[10px] bg-input pl-10 pr-10 text-[length:min(1rem,25.5px)] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center text-muted-foreground"
          >
            <span className="flex size-[18px] items-center justify-center rounded-full bg-[#8e8e93] text-black">
              <X className="size-3" strokeWidth={3} />
            </span>
          </button>
        )}
      </label>

      <Segmented label="Línea" value={group} onChange={setGroup} options={GROUPS} />
      <Segmented label="Nivel" value={tier} onChange={setTier} options={TIER_FILTERS} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {mode === "market" ? (
          <div className="flex gap-2">
            {(
              [
                ["all", "Todos"],
                ["free", "Libres"],
                ["club", "Con club"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={origin === k}
                onClick={() => setOrigin(k)}
                className={cn(
                  "relative h-8 rounded-full px-3.5 text-[length:min(0.8824rem,22.5px)] font-semibold after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
                  origin === k ? "bg-white text-black" : "bg-card text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground tabular-nums" aria-live="polite">{total} jugadores</p>
        )}
        <label className="flex items-center gap-1.5 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
          <span className={mode === "market" ? "sr-only" : undefined}>Ordenar por</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-8 rounded-full bg-card px-3 text-[length:min(0.8824rem,22.5px)] font-semibold text-foreground outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {shown.length === 0 && !loading ? (
        <div className="rounded-[22px] bg-card px-6 py-10 text-center">
          <p className="text-[length:min(1rem,25.5px)] font-semibold">Sin resultados</p>
          <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">Prueba con otro nombre o quita los filtros.</p>
        </div>
      ) : (
        <ul className={cn("overflow-hidden rounded-[22px] bg-card transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          {shown.map((p) => {
            const free = isFree(p);
            const rating = getPlayerEffectiveRating(p);
            const tier = getPlayerTier(p);
            return (
              <li key={p.id} className="group">
                <PlayerRow
                  p={p}
                  free={free}
                  rating={rating}
                  tier={tier.tier}
                  mode={mode}
                  marketOpen={marketOpen}
                  onBuy={() => setBuying(p)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {failed && (
        <p role="alert" className="px-1 text-[length:min(0.8824rem,22.5px)] text-destructive">
          No se pudo cargar la lista. Comprueba la conexión y vuelve a cambiar un filtro.
        </p>
      )}

      {total > shown.length && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="h-11 w-full rounded-full bg-card text-[length:min(1rem,25.5px)] font-semibold text-[#0a84ff] active:opacity-70 disabled:opacity-60"
        >
          {loadingMore ? "Cargando…" : `Mostrar más (${total - shown.length})`}
        </button>
      )}

      {buying && (
        <TransferModal
          player={buying as Player & { team?: Pick<Team, "id" | "name"> | null }}
          teams={teams}
          open
          onOpenChange={(o) => !o && setBuying(null)}
          purchaseType={isFree(buying) ? "mercado" : "clausula"}
        />
      )}
    </div>
  );
}

/**
 * Tonos apagados (saturación ~75 %) para nivel y posición: el color es un acento, no un relleno.
 * Todos cumplen ≥ 4,5:1 sobre la tarjeta.
 */
const TIER_TINT: Record<string, string> = {
  "S+": "#c4a1f2",
  S: "#e3c46a",
  A: "#7fb2ef",
  B: "#7fd49b",
  C: "#b4b4ba",
  D: "#8e8e93",
};
const LINE_TINT: Record<string, string> = { gk: "#e8c35a", def: "#74aee8", mid: "#6fcf97", att: "#ec8a8a" };

function Avatar({ p, free, className }: { p: Row; free: boolean; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#2a2a2d] ring-1 ring-white/[0.08]", className)}>
      {p.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photo_url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <PixelAvatar
          seed={p.id}
          shirt={free ? "#5d6675" : p.team?.primary_color}
          trim={free ? undefined : p.team?.secondary_color}
          className="size-full translate-y-[12%] scale-110"
        />
      )}
    </span>
  );
}

/** La media es lo único con peso; el nivel va debajo, pequeño y en su tono. */
function Rating({ rating, tier }: { rating: number; tier: string }) {
  const tint = TIER_TINT[tier] ?? TIER_TINT.D;
  return (
    <span
      className="flex size-11 shrink-0 flex-col items-center justify-center rounded-[12px] bg-white/[0.05] leading-none tabular-nums ring-1 ring-inset large-text:h-[58px] large-text:w-[54px]"
      style={{ ["--tw-ring-color" as string]: `${tint}33` }}
      aria-label={`Media ${rating || "sin datos"}, nivel ${tier}`}
    >
      <span className="text-[18px] font-semibold tracking-tight text-foreground large-text:text-[24px]">{rating || "–"}</span>
      <span className="mt-1 text-[12px] font-medium tracking-wide large-text:text-[13px]" style={{ color: tint }}>
        {tier}
      </span>
    </span>
  );
}

/** Posición en su tono, club con escudo pequeño (o «Libre») y, si toca, edad o precio. */
function MetaLine({ p, free, showAge, price, className }: { p: Row; free: boolean; showAge: boolean; price?: string; className?: string }) {
  const crest = !free && p.team?.logo_url;
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 text-[length:min(0.7647rem,19.5px)] text-muted-foreground", className)}>
      <span className="shrink-0 font-medium tracking-wide" style={{ color: LINE_TINT[getPositionGroup(p.position)] ?? undefined }}>
        {p.position}
      </span>
      <span aria-hidden className="shrink-0 opacity-50">·</span>
      {crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" className="size-4 shrink-0 rounded-full object-cover" />
      ) : free ? (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[#7fd49b]" />
      ) : null}
      <span className="flex min-w-0 items-baseline gap-1">
        <span className="min-w-0 truncate large-text:whitespace-normal">
          {free ? "Libre" : p.team?.short_name || p.team?.name}
          {showAge && p.age ? ` · ${p.age} años` : ""}
        </span>
        {price && <span className="shrink-0 font-medium tabular-nums text-foreground/90">· {price}</span>}
      </span>
    </span>
  );
}

/** Botón teñido, como los de iOS: azul suave para fichar, neutro para pagar la cláusula. */
function BuyButton({ free, name, disabled, onBuy, wide }: { free: boolean; name: string; disabled: boolean; onBuy: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onBuy}
      disabled={disabled}
      aria-label={free ? `Fichar a ${name}` : `Pagar la cláusula de ${name}`}
      className={cn(
        "relative shrink-0 rounded-full font-medium transition-colors active:opacity-70 disabled:opacity-30 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
        wide ? "h-11 px-6 text-[length:min(1rem,25.5px)]" : "h-8 px-3.5 text-[length:min(0.8824rem,22.5px)]",
        free ? "bg-[#0a84ff]/[0.16] text-[#5ea8ff]" : "bg-white/[0.07] text-foreground/90",
      )}
    >
      {free ? "Fichar" : "Cláusula"}
    </button>
  );
}

/**
 * Fila de jugador: foto, nombre, posición y club en una línea discreta, y la media como único
 * elemento con peso. En el mercado, precio en la línea del club y botón teñido a la derecha.
 * Con letra grande se apila: foto, nombre y media arriba; posición y club; precio y botón al final.
 */
function PlayerRow({
  p,
  free,
  rating,
  tier,
  mode,
  marketOpen,
  onBuy,
}: {
  p: Row;
  free: boolean;
  rating: number;
  tier: string;
  mode: "players" | "market";
  marketOpen: boolean;
  onBuy: () => void;
}) {
  const price = compactMoney(getPlayerFixedPrice(p));
  const market = mode === "market";
  const href = `/players/${p.id}`;

  return (
    <div className="border-b border-white/[0.06] px-4 py-3 group-last:border-b-0 large-text:py-4">
      <div className="flex min-h-11 items-center gap-3 large-text:items-start">
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] outline-offset-4 large-text:items-start">
          <Avatar p={p} free={free} className="size-11 large-text:size-14" />
          <span className="min-w-0 flex-1 large-text:pt-0.5">
            <span className="line-clamp-2 text-[length:min(1rem,25.5px)] font-medium leading-tight tracking-[-0.01em] large-text:line-clamp-none">
              {p.name}
            </span>
            <MetaLine p={p} free={free} showAge={!market} className="mt-1 large-text:mt-1.5" />
            {market && (
              <span className="mt-0.5 block text-[length:min(0.8235rem,21px)] font-medium tabular-nums text-foreground/90 large-text:hidden">
                {price}
              </span>
            )}
          </span>
          <Rating rating={rating} tier={tier} />
        </Link>
        {market && (
          <span className="large-text:hidden">
            <BuyButton free={free} name={p.name} disabled={!marketOpen} onBuy={onBuy} />
          </span>
        )}
      </div>
      {/* Con letra grande el precio y el botón van en su propia línea. */}
      {market && (
        <div className="mt-3 hidden items-center justify-between gap-3 pl-[68px] large-text:flex">
          <span className="text-[length:min(1.0588rem,27px)] font-semibold tabular-nums">{price}</span>
          <BuyButton free={free} name={p.name} disabled={!marketOpen} onBuy={onBuy} wide />
        </div>
      )}
    </div>
  );
}
