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
import {
  getPlayerTier,
  getPlayerEffectiveRating,
  getPositionGroup,
  GROUP_TIER_THRESHOLDS,
  type PositionGroup,
} from "@/lib/players";
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

export const POSITION_TABS: Array<{
  id: PositionGroup;
  label: string;
  shortLabel: string;
  icon: string;
  activeClass: string;
  description: string;
}> = [
  {
    id: "all",
    label: "Todos los Jugadores",
    shortLabel: "Todos",
    icon: "🌐",
    activeClass: "bg-primary text-primary-foreground shadow-xs",
    description: "Todos los futbolistas de la liga · Tiers globales (S+ ≥ 89)",
  },
  {
    id: "def",
    label: "Defensas",
    shortLabel: "Defensas",
    icon: "🛡️",
    activeClass: "bg-blue-600 text-white shadow-xs",
    description: "Centrales y laterales · Tiers calculados para defensores (S+ ≥ 86 · S 83-85 · A 80-82)",
  },
  {
    id: "mid",
    label: "Centrocampistas",
    shortLabel: "Medios",
    icon: "🎯",
    activeClass: "bg-emerald-600 text-white shadow-xs",
    description: "Pivotes, organizadores y mediapuntas · Tiers calculados para medios (S+ ≥ 88 · S 85-87 · A 82-84)",
  },
  {
    id: "att",
    label: "Delanteros",
    shortLabel: "Delanteros",
    icon: "⚡",
    activeClass: "bg-rose-600 text-white shadow-xs",
    description: "Extremos, segundos delanteros y arietes · Tiers calculados para atacantes (S+ ≥ 91 · S 87-90 · A 83-86)",
  },
  {
    id: "gk",
    label: "Porteros",
    shortLabel: "Porteros",
    icon: "🧤",
    activeClass: "bg-amber-600 text-white shadow-xs",
    description: "Guardametas · Media por Portería + Defensa · Tiers de porteros (S+ ≥ 96 · S 91-95 · A 86-90)",
  },
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
  const [positionGroupTab, setPositionGroupTab] = useState<PositionGroup>("all");
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

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { "S+": 0, "S": 0, "A": 0, "B": 0, "C": 0, "D": 0 };
    const thresholds = GROUP_TIER_THRESHOLDS[positionGroupTab];
    for (const p of players) {
      if (positionGroupTab !== "all" && getPositionGroup(p.position) !== positionGroupTab) {
        continue;
      }
      const t = getPlayerTier(p, undefined, thresholds, positionGroupTab).tier;
      if (counts[t] !== undefined) {
        counts[t]++;
      }
    }
    return counts;
  }, [players, positionGroupTab]);

  const subPositionOptions = useMemo(() => {
    if (positionGroupTab === "def") {
      return [
        { label: "Todas las defensas (CB, LB, RB)", value: "TODAS" },
        { label: "Centrales (CB)", value: "CB" },
        { label: "Laterales Izquierdos (LB)", value: "LB" },
        { label: "Laterales Derechos (RB)", value: "RB" },
      ];
    }
    if (positionGroupTab === "mid") {
      return [
        { label: "Todos los centrocampistas", value: "TODAS" },
        { label: "Pivotes Defensivos (DMF)", value: "DMF" },
        { label: "Mediocentros Organizadores (CMF)", value: "CMF" },
        { label: "Mediapuntas (AMF)", value: "AMF" },
        { label: "Interiores / Bandas (LMF, RMF)", value: "MID_WING" },
        { label: "Banda Izquierda (LMF)", value: "LMF" },
        { label: "Banda Derecha (RMF)", value: "RMF" },
      ];
    }
    if (positionGroupTab === "att") {
      return [
        { label: "Todos los delanteros", value: "TODAS" },
        { label: "Delanteros Centro (CF)", value: "CF" },
        { label: "Segundos Delanteros (SS)", value: "SS" },
        { label: "Extremos (LWF, RWF)", value: "WINGS" },
        { label: "Extremo Izquierdo (LWF)", value: "LWF" },
        { label: "Extremo Derecho (RWF)", value: "RWF" },
      ];
    }
    if (positionGroupTab === "gk") {
      return [{ label: "Porteros (GK)", value: "TODAS" }];
    }
    return [
      { label: "Todas las posiciones", value: "TODAS" },
      ...OUTFIELD_CATEGORIES,
      ...OUTFIELD_INDIVIDUAL_POSITIONS.map((pos) => ({ label: `Posición: ${pos}`, value: pos })),
      { label: "Porteros (GK)", value: "GK" },
    ];
  }, [positionGroupTab]);

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Filter & sort
  const filteredAndSorted = useMemo(() => {
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
        // Position group tab filter (Todos, Defensas, Medios, Delanteros, Porteros)
        if (positionGroupTab !== "all") {
          if (getPositionGroup(p.position) !== positionGroupTab) return false;
        }

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

        // Sub-position filter within tab
        if (selectedPos !== "TODAS") {
          if (selectedPos === "MID_WING") {
            if (!["LMF", "RMF"].includes(p.position || "")) return false;
          } else if (selectedPos === "WINGS") {
            if (!["LWF", "RWF"].includes(p.position || "")) return false;
          } else if (!isPositionInGroup(p.position || "", selectedPos)) {
            return false;
          }
        }

        // Tier filter (calculado según el estándar de la pestaña activa)
        if (selectedTier !== "TODOS") {
          const tier = getPlayerTier(
            p,
            undefined,
            GROUP_TIER_THRESHOLDS[positionGroupTab],
            positionGroupTab
          ).tier;
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
    positionGroupTab,
    currentPresets,
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
                    setSelectedPos("TODAS");
                    setSelectedTier("TODOS");
                    setOverallPreset("ALL");
                    handleFilterChange();
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

        {/* Banner informativo contextual si está en pestaña de porteros */}
        {positionGroupTab === "gk" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start sm:items-center gap-2.5">
            <span className="text-lg shrink-0">🧤</span>
            <div className="min-w-0">
              <p className="font-bold text-foreground">Apartado exclusivo de Porteros</p>
              <p className="text-muted-foreground text-[11px]">
                La media de los porteros cuenta exclusivamente <strong>Defensa</strong> y <strong>Portería</strong> ((DEF + GK) / 2) y sus tiers están calibrados a las medias reales de los guardametas (S+ ≥ 96, S ≥ 91, A ≥ 86, B ≥ 81, C ≥ 75).
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
                positionGroupTab === "all"
                  ? "Buscar jugador por nombre, posición, país o equipo..."
                  : `Buscar ${POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel.toLowerCase()} por nombre, país o equipo...`
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
              {positionGroupTab !== "gk" && (
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
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Filter className="size-3" /> {positionGroupTab === "all" ? "Posición" : `Filtro ${POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel}`}
            </label>
            <select
              value={selectedPos}
              onChange={(e) => {
                setSelectedPos(e.target.value);
                handleFilterChange();
              }}
              disabled={positionGroupTab === "gk"}
              className="w-full h-9 rounded-lg border border-border/80 bg-background px-2.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {subPositionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Average Points / Overall Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              ★ Media ({POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel})
            </label>
            <select
              value={overallPreset}
              onChange={(e) => {
                setOverallPreset(e.target.value);
                handleFilterChange();
              }}
              className="w-full h-9 rounded-lg border border-border/80 bg-background px-2.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {currentPresets.map((ovr) => (
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

        {/* TIER QUICK PILLS (Calculados para la agrupación activa) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-2 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="size-3" /> Tiers ({POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel}):
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedTier("TODOS");
              handleFilterChange();
            }}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedTier === "TODOS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Todos
          </button>
          {(["S+", "S", "A", "B", "C", "D"] as const).map((tier) => {
            const active = selectedTier === tier;
            const count = tierCounts[tier] ?? 0;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => {
                  setSelectedTier(active ? "TODOS" : tier);
                  handleFilterChange();
                }}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Tier {tier}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

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
              groupContext={positionGroupTab}
            />
          ))}
        </div>
      ) : (
        /* Scouting Table View */
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/80 bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Jugador</th>
                <th className="px-3 py-3">Pos</th>
                <th className="px-3 py-3">País</th>
                <th className="px-3 py-3">Equipo</th>
                <th className="px-3 py-3 text-center">
                  {positionGroupTab === "gk" ? "Media (DEF+GK)" : "Media OVR"}
                </th>
                <th className="px-3 py-3 text-center">Tier</th>
                {positionGroupTab !== "gk" && (
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
                const tierInfo = getPlayerTier(
                  player,
                  undefined,
                  GROUP_TIER_THRESHOLDS[positionGroupTab],
                  positionGroupTab
                );
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
                    {positionGroupTab !== "gk" && (
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
