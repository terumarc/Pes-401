"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PixelAvatar } from "@/components/fantasy/PixelAvatar";
import { ChipScroller, lineTone } from "@/components/fantasy/primitives";
import { getPlayerEffectiveRating, getPositionGroup } from "@/lib/players";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types";

/** Jugadores por línea (sin contar al portero), de defensa a ataque. */
const FORMATIONS = {
  "4-3-3": [4, 3, 3],
  "4-4-2": [4, 4, 2],
  "4-2-3-1": [4, 2, 3, 1],
  "3-5-2": [3, 5, 2],
  "5-3-2": [5, 3, 2],
} as const;
type FormationKey = keyof typeof FORMATIONS;

/** Qué grupo de posiciones alimenta cada línea según la formación. */
function lineGroups(f: FormationKey): ("def" | "mid" | "att")[] {
  if (f === "4-2-3-1") return ["def", "mid", "mid", "att"];
  return ["def", "mid", "att"];
}

type Slot = { player: Player | null; group: "gk" | "def" | "mid" | "att" };

function buildLineup(players: Player[], f: FormationKey) {
  const pools: Record<string, Player[]> = { gk: [], def: [], mid: [], att: [] };
  for (const p of players) {
    const g = getPositionGroup(p.position);
    if (g !== "all") pools[g].push(p);
  }
  for (const k of Object.keys(pools)) {
    pools[k].sort((a, b) => getPlayerEffectiveRating(b) - getPlayerEffectiveRating(a));
  }
  const take = (g: string) => pools[g].shift() ?? null;

  const gk: Slot[] = [{ player: take("gk"), group: "gk" }];
  const groups = lineGroups(f);
  const lines: Slot[][] = FORMATIONS[f].map((n, i) =>
    Array.from({ length: n }, () => ({ player: take(groups[i]), group: groups[i] })),
  );
  const starters = new Set([gk, ...lines].flat().map((s) => s.player?.id).filter(Boolean));
  const bench = players
    .filter((p) => !starters.has(p.id))
    .sort((a, b) => getPlayerEffectiveRating(b) - getPlayerEffectiveRating(a));
  // De ataque (arriba) a portero (abajo), como se ve en las apps de fantasy.
  return { rows: [...lines].reverse().concat([gk]), bench };
}

function lastName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 && parts[0].length <= 2 ? parts.slice(1).join(" ") : parts[parts.length - 1];
}

function PlayerToken({ player, team }: { player: Player; team: Pick<Team, "primary_color" | "secondary_color"> }) {
  const rating = getPlayerEffectiveRating(player);
  const tone = lineTone(player.position);
  return (
    <Link
      href={`/players/${player.id}`}
      className="group flex w-[4.5rem] flex-col items-center outline-none active:scale-95 focus-visible:[&>span:first-child]:ring-2 focus-visible:[&>span:first-child]:ring-white"
      aria-label={`${player.name}, ${player.position}, media ${rating}`}
    >
      <span className="relative">
        <span className="flex size-12 items-end justify-center overflow-hidden rounded-full bg-white/90 shadow-[0_4px_10px_rgba(0,0,0,0.35)] ring-2 ring-white/90">
          {player.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo_url} alt="" className="size-full object-cover" />
          ) : (
            <PixelAvatar
              seed={player.id}
              shirt={team.primary_color}
              trim={team.secondary_color}
              className="size-full translate-y-[12%] scale-110"
            />
          )}
        </span>
        <span className="absolute -right-1.5 -top-1 rounded-md bg-background px-1 text-[11px] font-bold tabular-nums text-foreground shadow ring-1 ring-border">
          {rating || "–"}
        </span>
      </span>
      <span className="mt-1 w-full overflow-hidden rounded-md bg-background/90 text-center shadow ring-1 ring-black/20">
        <span className="block truncate px-1 pt-0.5 text-[11px] font-semibold leading-tight">{lastName(player.name)}</span>
        <span className={cn("block text-[9px] font-bold leading-[14px]", tone.chip)}>{player.position}</span>
      </span>
    </Link>
  );
}

function EmptyToken({ group }: { group: Slot["group"] }) {
  const label = { gk: "POR", def: "DEF", mid: "MED", att: "DEL" }[group];
  return (
    <span className="flex w-[4.5rem] flex-col items-center" aria-label={`Hueco libre de ${label}`}>
      <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-white/50 bg-white/10 text-white/80">
        <Plus className="size-5" aria-hidden />
      </span>
      <span className="mt-1 rounded-md bg-black/25 px-2 text-[10px] font-semibold leading-5 text-white/80">{label}</span>
    </span>
  );
}

/** Campo con la formación del equipo: el mejor once por línea y el banquillo. */
export function TeamFormation({
  team,
  players,
}: {
  team: Pick<Team, "primary_color" | "secondary_color">;
  players: Player[];
}) {
  const [formation, setFormation] = useState<FormationKey>("4-3-3");
  const { rows, bench } = useMemo(() => buildLineup(players, formation), [players, formation]);
  const filled = rows.flat().filter((s) => s.player).length;

  return (
    <section aria-label="Formación" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Formación</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {filled} de 11 titulares · el mejor de cada línea por media
          </p>
        </div>
      </div>

      <ChipScroller
        ariaLabel="Elegir formación"
        value={formation}
        onChange={setFormation}
        options={(Object.keys(FORMATIONS) as FormationKey[]).map((f) => ({ value: f, label: f }))}
      />

      {/* Campo */}
      <div
        className="relative overflow-hidden rounded-2xl ring-1 ring-black/30"
        style={{
          background:
            "repeating-linear-gradient(180deg,#2f8f4e 0 12.5%,#2a8547 12.5% 25%)",
        }}
      >
        {/* líneas del campo */}
        <svg aria-hidden viewBox="0 0 100 140" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
          <g fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" vectorEffect="non-scaling-stroke">
            <rect x="4" y="3" width="92" height="134" />
            <line x1="4" y1="70" x2="96" y2="70" />
            <circle cx="50" cy="70" r="11" />
            <rect x="24" y="3" width="52" height="20" />
            <rect x="37" y="3" width="26" height="7" />
            <rect x="24" y="117" width="52" height="20" />
            <rect x="37" y="130" width="26" height="7" />
          </g>
        </svg>

        <div className="relative flex min-h-[30rem] flex-col justify-around gap-2 px-1 py-4 sm:min-h-[34rem]">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-evenly">
              {row.map((slot, j) =>
                slot.player ? (
                  <PlayerToken key={slot.player.id} player={slot.player} team={team} />
                ) : (
                  <EmptyToken key={`e-${i}-${j}`} group={slot.group} />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Banquillo */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Banquillo <span className="tabular-nums">({bench.length})</span>
        </p>
        {bench.length ? (
          <div className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {bench.map((p) => (
              <div key={p.id} className="shrink-0 [&_a>span:last-child]:bg-muted">
                <PlayerToken player={p} team={team} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin suplentes: ficha jugadores en el mercado.</p>
        )}
      </div>
    </section>
  );
}
