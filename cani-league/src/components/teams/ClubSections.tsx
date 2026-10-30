"use client";

import { useState } from "react";
import Link from "next/link";
import { PixelAvatar } from "@/components/fantasy/PixelAvatar";
import { PlayerActions } from "@/components/players/PlayerActions";
import { TeamFormation } from "@/components/teams/TeamFormation";
import { getPlayerEffectiveRating, getPositionGroup } from "@/lib/players";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types";

const LINES = [
  { key: "gk", label: "Porteros" },
  { key: "def", label: "Defensas" },
  { key: "mid", label: "Centrocampistas" },
  { key: "att", label: "Delanteros" },
] as const;

/** Plantilla en listas agrupadas por línea, con el avatar pixel art de cada jugador. */
function SquadList({ team, players, teams, goals }: { team: Team; players: Player[]; teams: Team[]; goals: Record<string, number> }) {
  return (
    <div className="space-y-6">
      {LINES.map(({ key, label }) => {
        const list = players
          .filter((p) => getPositionGroup(p.position) === key)
          .sort((a, b) => getPlayerEffectiveRating(b) - getPlayerEffectiveRating(a));
        if (!list.length) return null;
        return (
          <section key={key} aria-label={label}>
            <h3 className="mb-1.5 px-4 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
              {label} <span className="tabular-nums">{list.length}</span>
            </h3>
            <ul className="overflow-hidden rounded-[22px] bg-card">
              {list.map((p) => (
                <li key={p.id} className="group flex items-center gap-3 pl-4">
                  <Link href={`/players/${p.id}`} tabIndex={-1} aria-hidden className="shrink-0">
                    <span className="flex size-10 items-end justify-center overflow-hidden rounded-full bg-[#2c2c2e]">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photo_url} alt="" className="size-full object-cover" />
                      ) : (
                        <PixelAvatar seed={p.id} shirt={team.primary_color} trim={team.secondary_color} className="size-full translate-y-[12%] scale-110" />
                      )}
                    </span>
                  </Link>
                  {/* El separador va desde el texto hasta el borde, incluidas las acciones. */}
                  <div className="flex min-h-[60px] min-w-0 flex-1 items-center self-stretch border-b border-border pr-1 group-last:border-b-0">
                    <Link href={`/players/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[length:min(1rem,25.5px)] leading-tight">{p.name}</span>
                        <span className="block text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                          {p.position}
                          {p.age ? ` · ${p.age} años` : ""}
                          {goals[p.id] ? ` · ${goals[p.id]} ${goals[p.id] === 1 ? "gol" : "goles"}` : ""}
                          {p.available_in_market ? " · En venta" : ""}
                        </span>
                      </span>
                      <span className="text-[length:min(1.1765rem,30px)] font-bold tabular-nums">{getPlayerEffectiveRating(p) || "–"}</span>
                    </Link>
                    <PlayerActions
                      playerId={p.id}
                      availableInMarket={p.available_in_market}
                      teams={teams}
                      currentTeamId={p.team_id}
                      player={p}
                      variant="icon"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Formación y plantilla del club, separadas con un control segmentado. */
export function ClubSections({
  team,
  players,
  teams,
  goals = {},
}: {
  team: Team;
  players: Player[];
  teams: Team[];
  /** Goles de cada jugador esta temporada. */
  goals?: Record<string, number>;
}) {
  const [view, setView] = useState<"formation" | "squad">("formation");
  return (
    <div>
      <div role="tablist" aria-label="Vista del club" className="mb-5 flex h-9 w-full max-w-sm rounded-[9px] bg-input p-[2px]">
        {[
          { key: "formation", label: "Formación" },
          { key: "squad", label: `Plantilla · ${players.length}` },
        ].map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(t.key as typeof view)}
              className={cn(
                "flex-1 rounded-[7px] text-[length:min(0.7647rem,19.5px)] font-semibold transition-colors",
                active ? "bg-[#636366] text-white" : "text-[#ebebf5]/60",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {players.length === 0 ? (
        <p className="rounded-[22px] bg-card px-4 py-10 text-center text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
          Este club aún no tiene jugadores.
        </p>
      ) : view === "formation" ? (
        <TeamFormation team={team} players={players} teamId={team.id} />
      ) : (
        <SquadList team={team} players={players} teams={teams} goals={goals} />
      )}
    </div>
  );
}
