"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerCard } from "@/components/players/PlayerCard";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { formatStat } from "@/lib/format/stats";
import { formatMoney } from "@/lib/format/money";
import { getPlayerTier, getPlayerEffectiveRating } from "@/lib/players";
import {
  Search,
  X,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  Globe,
} from "lucide-react";
import type { Player, Team } from "@/types";

type PlayerWithTeam = Player & { team?: Pick<Team, "id" | "name" | "primary_color"> };

type SortOption =
  | "overall_desc"
  | "overall_asc"
  | "value_desc"
  | "value_asc"
  | "name_asc"
  | "speed_desc"
  | "shooting_desc"
  | "passing_desc";

const OUTFIELD_CATEGORIES = [
  { label: "Todas las posiciones de campo", value: "TODAS" },
  { label: "🛡️ Defensas (CB, LB, RB, SW)", value: "DEF" },
  { label: "🎯 Centrocampistas (DMF, CMF, AMF, LMF, RMF)", value: "MID" },
  { label: "⚡ Delanteros (CF, SS, LWF, RWF)", value: "ATT" },
];

const OUTFIELD_INDIVIDUAL_POSITIONS = [
  "CB",
  "LB",
  "RB",
  "DMF",
  "CMF",
  "AMF",
  "LMF",
  "RMF",
  "LWF",
  "RWF",
  "SS",
  "CF",
];

const OUTFIELD_OVERALL_PRESETS = [
  { label: "Cualquier media", value: "ALL", min: null, max: null },
  { label: "★ 89+ (S+ Leyenda)", value: "89+", min: 89, max: null },
  { label: "★ 85 - 88 (S Clase Mundial)", value: "85-88", min: 85, max: 88 },
  { label: "★ 82 - 84 (A Estrella)", value: "82-84", min: 82, max: 84 },
  { label: "★ 78 - 81 (B Titular)", value: "78-81", min: 78, max: 81 },
  { label: "★ 74 - 77 (C Rotación)", value: "74-77", min: 74, max: 77 },
  { label: "★ < 74 (D Reserva)", value: "<74", min: null, max: 73 },
  { label: "Personalizado...", value: "CUSTOM", min: null, max: null },
];

const GK_OVERALL_PRESETS = [
  { label: "Todas las medias", value: "ALL", min: null, max: null },
  { label: "★ 95+ (Leyendas Top)", value: "95+", min: 95, max: null },
  { label: "★ 90 - 94 (Clase Mundial)", value: "90-94", min: 90, max: 94 },
  { label: "★ 85 - 89 (Estrellas)", value: "85-89", min: 85, max: 89 },
  { label: "★ 80 - 84 (Titulares)", value: "80-84", min: 80, max: 84 },
  { label: "★ 70 - 79 (Rotación)", value: "70-79", min: 70, max: 79 },
  { label: "★ < 70 (Reserva)", value: "<70", min: null, max: 69 },
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

const OUTFIELD_TIERS = ["TODOS", "S+", "S", "A", "B", "C", "D"];
const PAGE_SIZE = 24;

function isPositionInGroup(pos: string, group: string): boolean {
  if (group === "TODAS" || group === "ALL") return true;
  const p = pos.toUpperCase();
  if (group === "GK") return p === "GK";
  if (group === "DEF") return ["CB", "LB", "RB", "SW", "LWB", "RWB"].includes(p);
  if (group === "MID") return ["DMF", "CMF", "AMF", "LMF", "RMF", "SMF"].includes(p);
  if (group === "ATT") return ["CF", "SS", "LWF", "RWF", "ST"].includes(p);
  return p === group;
}

export function PlayerList({
  players,
  teams = [],
}: {
  players: PlayerWithTeam[];
  teams?: Team[];
}) {
  const [playerTypeTab, setPlayerTypeTab] = useState<"outfield" | "gk">("outfield");
  const [search, setSearch] = useState("");
  const [selectedNationality, setSelectedNationality] = useState("TODAS");
  const [selectedPos, setSelectedPos] = useState("TODAS");
  const [selectedTier, setSelectedTier] = useState("TODOS");
  const [selectedTeam, setSelectedTeam] = useState("TODOS");

  // Overall / Media filters
  const [overallPreset, setOverallPreset] = useState<string>("ALL");
  const [customMinOverall, setCustomMinOverall] = useState("");
  const [customMaxOverall, setCustomMaxOverall] = useState("");

  // Value filters
  const [valuePreset, setValuePreset] = useState<string>("ALL");
  const [customMinValue, setCustomMinValue] = useState("");
  const [customMaxValue, setCustomMaxValue] = useState("");

  const [sortBy, setSortBy] = useState<SortOption>("overall_desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  const outfieldCount = useMemo(
    () => players.filter((p) => p.position?.toUpperCase() !== "GK").length,
    [players]
  );
  const gkCount = useMemo(
    () => players.filter((p) => p.position?.toUpperCase() === "GK").length,
    [players]
  );

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Filter & sort
  const filteredAndSorted = useMemo(() => {
    const isOutfield = playerTypeTab === "outfield";
    const currentPresets = isOutfield ? OUTFIELD_OVERALL_PRESETS : GK_OVERALL_PRESETS;
    const term = search.toLowerCase().trim();

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

    return players
      .filter((p) => {
        const isGK = p.position?.toUpperCase() === "GK";

        // Estricta separación: los porteros NUNCA van en jugadores de campo, y viceversa
        if (isOutfield && isGK) return false;
        if (!isOutfield && !isGK) return false;

        // Search term
        if (term) {
          const matchName = p.name.toLowerCase().includes(term);
          const matchPos = p.position?.toLowerCase().includes(term);
          const matchTeam = p.team?.name?.toLowerCase().includes(term);
          const matchNat = p.nationality?.toLowerCase().includes(term);
          if (!matchName && !matchPos && !matchTeam && !matchNat) return false;
        }

        // Nationality filter
        if (selectedNationality !== "TODAS") {
          if (!p.nationality || p.nationality.trim().toLowerCase() !== selectedNationality.toLowerCase()) {
            return false;
          }
        }

        // Position filter (solo relevante para jugadores de campo)
        if (isOutfield && selectedPos !== "TODAS") {
          if (!isPositionInGroup(p.position || "", selectedPos)) {
            return false;
          }
        }

        // Tier filter (solo para jugadores de campo: S+ al D)
        if (isOutfield && selectedTier !== "TODOS") {
          const tier = getPlayerTier(p).tier;
          if (tier !== selectedTier) return false;
        }

        // Team filter
        if (selectedTeam !== "TODOS") {
          if (selectedTeam === "SIN_EQUIPO") {
            const isFreeAgent =
              !p.team_id ||
              p.team?.name?.toLowerCase().includes("libre") ||
              p.team?.name?.toLowerCase().includes("sin equipo");
            if (!isFreeAgent) return false;
          } else if (p.team_id !== selectedTeam) {
            return false;
          }
        }

        // Overall / Media rating match
        const ovr = getPlayerEffectiveRating(p);
        if (minOvr !== null && ovr < minOvr) return false;
        if (maxOvr !== null && ovr > maxOvr) return false;

        // Market value match
        const val = p.market_value ?? 0;
        if (minVal !== null && val < minVal) return false;
        if (maxVal !== null && val > maxVal) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "overall_desc":
            return getPlayerEffectiveRating(b) - getPlayerEffectiveRating(a);
          case "overall_asc":
            return getPlayerEffectiveRating(a) - getPlayerEffectiveRating(b);
          case "value_desc":
            return (b.market_value ?? 0) - (a.market_value ?? 0);
          case "value_asc":
            return (a.market_value ?? 0) - (b.market_value ?? 0);
          case "name_asc":
            return a.name.localeCompare(b.name, "es");
          case "speed_desc":
            return (b.speed ?? 0) - (a.speed ?? 0);
          case "shooting_desc":
            return (b.shooting ?? 0) - (a.shooting ?? 0);
          case "passing_desc":
            return (b.passing ?? 0) - (a.passing ?? 0);
          default:
            return 0;
        }
      });
  }, [
    players,
    playerTypeTab,
    search,
    selectedNationality,
    selectedPos,
    selectedTier,
    selectedTeam,
    overallPreset,
    customMinOverall,
    customMaxOverall,
    valuePreset,
    customMinValue,
    customMaxValue,
    sortBy,
  ]);

  // Reset page when filters change
  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedPlayers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, safePage]);

  // Determine if any filters are active for UI indication
  const hasActiveFilters =
    search.trim() !== "" ||
    selectedPos !== "TODAS" ||
    selectedTier !== "TODOS" ||
    selectedTeam !== "TODOS" ||
    sortBy !== "overall_desc";

  const clearFilters = () => {
    setSearch("");
    setSelectedNationality("TODAS");
    setSelectedPos("TODAS");
    setSelectedTier("TODOS");
    setSelectedTeam("TODOS");
    setOverallPreset("ALL");
    setCustomMinOverall("");
    setCustomMaxOverall("");
    setValuePreset("ALL");
    setCustomMinValue("");
    setCustomMaxValue("");
    setSortBy("overall_desc");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* FILTER & CONTROLS PANEL */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-xs backdrop-blur-xs space-y-4">
        {/* Selector Principal: Jugadores de Campo vs Porteros */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPlayerTypeTab("outfield");
                setSelectedPos("TODAS");
                setSelectedTier("TODOS");
                setOverallPreset("ALL");
                handleFilterChange();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                playerTypeTab === "outfield"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>⚽ Jugadores de Campo</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  playerTypeTab === "outfield"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                }`}
              >
                {outfieldCount.toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlayerTypeTab("gk");
                setSelectedPos("TODAS");
                setSelectedTier("TODOS");
                setOverallPreset("ALL");
                handleFilterChange();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                playerTypeTab === "gk"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>🧤 Porteros</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  playerTypeTab === "gk"
                    ? "bg-white/25 text-white"
                    : "bg-muted-foreground/20 text-muted-foreground"
                }`}
              >
                {gkCount.toLocaleString()}
              </span>
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground hidden md:inline font-medium">
            {playerTypeTab === "outfield"
              ? "Promedio de 26 estadísticas PES · Tiers S+ al D"
              : "Media calculada únicamente por Defensa + Portería"}
          </span>
        </div>

        {/* Banner informativo exclusivo si está en pestaña de porteros */}
        {playerTypeTab === "gk" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start sm:items-center gap-2.5">
            <span className="text-lg shrink-0">🧤</span>
            <div className="min-w-0">
              <p className="font-bold text-foreground">Apartado exclusivo de Porteros</p>
              <p className="text-muted-foreground text-[11px]">
                Los porteros se gestionan en este apartado separado. Su media cuenta exclusivamente <strong>Defensa</strong> y <strong>Portería</strong> ((DEF + GK) / 2) y no se mezclan con los jugadores de campo ni con los tiers de letras.
              </p>
            </div>
          </div>
        )}

        {/* Search & Main Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={
                playerTypeTab === "outfield"
                  ? "Buscar jugador de campo por nombre, posición, país o equipo..."
                  : "Buscar portero por nombre, país o equipo..."
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                handleFilterChange();
              }}
              className="pl-9 pr-8 h-10 bg-background shadow-xs border-border/80 focus-visible:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  handleFilterChange();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Toggle Advanced / Custom Filters */}
          <Button
            variant={showAdvanced ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-1.5 h-10"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Filtros avanzados</span>
            {hasActiveFilters && (
              <span className="size-2 rounded-full bg-primary" />
            )}
          </Button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="size-4 text-muted-foreground shrink-0 hidden sm:inline" />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                handleFilterChange();
              }}
              className="h-10 rounded-lg border border-border/80 bg-background px-3 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="overall_desc">Mayor Media (OVR ↓)</option>
              <option value="overall_asc">Menor Media (OVR ↑)</option>
              <option value="value_desc">Mayor Valor (€ ↓)</option>
              <option value="value_asc">Menor Valor (€ ↑)</option>
              <option value="name_asc">Nombre (A → Z)</option>
              {playerTypeTab === "outfield" && (
                <>
                  <option value="speed_desc">Velocidad</option>
                  <option value="shooting_desc">Tiro</option>
                  <option value="passing_desc">Pase</option>
                </>
              )}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border/80 bg-background p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista Tabla"
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>
        </div>

        {/* PRIMARY FILTERS ROW (Nationality, Position, Overall, Value, Team) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          {/* 1. Nationality Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Globe className="size-3" /> Nacionalidad
            </label>
            <select
              value={selectedNationality}
              onChange={(e) => {
                setSelectedNationality(e.target.value);
                handleFilterChange();
              }}
              className="w-full h-9 rounded-lg border border-border/80 bg-background px-2.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TODAS">Todas las nacionalidades</option>
              {nationalities.map((nat) => (
                <option key={nat.name} value={nat.name}>
                  {nat.name} ({nat.count})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Position Category Selector */}
          {playerTypeTab === "outfield" ? (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Filter className="size-3" /> Posición de Campo
              </label>
              <select
                value={selectedPos}
                onChange={(e) => {
                  setSelectedPos(e.target.value);
                  handleFilterChange();
                }}
                className="w-full h-9 rounded-lg border border-border/80 bg-background px-2.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                {OUTFIELD_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
                <option disabled>──────────</option>
                {OUTFIELD_INDIVIDUAL_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    Posición exacta: {pos}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Filter className="size-3" /> Posición
              </label>
              <div className="w-full h-9 rounded-lg border border-border/80 bg-muted/40 px-2.5 text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>🧤 Portero Exclusivo (GK)</span>
              </div>
            </div>
          )}

          {/* 3. Average Points / Overall Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              ★ Media (Puntos OVR)
            </label>
            <select
              value={overallPreset}
              onChange={(e) => {
                setOverallPreset(e.target.value);
                handleFilterChange();
              }}
              className="w-full h-9 rounded-lg border border-border/80 bg-background px-2.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {(playerTypeTab === "outfield" ? OUTFIELD_OVERALL_PRESETS : GK_OVERALL_PRESETS).map((ovr) => (
                <option key={ovr.value} value={ovr.value}>
                  {ovr.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Range of Value Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              💰 Rango de Valor
            </label>
            <select
              value={valuePreset}
              onChange={(e) => {
                setValuePreset(e.target.value);
                handleFilterChange();
              }}
              className="w-full h-9 rounded-lg border border-border/80 bg-background px-2.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {VALUE_PRESETS.map((val) => (
                <option key={val.value} value={val.value}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ADVANCED CUSTOM INPUTS PANEL */}
        {showAdvanced && (
          <div className="pt-3 border-t border-border/60 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Custom Overall Range */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
                Media personalizada exacta
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
                    handleFilterChange();
                  }}
                  className="h-8 text-xs bg-background"
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
                    handleFilterChange();
                  }}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Custom Value Range */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
              <span className="text-xs font-semibold text-foreground">
                Valor personalizado exacto (€)
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
                    handleFilterChange();
                  }}
                  className="h-8 text-xs bg-background"
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
                    handleFilterChange();
                  }}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Team Selector */}
            {teams.length > 0 && (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Club / Equipo
                </span>
                <select
                  value={selectedTeam}
                  onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    handleFilterChange();
                  }}
                  className="w-full h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="TODOS">Todos los equipos</option>
                  <option value="SIN_EQUIPO">Agentes Libres / Sin equipo</option>
                  {teams.filter(t => !t.name.toLowerCase().includes("libre")).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* TIER QUICK PILLS (Solo campo) O NIVELES DE MEDIA (Solo porteros) */}
        {playerTypeTab === "outfield" ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-2 shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="size-3" /> Tier de Campo:
            </span>
            {OUTFIELD_TIERS.map((tier) => {
              const active = selectedTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setSelectedTier(tier);
                    handleFilterChange();
                  }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tier === "TODOS" ? "Todos los Tiers" : `Tier ${tier}`}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-2 shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="size-3" /> Nivel Portero:
            </span>
            {GK_OVERALL_PRESETS.filter((p) => p.value !== "CUSTOM").map((preset) => {
              const active = overallPreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setOverallPreset(preset.value);
                    handleFilterChange();
                  }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ACTIVE FILTERS & INFO BAR */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground font-medium mr-1">
              Mostrando <strong className="text-foreground">{filteredAndSorted.length.toLocaleString()}</strong> de{" "}
              <strong className="text-foreground">{players.length.toLocaleString()}</strong> jugadores
            </span>

            {/* Active filter badges */}
            {selectedNationality !== "TODAS" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                País: {selectedNationality}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setSelectedNationality("TODAS");
                    handleFilterChange();
                  }}
                />
              </Badge>
            )}

            {selectedPos !== "TODAS" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Posición: {selectedPos}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setSelectedPos("TODAS");
                    handleFilterChange();
                  }}
                />
              </Badge>
            )}

            {selectedTier !== "TODOS" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Tier: {selectedTier}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setSelectedTier("TODOS");
                    handleFilterChange();
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
                    handleFilterChange();
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
                    handleFilterChange();
                  }}
                />
              </Badge>
            )}

            {selectedTeam !== "TODOS" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Equipo: {teams.find((t) => t.id === selectedTeam)?.name || selectedTeam}
                <X
                  className="size-3 cursor-pointer"
                  onClick={() => {
                    setSelectedTeam("TODOS");
                    handleFilterChange();
                  }}
                />
              </Badge>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-destructive gap-1 h-6 px-2"
            >
              <RotateCcw className="size-3" /> Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Main Content View */}
      {filteredAndSorted.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Search className="size-6 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-base">No hay resultados</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No se encontraron jugadores con los filtros seleccionados. Intenta cambiar los criterios de nacionalidad, posición, media o valor.
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 gap-1.5">
            <RotateCcw className="size-3.5" /> Limpiar todos los filtros
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              href={`/players/${player.id}`}
            />
          ))}
        </div>
      ) : (
        /* Scouting Table View */
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/80 bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{playerTypeTab === "outfield" ? "Jugador" : "Portero"}</th>
                <th className="px-3 py-3">Pos</th>
                <th className="px-3 py-3">País</th>
                <th className="px-3 py-3">Equipo</th>
                <th className="px-3 py-3 text-center">
                  {playerTypeTab === "outfield" ? "Media (26 Stats)" : "Media (DEF+GK)"}
                </th>
                <th className="px-3 py-3 text-center">
                  {playerTypeTab === "outfield" ? "Tier" : "Rol"}
                </th>
                {playerTypeTab === "outfield" && (
                  <>
                    <th className="px-3 py-3 text-center hidden md:table-cell">VEL</th>
                    <th className="px-3 py-3 text-center hidden md:table-cell">TIR</th>
                    <th className="px-3 py-3 text-center hidden md:table-cell">PAS</th>
                  </>
                )}
                <th className="px-3 py-3 text-center hidden md:table-cell">DEF</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {paginatedPlayers.map((player) => {
                const tierInfo = getPlayerTier(player);
                return (
                  <tr
                    key={player.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/players/${player.id}`}
                        className="font-semibold text-foreground group-hover:text-primary transition-colors block truncate max-w-[200px]"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded px-1.5 py-0.5 text-[11px] font-bold bg-muted text-foreground/80">
                        {player.position}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[120px]">
                      {player.nationality || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[140px]">
                      {player.team?.name || "Sin equipo"}
                    </td>
                    <td className="px-3 py-2.5 text-center font-display font-bold text-base tabular-nums">
                      {formatStat(getPlayerEffectiveRating(player))}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.color}`}>
                        {tierInfo.tier}
                      </span>
                    </td>
                    {playerTypeTab === "outfield" && (
                      <>
                        <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground hidden md:table-cell">
                          {player.speed ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground hidden md:table-cell">
                          {player.shooting ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground hidden md:table-cell">
                          {player.passing ?? "—"}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground hidden md:table-cell">
                      {player.defending ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-display text-xs font-semibold">
                      <BudgetDisplay amount={player.market_value} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>
            Página <strong className="text-foreground">{safePage}</strong> de{" "}
            <strong className="text-foreground">{totalPages}</strong>
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
    </div>
  );
}
