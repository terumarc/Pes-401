"use client";

import { useState } from "react";
import { Filter, Calendar, CheckCircle2, Clock } from "lucide-react";
import { TeamLogo } from "@/components/teams/TeamCard";
import { MatchRow } from "@/components/league/MatchRow";
import { cn } from "@/lib/utils";
import type { MatchWithTeams, Team } from "@/types";

type TeamFixturesViewProps = {
  teams: Team[];
  matches: MatchWithTeams[];
};

export function TeamFixturesView({ teams, matches }: TeamFixturesViewProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [filterState, setFilterState] = useState<"all" | "pending" | "played">("pending");

  const filteredMatches = matches.filter((m) => {
    const matchesTeam =
      selectedTeamId === "all" ||
      m.home_team_id === selectedTeamId ||
      m.away_team_id === selectedTeamId;

    if (!matchesTeam) return false;

    if (filterState === "pending") return !m.played;
    if (filterState === "played") return m.played;
    return true;
  });

  const totalPending = matches.filter((m) => !m.played).length;
  const totalPlayed = matches.filter((m) => m.played).length;

  return (
    <div className="space-y-5">
      {/* 1. SELECTOR VISUAL DE EQUIPOS POR CHIPS CON ESCUDO */}
      <div className="space-y-2">
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Filtrar por Equipo
        </p>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSelectedTeamId("all")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
              selectedTeamId === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <Filter className="size-3.5" />
            Todos los Equipos
          </button>

          {teams.map((t) => {
            const isSelected = selectedTeamId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTeamId(isSelected ? "all" : t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                    : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <TeamLogo
                  name={t.name}
                  logoUrl={t.logo_url}
                  color={t.primary_color}
                  size="sm"
                />
                <span>{t.short_name || t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FILTROS DE ESTADO (PENDIENTES / JUGADOS / TODOS) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border/50 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterState("pending")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              filterState === "pending"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <Clock className="size-3.5" />
            Pendientes ({totalPending})
          </button>
          <button
            type="button"
            onClick={() => setFilterState("played")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              filterState === "played"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <CheckCircle2 className="size-3.5" />
            Jugados ({totalPlayed})
          </button>
          <button
            type="button"
            onClick={() => setFilterState("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              filterState === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <Calendar className="size-3.5" />
            Todos ({matches.length})
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Mostrando <span className="font-bold text-foreground">{filteredMatches.length}</span> partido(s)
        </p>
      </div>

      {/* 3. GRID DE PARTIDOS VISUALES */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-14 text-center">
          <p className="font-display text-base font-bold text-foreground">
            No hay partidos con este filtro
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prueba a seleccionar otro equipo o cambiar el estado de filtro.
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
