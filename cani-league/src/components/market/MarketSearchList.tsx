"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketCard } from "@/components/market/MarketCard";
import { PLAYER_POSITIONS } from "@/constants";
import { formatMoney } from "@/lib/format/money";
import {
  getPlayerEffectiveRating,
  getPositionGroup,
  GROUP_TIER_THRESHOLDS,
  type PositionGroup,
} from "@/lib/players";
import { POSITION_TABS } from "@/components/players/PlayerList";
import type { Player, Team } from "@/types";

type MarketPlayer = Player & { team?: Pick<Team, "id" | "name"> | null };

type MarketSearchListProps = {
  players: MarketPlayer[];
  teams: Team[];
};

const OUTFIELD_CATEGORIES = [
  { label: "Todas las posiciones de campo", value: "ALL" },
  { label: "🛡️ Defensas (CB, LB, RB, SW)", value: "DEF" },
  { label: "🎯 Centrocampistas (DMF, CMF, AMF, LMF, RMF)", value: "MID" },
  { label: "⚡ Delanteros (CF, SS, LWF, RWF)", value: "ATT" },
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

const PAGE_SIZE = 24;

export function MarketSearchList({ players, teams }: MarketSearchListProps) {
  const [positionGroupTab, setPositionGroupTab] = useState<PositionGroup>("all");
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

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

  const countsByGroup = useMemo(() => {
    let def = 0;
    let mid = 0;
    let att = 0;
    let gk = 0;
    for (const p of players) {
      const grp = getPositionGroup(p.position);
      if (grp === "def") def++;
      else if (grp === "mid") mid++;
      else if (grp === "att") att++;
      else if (grp === "gk") gk++;
    }
    return { all: players.length, def, mid, att, gk };
  }, [players]);

  const currentPresets = useMemo(() => {
    const t = GROUP_TIER_THRESHOLDS[positionGroupTab];
    return [
      { label: "Cualquier media", value: "ALL", min: null, max: null },
      { label: `★ ${t.sPlus}+ (S+ Leyenda)`, value: "S+", min: t.sPlus, max: null },
      { label: `★ ${t.s} - ${t.sPlus - 1} (S Clase Mundial)`, value: "S", min: t.s, max: t.sPlus - 1 },
      { label: `★ ${t.a} - ${t.s - 1} (A Estrella)`, value: "A", min: t.a, max: t.s - 1 },
      { label: `★ ${t.b} - ${t.a - 1} (B Titular)`, value: "B", min: t.b, max: t.a - 1 },
      { label: `★ ${t.c} - ${t.b - 1} (C Rotación)`, value: "C", min: t.c, max: t.b - 1 },
      { label: `★ < ${t.c} (D Reserva)`, value: "D", min: null, max: t.c - 1 },
      { label: "Personalizado...", value: "CUSTOM", min: null, max: null },
    ];
  }, [positionGroupTab]);

  const subPositionOptions = useMemo(() => {
    if (positionGroupTab === "def") {
      return [
        { label: "Todas las defensas (CB, LB, RB)", value: "ALL" },
        { label: "Centrales (CB)", value: "CB" },
        { label: "Laterales Izquierdos (LB)", value: "LB" },
        { label: "Laterales Derechos (RB)", value: "RB" },
      ];
    }
    if (positionGroupTab === "mid") {
      return [
        { label: "Todos los centrocampistas", value: "ALL" },
        { label: "Pivotes Defensivos (DMF)", value: "DMF" },
        { label: "Mediocentros Organizadores (CMF)", value: "CMF" },
        { label: "Mediapuntas (AMF)", value: "AMF" },
        { label: "Banda Izquierda (LMF)", value: "LMF" },
        { label: "Banda Derecha (RMF)", value: "RMF" },
      ];
    }
    if (positionGroupTab === "att") {
      return [
        { label: "Todos los delanteros", value: "ALL" },
        { label: "Delanteros Centro (CF)", value: "CF" },
        { label: "Segundos Delanteros (SS)", value: "SS" },
        { label: "Extremo Izquierdo (LWF)", value: "LWF" },
        { label: "Extremo Derecho (RWF)", value: "RWF" },
      ];
    }
    if (positionGroupTab === "gk") {
      return [{ label: "Porteros (GK)", value: "ALL" }];
    }
    return [
      { label: "Todas las posiciones", value: "ALL" },
      ...OUTFIELD_CATEGORIES.filter((c) => c.value !== "ALL"),
      ...PLAYER_POSITIONS.map((pos) => ({ label: `Posición: ${pos}`, value: pos })),
    ];
  }, [positionGroupTab]);

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
    setCurrentPage(1);
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
      const preset = currentPresets.find((p) => p.value === overallPreset);
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
      // Position group filter (Todos, Defensas, Medios, Delanteros, Porteros)
      if (positionGroupTab !== "all") {
        if (getPositionGroup(player.position) !== positionGroupTab) return false;
      }

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
        if (teamFilter === "SIN_EQUIPO") {
          const isFreeAgent =
            !player.team_id ||
            !player.team ||
            player.team.name.toLowerCase().includes("libre") ||
            player.team.name.toLowerCase().includes("sin equipo");
          if (!isFreeAgent) return false;
        } else if (player.team?.id !== teamFilter && player.team_id !== teamFilter) {
          return false;
        }
      }

      // Overall / Media rating match
      const ovr = getPlayerEffectiveRating(player);
      if (minOvr !== null && ovr < minOvr) return false;
      if (maxOvr !== null && ovr > maxOvr) return false;

      // Market value match (checks both market_value and transfer_price)
      const val = player.market_value ?? 0;
      if (minVal !== null && val < minVal) return false;
      if (maxVal !== null && val > maxVal) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const ovrA = getPlayerEffectiveRating(a);
      const ovrB = getPlayerEffectiveRating(b);
      if (sortBy === "overall_desc") return ovrB - ovrA;
      if (sortBy === "overall_asc") return ovrA - ovrB;
      if (sortBy === "value_desc") return (b.market_value ?? 0) - (a.market_value ?? 0);
      if (sortBy === "value_asc") return (a.market_value ?? 0) - (b.market_value ?? 0);
      if (sortBy === "price_desc") return (b.transfer_price ?? 0) - (a.transfer_price ?? 0);
      if (sortBy === "price_asc") return (a.transfer_price ?? 0) - (b.transfer_price ?? 0);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "es");
      if (sortBy === "name_desc") return b.name.localeCompare(a.name, "es");
      return 0;
    });

    return result;
  }, [
    players,
    positionGroupTab,
    currentPresets,
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

  const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedPlayers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredPlayers.slice(start, start + PAGE_SIZE);
  }, [filteredPlayers, safePage]);

  return (
    <div className="space-y-6">
      {/* FILTER CONTROL PANEL */}
      <div className="rounded-2xl border bg-card/60 p-4 shadow-xs backdrop-blur-xs space-y-4">
        {/* Selector Principal por Agrupaciones de Posición */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {POSITION_TABS.map((tab) => {
              const active = positionGroupTab === tab.id;
              const count = countsByGroup[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setPositionGroupTab(tab.id);
                    setPositionFilter("ALL");
                    setOverallPreset("ALL");
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? tab.activeClass
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      active
                        ? "bg-black/20 text-inherit dark:bg-white/20"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
                    {count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-muted-foreground hidden lg:inline font-medium">
            {POSITION_TABS.find((t) => t.id === positionGroupTab)?.description}
          </span>
        </div>

        {/* Banner contextual si está en pestaña de porteros */}
        {positionGroupTab === "gk" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start sm:items-center gap-2.5">
            <span className="text-lg shrink-0">🧤</span>
            <div className="min-w-0">
              <p className="font-bold text-foreground">Apartado exclusivo de Porteros en el Mercado</p>
              <p className="text-muted-foreground text-[11px]">
                Mostrando únicamente guardametas. Su valoración media corresponde a Defensa y Portería ((DEF + GK) / 2) y sus tiers están calibrados a los estándares de porteros (S+ ≥ 96, S ≥ 91, A ≥ 86, B ≥ 81, C ≥ 75).
              </p>
            </div>
          </div>
        )}

        {/* TOP ROW: SEARCH & CONTROLS */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                positionGroupTab === "all"
                  ? "Buscar jugadores en el mercado..."
                  : `Buscar ${POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel.toLowerCase()} en el mercado...`
              }
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
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
          </div>
        </div>

        {/* PRIMARY FILTERS GRID */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. NATIONALITY FILTER */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Nacionalidad
            </label>
            <Select
              value={nationality}
              onValueChange={(val) => {
                setNationality(val ?? "ALL");
                setCurrentPage(1);
              }}
            >
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
              {positionGroupTab === "all" ? "Posición" : `Filtro ${POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel}`}
            </label>
            <Select
              value={positionFilter}
              onValueChange={(val) => {
                setPositionFilter(val ?? "ALL");
                setCurrentPage(1);
              }}
              disabled={positionGroupTab === "gk"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas las posiciones" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {subPositionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. AVERAGE POINTS / OVERALL FILTER */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Media ({POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel})
            </label>
            <Select
              value={overallPreset}
              onValueChange={(val) => {
                setOverallPreset(val ?? "ALL");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cualquier media" />
              </SelectTrigger>
              <SelectContent>
                {currentPresets.map((ovr) => (
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
              Rango de Valor / Precio
            </label>
            <Select
              value={valuePreset}
              onValueChange={(val) => {
                setValuePreset(val ?? "ALL");
                setCurrentPage(1);
              }}
            >
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
                    setCurrentPage(1);
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
                    setCurrentPage(1);
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
                    setCurrentPage(1);
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
                    setCurrentPage(1);
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Team Filter */}
            {teams.length > 0 && (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <span className="text-xs font-semibold text-foreground">
                  Equipo de origen
                </span>
                <Select
                  value={teamFilter}
                  onValueChange={(val) => {
                    setTeamFilter(val ?? "ALL");
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Todos los equipos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="ALL">Todos los equipos</SelectItem>
                    <SelectItem value="SIN_EQUIPO">⭐ Agentes Libres (Mercado)</SelectItem>
                    {teams
                      .filter((t) => !t.name.toLowerCase().includes("libre") && !t.name.toLowerCase().includes("sin equipo"))
                      .map((t) => (
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
              Disponibles: <strong className="text-foreground">{filteredPlayers.length}</strong> de {players.length} jugadores en el mercado
            </span>

            {/* Active filter badges */}
            {nationality !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                País: {nationality}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setNationality("ALL");
                    setCurrentPage(1);
                  }}
                />
              </Badge>
            )}

            {positionFilter !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Posición: {positionFilter}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setPositionFilter("ALL");
                    setCurrentPage(1);
                  }}
                />
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
                    setCurrentPage(1);
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
                    setCurrentPage(1);
                  }}
                />
              </Badge>
            )}

            {teamFilter !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Equipo:{" "}
                {teamFilter === "SIN_EQUIPO"
                  ? "Agentes Libres"
                  : teams.find((t) => t.id === teamFilter)?.name || teamFilter}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setTeamFilter("ALL");
                    setCurrentPage(1);
                  }}
                />
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
            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val ?? "overall_desc");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-52 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall_desc">Mayor Media (OVR ↓)</SelectItem>
                <SelectItem value="overall_asc">Menor Media (OVR ↑)</SelectItem>
                <SelectItem value="value_desc">Mayor Valor de Mercado (€ ↓)</SelectItem>
                <SelectItem value="value_asc">Menor Valor de Mercado (€ ↑)</SelectItem>
                <SelectItem value="price_desc">Mayor Precio Fichaje (€ ↓)</SelectItem>
                <SelectItem value="price_asc">Menor Precio Fichaje (€ ↑)</SelectItem>
                <SelectItem value="name_asc">Nombre (A → Z)</SelectItem>
                <SelectItem value="name_desc">Nombre (Z → A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* RESULTS GRID */}
      {filteredPlayers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-5 py-12 text-center text-sm text-ink-muted space-y-3">
          <Store className="size-8 mx-auto text-muted-foreground/60" />
          <p className="font-display font-semibold text-foreground">
            No hay jugadores en el mercado que coincidan
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Ningún futbolista en venta cumple con los filtros activos. Prueba cambiando la búsqueda o restableciendo los filtros.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 gap-1.5">
              <RotateCcw className="size-3.5" />
              Restablecer filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedPlayers.map((player) => (
              <MarketCard key={player.id} player={player} teams={teams} />
            ))}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <span>
                Página <strong className="text-foreground">{safePage}</strong> de{" "}
                <strong className="text-foreground">{totalPages}</strong> (
                {filteredPlayers.length} jugadores en el mercado)
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="size-3.5" /> Anterior
                </Button>

                {/* Quick Page Selector */}
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pNum: number;
                    if (totalPages <= 5) {
                      pNum = i + 1;
                    } else if (safePage <= 3) {
                      pNum = i + 1;
                    } else if (safePage >= totalPages - 2) {
                      pNum = totalPages - 4 + i;
                    } else {
                      pNum = safePage - 2 + i;
                    }
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setCurrentPage(pNum)}
                        className={`size-7 rounded-md text-xs font-medium transition-colors ${
                          safePage === pNum
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="gap-1"
                >
                  Siguiente <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
