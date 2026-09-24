"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  RotateCcw,
  Shield,
  User,
  Users,
  Wallet,
  Coins,
  Star,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { TeamCard, TeamLogo } from "@/components/teams/TeamCard";
import { EditTeamButton } from "@/components/teams/EditTeamButton";
import { padPosition } from "@/lib/format/stats";
import { cn } from "@/lib/utils";
import type { TeamWithStanding } from "@/types";

type SortOption =
  | "position_asc"
  | "budget_desc"
  | "budget_asc"
  | "squad_desc"
  | "overall_desc"
  | "players_desc"
  | "name_asc";

type TeamDirectoryProps = {
  teams: TeamWithStanding[];
};

export function TeamDirectory({ teams }: TeamDirectoryProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("position_asc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filtrado y ordenación reactiva
  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = teams.filter((t) => {
      if (!q) return true;
      const matchName = t.name.toLowerCase().includes(q);
      const matchShort = t.short_name.toLowerCase().includes(q);
      const matchOwner = t.owner_name?.toLowerCase().includes(q) ?? false;
      return matchName || matchShort || matchOwner;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "position_asc":
          return a.position - b.position;
        case "budget_desc":
          return (b.budget || 0) - (a.budget || 0);
        case "budget_asc":
          return (a.budget || 0) - (b.budget || 0);
        case "squad_desc":
          return (b.squad_value || 0) - (a.squad_value || 0);
        case "overall_desc":
          return (b.avg_overall || 0) - (a.avg_overall || 0);
        case "players_desc":
          return (b.player_count || 0) - (a.player_count || 0);
        case "name_asc":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [teams, search, sortBy]);

  const hasActiveFilters = Boolean(search.trim());

  return (
    <div className="space-y-6">
      {/* BARRA DE HERRAMIENTAS / FILTROS CON ACABADO STRIPE */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-card/60 p-3.5 backdrop-blur-md shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* BUSCADOR */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por club, sigla o propietario…"
            className="pl-9 pr-9 h-10 border-white/[0.08] bg-white/[0.03] text-sm focus-visible:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* ORDENACIÓN Y MODO DE VISTA */}
        <div className="flex items-center gap-2">
          {/* SELECTOR DE ORDENACIÓN */}
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Ordenar equipos"
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-8 pr-7 text-xs font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            >
              <option value="position_asc">Clasificación (#1 a #N)</option>
              <option value="budget_desc">Mayor Presupuesto</option>
              <option value="budget_asc">Menor Presupuesto</option>
              <option value="squad_desc">Mayor Valor de Plantilla</option>
              <option value="overall_desc">Mejor Media OVR</option>
              <option value="players_desc">Más Jugadores</option>
              <option value="name_asc">Nombre (A - Z)</option>
            </select>
          </div>

          {/* ALTERNADOR DE VISTA GRID / TABLE */}
          <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Vista de cuadrícula"
              aria-label="Vista de cuadrícula"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Vista de tabla resumen"
              aria-label="Vista de tabla resumen"
            >
              <List className="size-4" />
            </button>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="h-10 gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-white/[0.08]"
              title="Restablecer filtros"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Restablecer</span>
            </Button>
          )}
        </div>
      </div>

      {/* CONTADOR DE RESULTADOS */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Mostrando <strong className="text-foreground">{filteredTeams.length}</strong> de{" "}
          <strong className="text-foreground">{teams.length}</strong> clubes
        </span>
        {hasActiveFilters && (
          <span className="text-[11px] text-primary font-semibold">
            Filtro activo: &ldquo;{search}&rdquo;
          </span>
        )}
      </div>

      {/* RESULTADOS O EMPTY STATE */}
      {filteredTeams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/[0.12] bg-card/30 p-12 text-center backdrop-blur-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/[0.08]">
            <Shield className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            No se encontraron clubes
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No hay ningún equipo que coincida con la búsqueda &ldquo;{search}&rdquo;.
          </p>
          <Button
            variant="outline"
            onClick={() => setSearch("")}
            className="mt-5 gap-1.5 font-display text-xs border-white/[0.1]"
          >
            <RotateCcw className="size-3.5" />
            Limpiar búsqueda
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* VISTA DE CUADRÍCULA */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        /* VISTA DE TABLA COMPARATIVA STRIPE */
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-3.5 text-center w-14">
                    Pos
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Club
                  </th>
                  <th scope="col" className="px-4 py-3.5 hidden md:table-cell">
                    Propietario
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center">
                    Media OVR
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center hidden sm:table-cell">
                    Jugadores
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Presupuesto
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right hidden lg:table-cell">
                    Valor Plantilla
                  </th>
                  <th scope="col" className="px-4 py-3.5 hidden xl:table-cell">
                    Estrella
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredTeams.map((team) => {
                  const rankDelta =
                    team.previous_position != null &&
                    team.previous_position !== team.position
                      ? team.previous_position - team.position
                      : null;

                  return (
                    <tr
                      key={team.id}
                      className="group transition-colors hover:bg-white/[0.04]"
                    >
                      {/* POSICIÓN */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={cn(
                              "font-display text-xs font-black tabular-nums rounded px-1.5 py-0.5",
                              team.position === 1
                                ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                                : team.position === 2
                                ? "bg-slate-300/20 text-slate-200 border border-slate-300/30"
                                : team.position === 3
                                ? "bg-amber-700/25 text-amber-200 border border-amber-700/40"
                                : "text-muted-foreground font-semibold"
                            )}
                          >
                            #{padPosition(team.position)}
                          </span>
                          {rankDelta !== null && (
                            <span
                              className={cn(
                                "text-[10px] font-bold tabular-nums",
                                rankDelta > 0 ? "text-emerald-400" : "text-rose-400"
                              )}
                              title={`Cambio: ${rankDelta > 0 ? `+${rankDelta}` : rankDelta}`}
                            >
                              {rankDelta > 0 ? "▲" : "▼"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CLUB */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/teams/${team.id}`}
                          className="flex items-center gap-3 group-hover:text-primary transition-colors outline-none focus-visible:underline"
                        >
                          <TeamLogo
                            name={team.name}
                            logoUrl={team.logo_url}
                            color={team.primary_color}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="font-display font-bold uppercase text-foreground group-hover:text-primary transition-colors truncate block">
                              {team.name}
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                              {team.short_name}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* PROPIETARIO */}
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        <span className="flex items-center gap-1.5 truncate">
                          <User className="size-3 text-muted-foreground/60 shrink-0" />
                          <span className="truncate">{team.owner_name?.trim() || "Sin asignar"}</span>
                        </span>
                      </td>

                      {/* MEDIA OVR */}
                      <td className="px-4 py-3 text-center">
                        {team.avg_overall ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-display text-xs font-black tabular-nums",
                              team.avg_overall >= 80
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : team.avg_overall >= 75
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                : "bg-white/[0.04] text-foreground border-white/[0.08]"
                            )}
                          >
                            ★ {team.avg_overall}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* JUGADORES */}
                      <td className="px-4 py-3 text-center text-xs font-semibold tabular-nums text-foreground hidden sm:table-cell">
                        {team.player_count ?? 0}
                      </td>

                      {/* PRESUPUESTO */}
                      <td className="px-4 py-3 text-right font-display text-xs font-bold tabular-nums">
                        <BudgetDisplay amount={team.budget} size="sm" />
                      </td>

                      {/* VALOR PLANTILLA */}
                      <td className="px-4 py-3 text-right font-display text-xs font-bold tabular-nums text-foreground hidden lg:table-cell">
                        {team.squad_value ? (
                          <BudgetDisplay amount={team.squad_value} size="sm" />
                        ) : (
                          <span className="text-muted-foreground font-normal">0M €</span>
                        )}
                      </td>

                      {/* ESTRELLA */}
                      <td className="px-4 py-3 text-xs hidden xl:table-cell">
                        {team.top_player ? (
                          <span className="flex items-center gap-1.5 truncate text-foreground font-semibold">
                            <Star className="size-3 text-amber-400 shrink-0" />
                            <span className="truncate">{team.top_player.name}</span>
                            <span className="text-amber-400 font-bold tabular-nums text-[11px]">
                              ({team.top_player.overall})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* ACCIÓN */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <EditTeamButton
                            team={team}
                            variant="icon"
                            className="size-8 rounded-lg"
                          />
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                          >
                            <Link href={`/teams/${team.id}`}>
                              <span>Plantilla</span>
                              <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
