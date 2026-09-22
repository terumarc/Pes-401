"use client";

import { useState, useMemo } from "react";
import {
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  LayoutGrid,
  List,
  Flame,
  X,
} from "lucide-react";
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
  const [matchdayFilter, setMatchdayFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  // Jornadas únicas disponibles
  const matchdays = useMemo(() => {
    return Array.from(new Set(matches.map((m) => m.matchday))).sort((a, b) => a - b);
  }, [matches]);

  // Mapa de partidos de ida/vuelta invertidos para pasar a MatchRow en O(N)
  const reverseMatchMap = useMemo(() => {
    const round1Lookup = new Map<string, MatchWithTeams>();
    for (const m of matches) {
      if (m.round === 1) {
        round1Lookup.set(`${m.home_team_id}_${m.away_team_id}`, m);
      }
    }

    const map = new Map<string, MatchWithTeams>();
    for (const m of matches) {
      if (m.round === 2) {
        const idaMatch = round1Lookup.get(`${m.away_team_id}_${m.home_team_id}`);
        if (idaMatch) map.set(m.id, idaMatch);
      }
    }
    return map;
  }, [matches]);

  // Filtrado compuesto
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // 1. Filtro de Club seleccionado
      const matchesTeam =
        selectedTeamId === "all" ||
        m.home_team_id === selectedTeamId ||
        m.away_team_id === selectedTeamId;
      if (!matchesTeam) return false;

      // 2. Filtro de Fase (Ida / Vuelta)
      if (roundFilter !== "all" && m.round !== roundFilter) return false;

      // 3. Filtro de Jornada específica
      if (matchdayFilter !== "all" && m.matchday !== matchdayFilter) return false;

      // 4. Filtro de Estado (Pendiente / Jugado)
      if (filterState === "pending" && m.played) return false;
      if (filterState === "played" && !m.played) return false;

      // 5. Buscador por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const homeName = m.home_team.name.toLowerCase();
        const homeShort = (m.home_team.short_name || "").toLowerCase();
        const awayName = m.away_team.name.toLowerCase();
        const awayShort = (m.away_team.short_name || "").toLowerCase();
        const matchdayStr = `jornada ${m.matchday}`;
        const jStr = `j.${m.matchday}`;

        const matchesQuery =
          homeName.includes(q) ||
          homeShort.includes(q) ||
          awayName.includes(q) ||
          awayShort.includes(q) ||
          matchdayStr.includes(q) ||
          jStr.includes(q);

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [matches, selectedTeamId, roundFilter, matchdayFilter, filterState, searchQuery]);

  const totalPending = matches.filter((m) => !m.played).length;
  const totalPlayed = matches.filter((m) => m.played).length;

  const currentFilteredPlayed = filteredMatches.filter((m) => m.played);
  const currentFilteredGoals = currentFilteredPlayed.reduce(
    (sum, m) => sum + (m.home_goals ?? 0) + (m.away_goals ?? 0),
    0,
  );
  const currentAvgGoals =
    currentFilteredPlayed.length > 0
      ? (currentFilteredGoals / currentFilteredPlayed.length).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-5">
      {/* 1. SELECTOR VISUAL DE EQUIPOS POR CHIPS CON ESCUDO */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <Filter className="size-3.5 text-primary" /> Filtrar por Club
          </p>
          {selectedTeamId !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedTeamId("all")}
              className="text-xs text-primary hover:underline font-bold"
            >
              Mostrar todos los clubes
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSelectedTeamId("all")}
            className={cn(
              "flex min-h-[38px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
              selectedTeamId === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/25"
                : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground",
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
                  "flex min-h-[38px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 font-bold"
                    : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground",
                )}
              >
                <TeamLogo
                  name={t.name}
                  logoUrl={t.logo_url}
                  color={t.primary_color}
                  size="sm"
                />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {t.short_name || t.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS: BÚSQUEDA, ESTADO, FASE Y MODO DE VISTA */}
      <div className="space-y-2.5 rounded-2xl border border-white/[0.08] bg-card/50 p-3 sm:p-4 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterState("pending")}
              className={cn(
                "flex min-h-[34px] items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all",
                filterState === "pending"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              <Clock className="size-3.5" />
              <span>Pendientes ({totalPending})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterState("played")}
              className={cn(
                "flex min-h-[34px] items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all",
                filterState === "played"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              <CheckCircle2 className="size-3.5" />
              <span>Jugados ({totalPlayed})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterState("all")}
              className={cn(
                "flex min-h-[34px] items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all",
                filterState === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              <Calendar className="size-3.5" />
              <span>Todos ({matches.length})</span>
            </button>
          </div>

          {/* Buscador de partidos + Selector de vista */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar partido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Vista Grid vs Compact */}
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Vista Tarjetas Esports"
                aria-label="Vista Tarjetas Esports"
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-all",
                  viewMode === "grid"
                    ? "bg-white/[0.1] text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                title="Vista Lista Rápida"
                aria-label="Vista Lista Rápida"
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-all",
                  viewMode === "compact"
                    ? "bg-white/[0.1] text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros secundarios: Fase (Ida / Vuelta) y Jornada específica */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2 text-xs">
          {/* Fase */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mr-1 flex items-center gap-1">
              <Layers className="size-3 text-primary" /> Fase:
            </span>
            <button
              type="button"
              onClick={() => setRoundFilter("all")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                roundFilter === "all"
                  ? "bg-white/[0.1] text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setRoundFilter(1)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                roundFilter === 1
                  ? "bg-white/[0.1] text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Ida
            </button>
            <button
              type="button"
              onClick={() => setRoundFilter(2)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                roundFilter === 2
                  ? "bg-white/[0.1] text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Vuelta
            </button>
          </div>

          {/* Selector de Jornada */}
          {matchdays.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                Jornada:
              </span>
              <select
                value={matchdayFilter}
                onChange={(e) =>
                  setMatchdayFilter(
                    e.target.value === "all" ? "all" : parseInt(e.target.value, 10),
                  )
                }
                className="rounded-lg border border-white/[0.1] bg-black/40 px-2 py-1 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="all">Todas las jornadas ({matchdays.length})</option>
                {matchdays.map((m) => (
                  <option key={`opt-j-${m}`} value={m}>
                    Jornada {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Indicador y métricas del subconjunto actual */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>
          Mostrando <strong className="text-foreground">{filteredMatches.length}</strong> de{" "}
          <strong className="text-foreground">{matches.length}</strong> partidos
        </span>

        {currentFilteredPlayed.length > 0 && (
          <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
            <Flame className="size-3.5 text-rose-400" />
            <span>
              {currentFilteredGoals} goles en disputados (promedio {currentAvgGoals} / partido)
            </span>
          </span>
        )}
      </div>

      {/* 3. GRID O LISTA DE PARTIDOS CON ESTÉTICA ESPORTS */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-card/20 py-14 text-center">
          <p className="font-display text-base font-bold text-foreground">
            No hay partidos con estos filtros
          </p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Prueba a limpiar la búsqueda, seleccionar otro club o alternar entre partidos pendientes y finalizados.
          </p>
        </div>
      ) : viewMode === "compact" ? (
        <div className="space-y-2">
          {filteredMatches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              reverseMatch={reverseMatchMap.get(match.id)}
              compact={true}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              reverseMatch={reverseMatchMap.get(match.id)}
              compact={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
