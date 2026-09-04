"use client";

import { useState, useMemo } from "react";
import { Search, X, RotateCcw, SlidersHorizontal, ArrowUpDown, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PLAYER_POSITIONS } from "@/constants";
import { formatMoney } from "@/lib/format/money";
import type { Player, Team } from "@/types";

type PlayerWithTeam = Player & { team?: Pick<Team, "id" | "name" | "primary_color"> };

type PlayerSearchListProps = {
  players: PlayerWithTeam[];
  teams?: Team[];
};

const POSITION_CATEGORIES = [
  { label: "Todas las posiciones", value: "ALL" },
  { label: "🧤 Porteros (GK)", value: "GK" },
  { label: "🛡️ Defensas (CB, LB, RB, SW)", value: "DEF" },
  { label: "🎯 Centrocampistas (DMF, CMF, AMF, LMF, RMF)", value: "MID" },
  { label: "⚡ Delanteros (CF, SS, LWF, RWF)", value: "ATT" },
];

const OVERALL_PRESETS = [
  { label: "Cualquier media", value: "ALL", min: null, max: null },
  { label: "★ 89+ (S+ Leyenda)", value: "89+", min: 89, max: null },
  { label: "★ 85 - 88 (S Clase Mundial)", value: "85-88", min: 85, max: 88 },
  { label: "★ 82 - 84 (A Estrella)", value: "82-84", min: 82, max: 84 },
  { label: "★ 78 - 81 (B Titular)", value: "78-81", min: 78, max: 81 },
  { label: "★ 74 - 77 (C Rotación)", value: "74-77", min: 74, max: 77 },
  { label: "★ < 74 (D Reserva)", value: "<74", min: null, max: 73 },
  { label: "Personalizado...", value: "CUSTOM", min: null, max: null },
];

const VALUE_PRESETS = [
  { label: "Cualquier valor", value: "ALL", min: null, max: null },
  { label: "< €1.000.000", value: "<1M", min: null, max: 1_000_000 },
  { label: "€1M - €5M", value: "1M-5M", min: 1_000_000, max: 5_000_000 },
  { label: "€5M - €15M", value: "5M-15M", min: 5_000_000, max: 15_000_000 },
  { label: "€15M - €30M", value: "15M-30M", min: 15_000_000, max: 30_000_000 },
  { label: "> €30M", value: ">30M", min: 30_000_000, max: null },
  { label: "Personalizado...", value: "CUSTOM", min: null, max: null },
];

function isPositionInGroup(pos: string, group: string): boolean {
  if (group === "ALL") return true;
  const p = pos.toUpperCase();
  if (group === "GK") return p === "GK";
  if (group === "DEF") return ["CB", "LB", "RB", "SW", "LWB", "RWB"].includes(p);
  if (group === "MID") return ["DMF", "CMF", "AMF", "LMF", "RMF", "SMF"].includes(p);
  if (group === "ATT") return ["CF", "SS", "LWF", "RWF", "ST"].includes(p);
  return p === group;
}

export function PlayerSearchList({ players, teams = [] }: PlayerSearchListProps) {
  const [search, setSearch] = useState("");
  const [nationality, setNationality] = useState<string>("ALL");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");
  
  // Overall / Media filters
  const [overallPreset, setOverallPreset] = useState<string>("ALL");
  const [customMinOverall, setCustomMinOverall] = useState<string>("");
  const [customMaxOverall, setCustomMaxOverall] = useState<string>("");

  // Value / Precio filters
  const [valuePreset, setValuePreset] = useState<string>("ALL");
  const [customMinValue, setCustomMinValue] = useState<string>("");
  const [customMaxValue, setCustomMaxValue] = useState<string>("");

  // Sort
  const [sortBy, setSortBy] = useState<string>("overall_desc");
  
  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Show extended filter panel
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Extract unique nationalities with counts
  const nationalities = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of players) {
      if (p.nationality && p.nationality.trim()) {
        const nat = p.nationality.trim();
        map.set(nat, (map.get(nat) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([name, count]) => ({ name, count }));
  }, [players]);

  // Handle active filter resets
  const hasActiveFilters = 
    search.trim() !== "" ||
    nationality !== "ALL" ||
    positionFilter !== "ALL" ||
    teamFilter !== "ALL" ||
    overallPreset !== "ALL" ||
    customMinOverall !== "" ||
    customMaxOverall !== "" ||
    valuePreset !== "ALL" ||
    customMinValue !== "" ||
    customMaxValue !== "";

  const resetFilters = () => {
    setSearch("");
    setNationality("ALL");
    setPositionFilter("ALL");
    setTeamFilter("ALL");
    setOverallPreset("ALL");
    setCustomMinOverall("");
    setCustomMaxOverall("");
    setValuePreset("ALL");
    setCustomMinValue("");
    setCustomMaxValue("");
    setSortBy("overall_desc");
  };

  // Filtered & Sorted players
  const filteredPlayers = useMemo(() => {
    const q = search.toLowerCase().trim();

    // Determine overall bounds
    let minOvr: number | null = null;
    let maxOvr: number | null = null;

    if (overallPreset === "CUSTOM") {
      minOvr = customMinOverall ? Number(customMinOverall) : null;
      maxOvr = customMaxOverall ? Number(customMaxOverall) : null;
    } else {
      const preset = OVERALL_PRESETS.find((p) => p.value === overallPreset);
      if (preset) {
        minOvr = preset.min;
        maxOvr = preset.max;
      }
    }

    // Determine value bounds
    let minVal: number | null = null;
    let maxVal: number | null = null;

    if (valuePreset === "CUSTOM") {
      minVal = customMinValue ? Number(customMinValue) : null;
      maxVal = customMaxValue ? Number(customMaxValue) : null;
    } else {
      const preset = VALUE_PRESETS.find((p) => p.value === valuePreset);
      if (preset) {
        minVal = preset.min;
        maxVal = preset.max;
      }
    }

    const result = players.filter((player) => {
      // Search text match
      if (q) {
        const nameMatch = player.name?.toLowerCase().includes(q) ?? false;
        const shortNameMatch = player.short_name?.toLowerCase().includes(q) ?? false;
        const posMatch = player.position?.toLowerCase().includes(q) ?? false;
        const teamMatch = player.team?.name?.toLowerCase().includes(q) ?? false;
        const natMatch = player.nationality?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !shortNameMatch && !posMatch && !teamMatch && !natMatch) {
          return false;
        }
      }

      // Nationality match
      if (nationality !== "ALL") {
        if (!player.nationality || player.nationality.trim().toLowerCase() !== nationality.toLowerCase()) {
          return false;
        }
      }

      // Position match
      if (positionFilter !== "ALL") {
        if (!isPositionInGroup(player.position || "", positionFilter)) {
          return false;
        }
      }

      // Team match
      if (teamFilter !== "ALL") {
        if (player.team_id !== teamFilter) {
          return false;
        }
      }

      // Overall / Media rating match
      const ovr = player.overall ?? 0;
      if (minOvr !== null && ovr < minOvr) return false;
      if (maxOvr !== null && ovr > maxOvr) return false;

      // Market value match
      const val = player.market_value ?? 0;
      if (minVal !== null && val < minVal) return false;
      if (maxVal !== null && val > maxVal) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "overall_desc") return (b.overall ?? 0) - (a.overall ?? 0);
      if (sortBy === "overall_asc") return (a.overall ?? 0) - (b.overall ?? 0);
      if (sortBy === "value_desc") return (b.market_value ?? 0) - (a.market_value ?? 0);
      if (sortBy === "value_asc") return (a.market_value ?? 0) - (b.market_value ?? 0);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "es");
      if (sortBy === "name_desc") return b.name.localeCompare(a.name, "es");
      return 0;
    });

    return result;
  }, [
    players,
    search,
    nationality,
    positionFilter,
    teamFilter,
    overallPreset,
    customMinOverall,
    customMaxOverall,
    valuePreset,
    customMinValue,
    customMaxValue,
    sortBy,
  ]);

  return (
    <div className="space-y-5">
      {/* FILTER CONTROL PANEL */}
      <div className="rounded-2xl border bg-card/60 p-4 shadow-xs backdrop-blur-xs space-y-4">
        {/* TOP ROW: SEARCH & QUICK CONTROLS */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, posición, país o equipo..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showAdvanced ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </Button>

            <div className="flex items-center rounded-lg border bg-background p-0.5">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("grid")}
                title="Vista en cuadrícula"
                aria-label="Vista en cuadrícula"
              >
                <LayoutGrid className="size-3.5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("list")}
                title="Vista en lista"
                aria-label="Vista en lista"
              >
                <List className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* PRIMARY FILTERS GRID */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. NATIONALITY FILTER */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Nacionalidad
            </label>
            <Select value={nationality} onValueChange={(val) => setNationality(val ?? "ALL")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas las nacionalidades" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">Todas las nacionalidades</SelectItem>
                {nationalities.map((nat) => (
                  <SelectItem key={nat.name} value={nat.name}>
                    {nat.name} ({nat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. POSITION FILTER */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Posición
            </label>
            <Select value={positionFilter} onValueChange={(val) => setPositionFilter(val ?? "ALL")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas las posiciones" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {POSITION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
                <div className="my-1 border-t border-border/50" />
                {PLAYER_POSITIONS.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    Posición exacta: {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. AVERAGE POINTS / OVERALL FILTER */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Puntos de Media (OVR)
            </label>
            <Select value={overallPreset} onValueChange={(val) => setOverallPreset(val ?? "ALL")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cualquier media" />
              </SelectTrigger>
              <SelectContent>
                {OVERALL_PRESETS.map((ovr) => (
                  <SelectItem key={ovr.value} value={ovr.value}>
                    {ovr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. RANGE OF VALUE FILTER */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Rango de Valor
            </label>
            <Select value={valuePreset} onValueChange={(val) => setValuePreset(val ?? "ALL")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cualquier valor" />
              </SelectTrigger>
              <SelectContent>
                {VALUE_PRESETS.map((val) => (
                  <SelectItem key={val.value} value={val.value}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ADVANCED / CUSTOM SLIDERS & INPUTS */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Custom Overall Range */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <span className="text-xs font-semibold text-foreground">
                Media personalizada (OVR)
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min (ej. 75)"
                  min={0}
                  max={100}
                  value={customMinOverall}
                  onChange={(e) => {
                    setOverallPreset("CUSTOM");
                    setCustomMinOverall(e.target.value);
                  }}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input
                  type="number"
                  placeholder="Max (ej. 99)"
                  min={0}
                  max={100}
                  value={customMaxOverall}
                  onChange={(e) => {
                    setOverallPreset("CUSTOM");
                    setCustomMaxOverall(e.target.value);
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Custom Value Range */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <span className="text-xs font-semibold text-foreground">
                Valor personalizado (€)
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min €"
                  min={0}
                  step={100000}
                  value={customMinValue}
                  onChange={(e) => {
                    setValuePreset("CUSTOM");
                    setCustomMinValue(e.target.value);
                  }}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input
                  type="number"
                  placeholder="Max €"
                  min={0}
                  step={100000}
                  value={customMaxValue}
                  onChange={(e) => {
                    setValuePreset("CUSTOM");
                    setCustomMaxValue(e.target.value);
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Team Filter */}
            {teams.length > 0 && (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <span className="text-xs font-semibold text-foreground">
                  Filtrar por Equipo
                </span>
                <Select value={teamFilter} onValueChange={(val) => setTeamFilter(val ?? "ALL")}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Todos los equipos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="ALL">Todos los equipos</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM ROW: SORT & ACTIVE FILTER CHIPS */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1">
              Mostrando <strong className="text-foreground">{filteredPlayers.length}</strong> de {players.length} jugadores
            </span>

            {/* Active filter badges with clear buttons */}
            {nationality !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                País: {nationality}
                <X className="size-3 cursor-pointer" onClick={() => setNationality("ALL")} />
              </Badge>
            )}

            {positionFilter !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Posición: {positionFilter}
                <X className="size-3 cursor-pointer" onClick={() => setPositionFilter("ALL")} />
              </Badge>
            )}

            {overallPreset !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Media: {overallPreset === "CUSTOM" ? `${customMinOverall || "0"}-${customMaxOverall || "100"}` : overallPreset}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setOverallPreset("ALL");
                    setCustomMinOverall("");
                    setCustomMaxOverall("");
                  }}
                />
              </Badge>
            )}

            {valuePreset !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Valor: {valuePreset === "CUSTOM" ? `${customMinValue ? formatMoney(Number(customMinValue)) : "0"} - ${customMaxValue ? formatMoney(Number(customMaxValue)) : "Max"}` : valuePreset}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setValuePreset("ALL");
                    setCustomMinValue("");
                    setCustomMaxValue("");
                  }}
                />
              </Badge>
            )}

            {teamFilter !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Equipo: {teams.find((t) => t.id === teamFilter)?.name || teamFilter}
                <X className="size-3 cursor-pointer" onClick={() => setTeamFilter("ALL")} />
              </Badge>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="xs"
                onClick={resetFilters}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground h-6 px-2"
              >
                <RotateCcw className="size-3" />
                Limpiar todo
              </Button>
            )}
          </div>

          {/* SORT DROPDOWN */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Ordenar:</span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val ?? "overall_desc")}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall_desc">Mayor Media (OVR ↓)</SelectItem>
                <SelectItem value="overall_asc">Menor Media (OVR ↑)</SelectItem>
                <SelectItem value="value_desc">Mayor Valor (€ ↓)</SelectItem>
                <SelectItem value="value_asc">Menor Valor (€ ↑)</SelectItem>
                <SelectItem value="name_asc">Nombre (A → Z)</SelectItem>
                <SelectItem value="name_desc">Nombre (Z → A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* RESULTS LIST / GRID */}
      {filteredPlayers.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center space-y-3">
          <p className="font-display text-lg font-bold">No se encontraron jugadores</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ningún jugador coincide con los filtros seleccionados. Intenta ajustar la búsqueda, nacionalidad, posición o rango de media y valor.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 gap-1.5">
              <RotateCcw className="size-3.5" />
              Restablecer todos los filtros
            </Button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "grid grid-cols-1 gap-2.5"
          }
        >
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              href={`/players/${player.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
