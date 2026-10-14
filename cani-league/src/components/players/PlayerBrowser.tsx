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
              "flex-1 rounded-[7px] text-[13px] font-semibold transition-colors",
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
export function PlayerBrowser({ players, teams, mode }: { players: Row[]; teams: Team[]; mode: "players" | "market" }) {
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
          className="h-11 w-full rounded-[10px] bg-input pl-10 pr-10 text-[17px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-search-cancel-button]:hidden"
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
                  "relative h-8 rounded-full px-3.5 text-[15px] font-semibold after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
                  origin === k ? "bg-white text-black" : "bg-card text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-muted-foreground tabular-nums">{list.length} jugadores</p>
        )}
        <label className="flex items-center gap-1.5 text-[15px] text-muted-foreground">
          <span className={mode === "market" ? "sr-only" : undefined}>Ordenar por</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-8 rounded-full bg-card px-3 text-[15px] font-semibold text-foreground outline-none"
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
          <p className="text-[17px] font-semibold">Sin resultados</p>
          <p className="mt-1 text-[15px] text-muted-foreground">Prueba con otro nombre o quita los filtros.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[22px] bg-card">
          {shown.map((p) => {
            const free = isFree(p);
            const rating = getPlayerEffectiveRating(p);
            const tier = getPlayerTier(p);
            return (
              <li key={p.id} className="group flex items-center gap-3 pl-4">
                <Link href={`/players/${p.id}`} tabIndex={-1} aria-hidden className="shrink-0">
                  <span className="flex size-10 items-end justify-center overflow-hidden rounded-full bg-[#2c2c2e]">
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
                </Link>
                <div className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border pr-3 group-last:border-b-0">
                  <Link href={`/players/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] leading-tight">{p.name}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        {p.position} · {free ? "Agente libre" : p.team?.name}
                        {mode === "players" && p.age ? ` · ${p.age} años` : ""}
                      </span>
                    </span>
                    <span className="flex flex-col items-end leading-none">
                      <span className="text-[20px] font-bold tabular-nums">{rating || "–"}</span>
                      <span className="mt-1 text-[12px] font-semibold tabular-nums text-muted-foreground">
                        {mode === "market" ? compactMoney(getPlayerFixedPrice(p)) : tier.tier}
                      </span>
                    </span>
                  </Link>
                  {mode === "market" && (
                    <button
                      type="button"
                      onClick={() => setBuying(p)}
                      aria-label={free ? `Fichar a ${p.name}` : `Pagar la cláusula de ${p.name}`}
                      className={cn(
                        "relative h-8 shrink-0 rounded-full px-3.5 text-[15px] font-semibold active:opacity-70 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
                        free ? "bg-white text-black" : "bg-secondary text-foreground",
                      )}
                    >
                      {free ? "Fichar" : "Cláusula"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {list.length > shown.length && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="h-11 w-full rounded-full bg-card text-[17px] font-semibold text-[#0a84ff] active:opacity-70"
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
