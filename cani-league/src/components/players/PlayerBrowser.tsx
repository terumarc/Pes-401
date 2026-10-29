"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { PixelAvatar } from "@/components/fantasy/PixelAvatar";
import { TransferModal } from "@/components/market/TransferModal";
import { formatMoney } from "@/lib/format/money";
import { getPlayerEffectiveRating, getPlayerFixedPrice, getPlayerTier, getPositionGroup } from "@/lib/players";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types";

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

const PAGE = 40;

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
  players,
  teams,
  mode,
  marketOpen = true,
}: {
  players: Row[];
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
  const [limit, setLimit] = useState(PAGE);
  const [buying, setBuying] = useState<Row | null>(null);
  const q = useDeferredValue(query.trim().toLowerCase());

  const list = useMemo(() => {
    const out = players.filter((p) => {
      if (group !== "all" && getPositionGroup(p.position) !== group) return false;
      if (tier !== "all" && getPlayerTier(p).tier !== tier) return false;
      if (origin === "free" && !isFree(p)) return false;
      if (origin === "club" && isFree(p)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.team?.name ?? "").toLowerCase().includes(q) ||
        (p.nationality ?? "").toLowerCase().includes(q) ||
        p.position.toLowerCase() === q
      );
    });
    out.sort((a, b) => {
      if (sort === "price") return getPlayerFixedPrice(b) - getPlayerFixedPrice(a);
      if (sort === "name") return a.name.localeCompare(b.name, "es");
      if (sort === "age") return (a.age ?? 99) - (b.age ?? 99);
      return getPlayerEffectiveRating(b) - getPlayerEffectiveRating(a);
    });
    return out;
  }, [players, group, tier, origin, sort, q]);

  const shown = list.slice(0, limit);

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
            setLimit(PAGE);
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

      <Segmented label="Línea" value={group} onChange={(v) => { setGroup(v); setLimit(PAGE); }} options={GROUPS} />
      <Segmented label="Nivel" value={tier} onChange={(v) => { setTier(v); setLimit(PAGE); }} options={TIER_FILTERS} />

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
                onClick={() => { setOrigin(k); setLimit(PAGE); }}
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
          <p className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground tabular-nums">{list.length} jugadores</p>
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

      {shown.length === 0 ? (
        <div className="rounded-[22px] bg-card px-6 py-10 text-center">
          <p className="text-[length:min(1rem,25.5px)] font-semibold">Sin resultados</p>
          <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">Prueba con otro nombre o quita los filtros.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[22px] bg-card">
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

      {list.length > shown.length && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="h-11 w-full rounded-full bg-card text-[length:min(1rem,25.5px)] font-semibold text-[#0a84ff] active:opacity-70"
        >
          Mostrar más ({list.length - shown.length})
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

function Avatar({ p, free, size }: { p: Row; free: boolean; size: number }) {
  return (
    <span
      className="flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#2a2a2d] ring-1 ring-white/[0.08]"
      style={{ width: size, height: size }}
    >
      {p.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photo_url} alt="" className="size-full object-cover" />
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
function Rating({ rating, tier, big }: { rating: number; tier: string; big?: boolean }) {
  const tint = TIER_TINT[tier] ?? TIER_TINT.D;
  return (
    <span
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-[12px] bg-white/[0.05] leading-none tabular-nums ring-1 ring-inset",
        big ? "h-[58px] w-[54px]" : "h-11 w-11",
      )}
      style={{ ["--tw-ring-color" as string]: `${tint}33` }}
      aria-label={`Media ${rating || "sin datos"}, nivel ${tier}`}
    >
      <span className={cn("font-semibold tracking-tight text-foreground", big ? "text-[24px]" : "text-[18px]")}>{rating || "–"}</span>
      <span className={cn("mt-1 font-medium tracking-wide", big ? "text-[13px]" : "text-[12px]")} style={{ color: tint }}>
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
    <div className="border-b border-white/[0.06] group-last:border-b-0">
      {/* Letra normal */}
      <div className="flex min-h-[68px] items-center gap-3 px-4 py-3 large-text:hidden">
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] outline-offset-4">
          <Avatar p={p} free={free} size={44} />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[length:min(1rem,25.5px)] font-medium leading-tight tracking-[-0.01em]">{p.name}</span>
            <MetaLine p={p} free={free} showAge={!market} className="mt-1" />
            {market && (
              <span className="mt-0.5 block text-[length:min(0.8235rem,21px)] font-medium tabular-nums text-foreground/90">{price}</span>
            )}
          </span>
          <Rating rating={rating} tier={tier} />
        </Link>
        {market && <BuyButton free={free} name={p.name} disabled={!marketOpen} onBuy={onBuy} />}
      </div>

      {/* Letra grande */}
      <div className="hidden px-4 py-4 large-text:block">
        <Link href={href} className="flex items-start gap-3 rounded-[14px] outline-offset-4">
          <Avatar p={p} free={free} size={56} />
          <span className="min-w-0 flex-1 pt-0.5">
            <span className="block text-[length:min(1rem,25.5px)] font-medium leading-tight tracking-[-0.01em]">{p.name}</span>
            <MetaLine p={p} free={free} showAge className="mt-1.5" />
          </span>
          <Rating rating={rating} tier={tier} big />
        </Link>
        {market && (
          <div className="mt-3 flex items-center justify-between gap-3 pl-[68px]">
            <span className="text-[length:min(1.0588rem,27px)] font-semibold tabular-nums">{price}</span>
            <BuyButton free={free} name={p.name} disabled={!marketOpen} onBuy={onBuy} wide />
          </div>
        )}
      </div>
    </div>
  );
}
