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
  Store,
  Shield,
  UserPlus,
  Users,
  Star,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { PlayerActions } from "@/components/players/PlayerActions";
import { PlayerAvatar } from "@/components/players/PlayerCard";
import {
  getPlayerEffectiveRating,
  getPlayerTier,
  getPlayerContractInfo,
  getPlayerFixedPrice,
} from "@/lib/players";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types";

export type PositionTab = "all" | "gk" | "def" | "mid" | "att" | "market";

type SortOption =
  | "overall_desc"
  | "overall_asc"
  | "value_desc"
  | "value_asc"
  | "name_asc"
  | "age_asc"
  | "renewal_desc";

type TeamSquadViewProps = {
  team: Team;
  players: Player[];
  teams: Team[];
};

export function getPositionGroup(pos: string): "gk" | "def" | "mid" | "att" {
  const p = (pos || "").toUpperCase();
  if (p === "GK") return "gk";
  if (["CB", "LB", "RB", "SW", "LWB", "RWB"].includes(p)) return "def";
  if (["DMF", "CMF", "AMF", "LMF", "RMF", "SMF"].includes(p)) return "mid";
  return "att";
}

export function getPositionBadge(pos: string): { label: string; color: string } {
  const group = getPositionGroup(pos);
  switch (group) {
    case "gk":
      return {
        label: "Portero",
        color: "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30",
      };
    case "def":
      return {
        label: "Defensa",
        color: "bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/30",
      };
    case "mid":
      return {
        label: "Medio",
        color: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30",
      };
    case "att":
      return {
        label: "Delantero",
        color: "bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30",
      };
  }
}

export function TeamSquadView({ team, players, teams }: TeamSquadViewProps) {
  const [activeTab, setActiveTab] = useState<PositionTab>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("overall_desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Contadores por demarcación
  const counts = useMemo(() => {
    const c = {
      all: players.length,
      gk: 0,
      def: 0,
      mid: 0,
      att: 0,
      market: 0,
    };
    for (const p of players) {
      const g = getPositionGroup(p.position);
      c[g] = (c[g] || 0) + 1;
      if (p.available_in_market) {
        c.market += 1;
      }
    }
    return c;
  }, [players]);

  // Filtrado y ordenación
  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = players.filter((p) => {
      // Pestaña
      if (activeTab === "market") {
        if (!p.available_in_market) return false;
      } else if (activeTab !== "all") {
        if (getPositionGroup(p.position) !== activeTab) return false;
      }

      // Búsqueda
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchPos = p.position.toLowerCase().includes(q);
        const matchNat = p.nationality?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchPos && !matchNat) return false;
      }

      return true;
    });

    // Ordenación
    result = [...result].sort((a, b) => {
      const ratingA = getPlayerEffectiveRating(a);
      const ratingB = getPlayerEffectiveRating(b);
      const priceA = getPlayerFixedPrice(a);
      const priceB = getPlayerFixedPrice(b);
      const renewalA = getPlayerContractInfo(a).renewalCost;
      const renewalB = getPlayerContractInfo(b).renewalCost;

      switch (sortBy) {
        case "overall_desc":
          return ratingB - ratingA;
        case "overall_asc":
          return ratingA - ratingB;
        case "value_desc":
          return priceB - priceA;
        case "value_asc":
          return priceA - priceB;
        case "renewal_desc":
          return renewalB - renewalA;
        case "age_asc":
          return (a.age || 99) - (b.age || 99);
        case "name_asc":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [players, activeTab, search, sortBy]);

  const hasActiveFilters = activeTab !== "all" || Boolean(search.trim());

  return (
    <section className="space-y-6">
      {/* CABECERA DE SECCIÓN CON CONTADOR */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-black tracking-tight text-foreground uppercase">
              Plantilla del Club
            </h2>
            <Badge variant="secondary" className="font-display font-bold tabular-nums">
              {players.length} jugadores
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión táctica, contratos y estado de transferibilidad del equipo
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="gap-1.5 font-display font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition-all duration-200 h-9 px-3.5 rounded-xl cursor-pointer self-start sm:self-auto"
        >
          <Link
            href={`/players?new=1&team=${team.id}`}
            className="flex items-center gap-1.5 text-white"
          >
            <UserPlus className="size-4 text-white" />
            <span className="text-white font-bold">Añadir Jugador</span>
          </Link>
        </Button>
      </div>

      {/* PESTAÑAS TÁCTICAS POR POSICIÓN */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
            activeTab === "all"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.06]"
          )}
        >
          <span>Todos</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-extrabold",
              activeTab === "all" ? "bg-black/25 text-white" : "bg-white/[0.08] text-foreground"
            )}
          >
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gk")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
            activeTab === "gk"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.06]"
          )}
        >
          <span>🧤 Porteros</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-extrabold",
              activeTab === "gk" ? "bg-black/20 text-white" : "bg-white/[0.08] text-foreground"
            )}
          >
            {counts.gk}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("def")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            activeTab === "def"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.06]"
          )}
        >
          <span>🛡️ Defensas</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-extrabold",
              activeTab === "def" ? "bg-black/20 text-white" : "bg-white/[0.08] text-foreground"
            )}
          >
            {counts.def}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("mid")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            activeTab === "mid"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.06]"
          )}
        >
          <span>🎯 Medios</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-extrabold",
              activeTab === "mid" ? "bg-black/20 text-white" : "bg-white/[0.08] text-foreground"
            )}
          >
            {counts.mid}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("att")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
            activeTab === "att"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.06]"
          )}
        >
          <span>⚡ Delanteros</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-extrabold",
              activeTab === "att" ? "bg-black/20 text-white" : "bg-white/[0.08] text-foreground"
            )}
          >
            {counts.att}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("market")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
            activeTab === "market"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.06]"
          )}
        >
          <Store className="size-3.5 text-emerald-400" />
          <span>En Mercado</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-extrabold",
              activeTab === "market"
                ? "bg-emerald-500/30 text-emerald-200"
                : "bg-white/[0.08] text-foreground"
            )}
          >
            {counts.market}
          </span>
        </button>
      </div>

      {/* BARRA DE HERRAMIENTAS: BÚSQUEDA, ORDENACIÓN Y MODO DE VISTA */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-card/60 p-3.5 backdrop-blur-md shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* BUSCADOR */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar futbolista por nombre, posición o nacionalidad…"
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
              aria-label="Ordenar futbolistas"
              className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] pl-8 pr-7 text-xs font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            >
              <option value="overall_desc">Mayor Media OVR</option>
              <option value="overall_asc">Menor Media OVR</option>
              <option value="value_desc">Mayor Valor Fijo</option>
              <option value="value_asc">Menor Valor Fijo</option>
              <option value="renewal_desc">Mayor Coste Renovación</option>
              <option value="age_asc">Más Jóvenes (Edad)</option>
              <option value="name_asc">Nombre (A - Z)</option>
            </select>
          </div>

          {/* ALTERNADOR DE VISTA */}
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
              title="Vista de tabla táctica"
              aria-label="Vista de tabla táctica"
            >
              <List className="size-4" />
            </button>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveTab("all");
                setSearch("");
              }}
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
          Mostrando <strong className="text-foreground">{filteredPlayers.length}</strong> de{" "}
          <strong className="text-foreground">{players.length}</strong> futbolistas
        </span>
      </div>

      {/* RESULTADOS O ESTADO VACÍO */}
      {filteredPlayers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/[0.12] bg-card/30 p-12 text-center backdrop-blur-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/[0.08]">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            No se encontraron jugadores
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No hay ningún futbolista que coincida con los filtros seleccionados.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setActiveTab("all");
              setSearch("");
            }}
            className="mt-5 gap-1.5 font-display text-xs border-white/[0.1]"
          >
            <RotateCcw className="size-3.5" />
            Restablecer filtros
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* VISTA DE CUADRÍCULA (CARDS DETALLADAS) */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => {
            const posBadge = getPositionBadge(player.position);
            const mediaValue = getPlayerEffectiveRating(player);
            const isHighOvr = mediaValue >= 80;
            const isElite = mediaValue >= 88;
            const tierInfo = getPlayerTier(player);
            const contractInfo = getPlayerContractInfo(player);

            return (
              <Card
                key={player.id}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-white/[0.22] hover:bg-card/90 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)]"
              >
                {/* Hairline sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar
                        name={player.name}
                        photoUrl={player.photo_url}
                        size="md"
                        isElite={isElite}
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/players/${player.id}`}
                          className="truncate font-display text-base font-bold text-foreground group-hover:text-primary transition-colors block outline-none focus-visible:underline"
                        >
                          {player.name}
                        </Link>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <Badge
                            variant="outline"
                            className={cn("h-4 text-[10px] font-extrabold uppercase", posBadge.color)}
                          >
                            {player.position}
                          </Badge>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-full ${tierInfo.bgColor} ${tierInfo.color}`}
                          >
                            {tierInfo.tier}
                          </span>
                          {player.age && (
                            <span className="text-xs text-muted-foreground">
                              {player.age} años
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {player.overall != null && (
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl px-2.5 py-1 font-display font-black shadow-xs shrink-0",
                          isHighOvr
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/[0.06] border border-white/[0.08] text-foreground"
                        )}
                      >
                        <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">
                          MEDIA
                        </span>
                        <span className="text-base font-extrabold tabular-nums">
                          {mediaValue}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* PRECIOS, VALOR Y RENOVACIÓN */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Valor (Tier {tierInfo.tier})
                      </span>
                      <p className="font-display font-bold text-foreground tabular-nums">
                        <BudgetDisplay amount={contractInfo.price} size="sm" />
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        Renovación ({contractInfo.renewalPercentLabel})
                      </span>
                      <p className="font-display font-bold text-foreground tabular-nums">
                        {contractInfo.renewalCost > 0 ? (
                          <span className="text-amber-400 font-bold">{contractInfo.renewalCostLabel}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Gratis</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* MERCADO FLAG Y ACCIONES */}
                  <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-3 gap-2">
                    {player.available_in_market ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-[10px] font-bold text-emerald-400 shrink-0"
                      >
                        <Store className="size-3" />
                        En Mercado
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        Intransferible
                      </span>
                    )}

                    <PlayerActions
                      playerId={player.id}
                      availableInMarket={player.available_in_market}
                      teams={teams}
                      currentTeamId={player.team_id}
                      player={player}
                      variant="compact"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* VISTA DE TABLA TÁCTICA */
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-3.5">
                    Futbolista
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center">
                    Pos
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center">
                    Media
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center">
                    Tier
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center hidden sm:table-cell">
                    Edad
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center hidden md:table-cell">
                    Contrato
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right hidden lg:table-cell">
                    Renovación
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Valor Fijo
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center hidden sm:table-cell">
                    Mercado
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredPlayers.map((player) => {
                  const posBadge = getPositionBadge(player.position);
                  const mediaValue = getPlayerEffectiveRating(player);
                  const tierInfo = getPlayerTier(player);
                  const contractInfo = getPlayerContractInfo(player);

                  return (
                    <tr
                      key={player.id}
                      className="group transition-colors hover:bg-white/[0.04]"
                    >
                      {/* JUGADOR */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar
                            name={player.name}
                            photoUrl={player.photo_url}
                            size="sm"
                            isElite={mediaValue >= 88}
                          />
                          <Link
                            href={`/players/${player.id}`}
                            className="font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[160px] sm:max-w-[200px] outline-none focus-visible:underline"
                          >
                            {player.name}
                          </Link>
                        </div>
                      </td>

                      {/* POSICIÓN */}
                      <td className="px-3 py-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-extrabold uppercase", posBadge.color)}
                        >
                          {player.position}
                        </Badge>
                      </td>

                      {/* MEDIA */}
                      <td className="px-3 py-2.5 text-center font-display font-extrabold tabular-nums">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-bold",
                            mediaValue >= 80
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-white/[0.06] text-foreground"
                          )}
                        >
                          {mediaValue}
                        </span>
                      </td>

                      {/* TIER */}
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.color}`}
                        >
                          {tierInfo.tier}
                        </span>
                      </td>

                      {/* EDAD */}
                      <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground hidden sm:table-cell">
                        {player.age ? `${player.age}a` : "—"}
                      </td>

                      {/* CONTRATO */}
                      <td className="px-3 py-2.5 text-center hidden md:table-cell">
                        <span className="inline-flex items-center text-[11px] font-semibold text-muted-foreground bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">
                          {contractInfo.durationBadge}
                        </span>
                      </td>

                      {/* RENOVACIÓN */}
                      <td className="px-4 py-2.5 text-right text-xs hidden lg:table-cell">
                        {contractInfo.renewalCost > 0 ? (
                          <span className="text-amber-400 font-bold tabular-nums">
                            {contractInfo.renewalCostLabel}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Gratis</span>
                        )}
                      </td>

                      {/* VALOR */}
                      <td className="px-4 py-2.5 text-right font-display text-xs font-bold tabular-nums">
                        <BudgetDisplay amount={contractInfo.price} size="sm" />
                      </td>

                      {/* MERCADO */}
                      <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                        {player.available_in_market ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 bg-emerald-500/10 text-[9px] font-bold text-emerald-400"
                          >
                            Transferible
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No</span>
                        )}
                      </td>

                      {/* ACCIONES */}
                      <td className="px-4 py-2.5 text-right">
                        <PlayerActions
                          playerId={player.id}
                          availableInMarket={player.available_in_market}
                          teams={teams}
                          currentTeamId={player.team_id}
                          player={player}
                          variant="compact"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
