"use client";

import { useState } from "react";
import { Filter, Calendar, CheckCircle2, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MatchRow } from "@/components/league/MatchRow";
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
    <div className="space-y-4">
      {/* Controles de filtro */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar por equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: t.primary_color }}
                    />
                    <span>{t.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterState("pending")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterState === "pending"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-3.5" />
            Pendientes ({totalPending})
          </button>
          <button
            type="button"
            onClick={() => setFilterState("played")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterState === "played"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            Jugados ({totalPlayed})
          </button>
          <button
            type="button"
            onClick={() => setFilterState("all")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterState === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="size-3.5" />
            Todos ({matches.length})
          </button>
        </div>
      </div>

      {/* Grid de partidos */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          No hay partidos que coincidan con el filtro seleccionado.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((match) => (
            <div key={match.id} className="relative">
              <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                <span>Jornada {match.matchday}</span>
                <span>{match.round === 2 ? "Vuelta" : "Ida"}</span>
              </div>
              <MatchRow match={match} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
