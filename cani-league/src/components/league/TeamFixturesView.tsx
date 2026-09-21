"use client";

import { useState } from "react";
import { Filter, Calendar, CheckCircle2, Clock, Layers } from "lucide-react";
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
  const [roundFilter, setRoundFilter] = useState<"all" | 1 | 2>("all");

  const filteredMatches = matches.filter((m) => {
    const matchesTeam =
      selectedTeamId === "all" ||
      m.home_team_id === selectedTeamId ||
      m.away_team_id === selectedTeamId;

    if (!matchesTeam) return false;

    if (roundFilter !== "all" && m.round !== roundFilter) return false;

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
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Filtrar por Club
          </p>
          {selectedTeamId !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedTeamId("all")}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Mostrar todos
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSelectedTeamId("all")}
            className={cn(
              "flex min-h-[36px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
              selectedTeamId === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="size-3.5" />
            <span>Todos ({teams.length})</span>
          </button>

          {teams.map((t) => {
            const isSelected = selectedTeamId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTeamId(isSelected ? "all" : t.id)}
                className={cn(
                  "flex min-h-[36px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                    : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
                )}
              >
                <TeamLogo
                  name={t.name}
                  logoUrl={t.logo_url}
                  color={t.primary_color}
                  size="sm"
                />
                <span className="truncate max-w-[120px] sm:max-w-none">{t.short_name || t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FILTROS COMBINADOS: ESTADO (PENDIENTE / JUGADO) + FASE (IDA / VUELTA) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-card/40 p-2.5 backdrop-blur-sm">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterState("pending")}
            className={cn(
              "flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all",
              filterState === "pending"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            )}
          >
            <Clock className="size-3.5" />
            <span>Pendientes ({totalPending})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterState("played")}
            className={cn(
              "flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all",
              filterState === "played"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            )}
          >
            <CheckCircle2 className="size-3.5" />
            <span>Jugados ({totalPlayed})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterState("all")}
            className={cn(
              "flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all",
              filterState === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            )}
          >
            <Calendar className="size-3.5" />
            <span>Todos ({matches.length})</span>
          </button>
        </div>

        {/* Round Pills (Ida / Vuelta) */}
        <div className="flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-white/[0.08] pt-2 sm:pt-0 sm:pl-3 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mr-1 flex items-center gap-1">
            <Layers className="size-3" /> Fase:
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRoundFilter("all")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                roundFilter === "all"
                  ? "bg-white/[0.1] text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setRoundFilter(1)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                roundFilter === 1
                  ? "bg-white/[0.1] text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Ida
            </button>
            <button
              type="button"
              onClick={() => setRoundFilter(2)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                roundFilter === 2
                  ? "bg-white/[0.1] text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Vuelta
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de partidos coincidentes */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Mostrando <strong className="text-foreground">{filteredMatches.length}</strong> de{" "}
          <strong className="text-foreground">{matches.length}</strong> partidos totales
        </span>
      </div>

      {/* 3. GRID DE PARTIDOS VISUALES */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-card/20 py-14 text-center">
          <p className="font-display text-base font-bold text-foreground">
            No hay partidos con estos filtros
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Prueba a seleccionar otro equipo, cambiar el estado entre pendientes/jugados o seleccionar otra fase.
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
