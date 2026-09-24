"use client";

import { useState, useMemo, useTransition } from "react";
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
  getPlayerContractInfo,
  getPlayerFixedPrice,
  type PositionGroup,
  type PlayerTier,
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
    description: "Todos los futbolistas de la liga · Tiers globales (S+ ≥ 90 · S 87-89 · A 85-86 · B 78-84 · D < 78)",
  },
  {
    id: "def",
    label: "Defensas",
    shortLabel: "Defensas",
    icon: "🛡️",
    activeClass: "bg-blue-600 text-white shadow-xs",
    description: "Centrales y laterales · Tiers para defensores (S+ ≥ 88 · S 85-87 · A 83-84 · B 76-82 · D < 76)",
  },
  {
    id: "mid",
    label: "Centrocampistas",
    shortLabel: "Medios",
    icon: "🎯",
    activeClass: "bg-emerald-600 text-white shadow-xs",
    description: "Pivotes, organizadores y mediapuntas · Tiers para medios (S+ ≥ 90 · S 88-89 · A 85-87 · B 78-84 · D < 78)",
  },
  {
    id: "att",
    label: "Delanteros",
    shortLabel: "Delanteros",
    icon: "⚡",
    activeClass: "bg-rose-600 text-white shadow-xs",
    description: "Extremos, segundos delanteros y arietes · Tiers para atacantes (S+ ≥ 91 · S 88-90 · A 86-87 · B 79-85 · D < 79)",
  },
  {
    id: "gk",
    label: "Porteros",
    shortLabel: "Porteros",
    icon: "🧤",
    activeClass: "bg-amber-600 text-white shadow-xs",
    description: "Guardametas · Media por Portería + Defensa · Tiers de porteros (S+ ≥ 96 · S 91-95 · A 86-90 · B 75-85 · D < 75)",
  },
];

const VALUE_PRESETS = [
  { label: "Cualquier valor", value: "ALL", min: null, max: null },
  { label: "★ €80M (Tier S+ / S)", value: "80M", min: 80_000_000, max: 80_000_000 },
  { label: "★ €35M (Tier A Estrella)", value: "35M", min: 35_000_000, max: 35_000_000 },
  { label: "★ €15M (Tier B Titular)", value: "15M", min: 15_000_000, max: 15_000_000 },
  { label: "★ €1M (Tier D Reserva)", value: "1M", min: null, max: 1_000_000 },
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
  const [isPending, startTransition] = useTransition();

  // Pre-enrich players with tier, effective rating, and fixed price to avoid repeated expensive evaluations
  const enrichedPlayers = useMemo(() => {
    return players.map((p) => {
      const positionGroup = getPositionGroup(p.position);
      const tierInfo = getPlayerTier(p);
      const effectiveRating = getPlayerEffectiveRating(p);
      const fixedPrice = getPlayerFixedPrice(p);
      return {
        ...p,
        _positionGroup: positionGroup,
        _tierInfo: tierInfo,
        _tier: tierInfo.tier,
        _effectiveRating: effectiveRating,
        _fixedPrice: fixedPrice,
      };
    });
  }, [players]);

  // Extract unique nationalities with counts
  const nationalities = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of enrichedPlayers) {
      if (p.nationality && p.nationality.trim()) {
        const nat = p.nationality.trim();
        map.set(nat, (map.get(nat) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([name, count]) => ({ name, count }));
  }, [enrichedPlayers]);

  const countsByGroup = useMemo(() => {
    let def = 0;
    let mid = 0;
    let att = 0;
    let gk = 0;
    for (const p of enrichedPlayers) {
      if (p._positionGroup === "def") def++;
      else if (p._positionGroup === "mid") mid++;
      else if (p._positionGroup === "att") att++;
      else if (p._positionGroup === "gk") gk++;
    }
    return { all: enrichedPlayers.length, def, mid, att, gk };
  }, [enrichedPlayers]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { "S+": 0, "S": 0, "A": 0, "B": 0, "C": 0, "D": 0 };
    for (const p of enrichedPlayers) {
      if (positionGroupTab !== "all" && p._positionGroup !== positionGroupTab) {
        continue;
      }
      const t = p._tier;
      if (counts[t] !== undefined) {
        counts[t]++;
      }
    }
    return counts;
  }, [enrichedPlayers, positionGroupTab]);

  const currentPresets = useMemo(() => {
    if (positionGroupTab === "all") {
      const presets = [
        { label: "Cualquier media / tier", value: "ALL", tier: null as PlayerTier | null, min: null, max: null },
        { label: "★ Tier S+ (Leyenda)", value: "S+", tier: "S+" as PlayerTier, min: null, max: null },
        { label: "★ Tier S (Clase Mundial)", value: "S", tier: "S" as PlayerTier, min: null, max: null },
        { label: "★ Tier A (Estrella)", value: "A", tier: "A" as PlayerTier, min: null, max: null },
        { label: "★ Tier B (Titular)", value: "B", tier: "B" as PlayerTier, min: null, max: null },
      ];
      if ((tierCounts["C"] ?? 0) > 0) {
        presets.push({ label: "★ Tier C (Rotación)", value: "C", tier: "C" as PlayerTier, min: null, max: null });
      }
      presets.push(
        { label: "★ Tier D (Reserva)", value: "D", tier: "D" as PlayerTier, min: null, max: null },
        { label: "Personalizado...", value: "CUSTOM", tier: null as PlayerTier | null, min: null, max: null },
      );
      return presets;
    }
    const t = GROUP_TIER_THRESHOLDS[positionGroupTab];
    const presets: Array<{ label: string; value: string; tier: PlayerTier | null; min: number | null; max: number | null }> = [
      { label: "Cualquier media", value: "ALL", tier: null as PlayerTier | null, min: null, max: null },
      { label: `★ ${t.sPlus}+ (S+ Leyenda)`, value: "S+", tier: "S+" as PlayerTier, min: t.sPlus, max: null },
      { label: `★ ${t.s} - ${t.sPlus - 1} (S Clase Mundial)`, value: "S", tier: "S" as PlayerTier, min: t.s, max: t.sPlus - 1 },
      { label: `★ ${t.a} - ${t.s - 1} (A Estrella)`, value: "A", tier: "A" as PlayerTier, min: t.a, max: t.s - 1 },
      { label: `★ ${t.b} - ${t.a - 1} (B Titular)`, value: "B", tier: "B" as PlayerTier, min: t.b, max: t.a - 1 },
    ];
    if (t.b > t.c && (tierCounts["C"] ?? 0) > 0) {
      presets.push({ label: `★ ${t.c} - ${t.b - 1} (C Rotación)`, value: "C", tier: "C" as PlayerTier, min: t.c, max: t.b - 1 });
    }
    presets.push(
      { label: `★ < ${t.b} (D Reserva)`, value: "D", tier: "D" as PlayerTier, min: null, max: t.b - 1 },
      { label: "Personalizado...", value: "CUSTOM", tier: null as PlayerTier | null, min: null, max: null },
    );
    return presets;
  }, [positionGroupTab, tierCounts]);

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

    return enrichedPlayers
      .filter((p) => {
        // Position group tab filter (Todos, Defensas, Medios, Delanteros, Porteros)
        if (positionGroupTab !== "all") {
          if (p._positionGroup !== positionGroupTab) return false;
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

        // Tier filter (calculado según el estándar de la posición del jugador)
        if (selectedTier !== "TODOS") {
          if (p._tier !== selectedTier) return false;
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
        if (overallPreset === "CUSTOM") {
          const ovr = p._effectiveRating;
          if (minOvr !== null && ovr < minOvr) return false;
          if (maxOvr !== null && ovr > maxOvr) return false;
        } else if (overallPreset !== "ALL") {
          const preset = currentPresets.find((pr) => pr.value === overallPreset);
          if (preset?.tier) {
            if (p._tier !== preset.tier) return false;
          } else if (preset) {
            const ovr = p._effectiveRating;
            if (minOvr !== null && ovr < minOvr) return false;
            if (maxOvr !== null && ovr > maxOvr) return false;
          }
        }

        // Market value match (sincronizado con precio fijo de tier)
        const val = p._fixedPrice;
        if (minVal !== null && val < minVal) return false;
        if (maxVal !== null && val > maxVal) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "overall_desc":
            return b._effectiveRating - a._effectiveRating;
          case "overall_asc":
            return a._effectiveRating - b._effectiveRating;
          case "value_desc":
            return b._fixedPrice - a._fixedPrice;
          case "value_asc":
            return a._fixedPrice - b._fixedPrice;
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
    <div className="space-y-6" id="players-view-container">
      {/* FILTER & CONTROLS PANEL */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-4 shadow-sm backdrop-blur-md space-y-4">
        {/* Subtle top edge sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Selector Principal por Agrupaciones de Posición */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div
            role="tablist"
            aria-label="Filtrar por demarcación en el campo"
            className="flex flex-wrap items-center gap-2"
          >
            {POSITION_TABS.map((tab) => {
              const active = positionGroupTab === tab.id;
              const count = countsByGroup[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls="players-results-section"
                  onClick={() => {
                    startTransition(() => {
                      setPositionGroupTab(tab.id);
                      setSelectedPos("TODAS");
                      setSelectedTier("TODOS");
                      setOverallPreset("ALL");
                      handleFilterChange();
                    });
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    active
                      ? tab.activeClass
                      : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      active
                        ? "bg-black/20 text-inherit dark:bg-white/20"
                        : "bg-white/[0.08] text-muted-foreground"
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
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start sm:items-center gap-2.5">
            <span className="text-lg shrink-0" aria-hidden="true">🧤</span>
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              aria-label={
                positionGroupTab === "all"
                  ? "Buscar jugador por nombre, posición, país o equipo"
                  : `Buscar ${POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel.toLowerCase()} por nombre, país o equipo`
              }
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
              className="pl-10 pr-10 h-10 min-h-[40px] bg-background/70 border-white/[0.1] focus-visible:ring-primary/40 text-xs sm:text-sm font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  handleFilterChange();
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors size-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-primary outline-none"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Toggle Advanced / Custom Filters */}
          <Button
            variant={showAdvanced ? "secondary" : "outline"}
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-filters-panel"
            className="gap-1.5 h-10 min-h-[40px] px-3.5 text-xs sm:text-sm font-medium border-white/[0.1] hover:border-white/[0.2]"
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
              aria-label="Criterio de ordenación"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                handleFilterChange();
              }}
              className="h-10 min-h-[40px] rounded-lg border border-white/[0.1] bg-background/80 px-3 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
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
          <div
            role="group"
            aria-label="Modo de visualización"
            className="flex items-center rounded-lg border border-white/[0.1] bg-background/60 p-1 shadow-xs"
          >
            <button
              type="button"
              aria-pressed={viewMode === "grid"}
              aria-label="Ver en cuadrícula de tarjetas"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 min-h-[32px] text-xs font-semibold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "table"}
              aria-label="Ver en tabla detallada"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 min-h-[32px] text-xs font-semibold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-3.5" aria-hidden="true" />
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
        <div
          role="group"
          aria-label="Filtro rápido por Tier"
          className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-white/[0.06]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1 shrink-0 flex items-center gap-1.5">
            <SlidersHorizontal className="size-3 text-primary" aria-hidden="true" />
            Tiers ({POSITION_TABS.find((t) => t.id === positionGroupTab)?.shortLabel}):
          </span>
          <button
            type="button"
            aria-pressed={selectedTier === "TODOS"}
            onClick={() => {
              setSelectedTier("TODOS");
              handleFilterChange();
            }}
            className={`rounded-full px-3 py-1 min-h-[32px] text-xs font-semibold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selectedTier === "TODOS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-white/[0.05] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.09] hover:text-foreground"
            }`}
          >
            Todos
          </button>
          {(["S+", "S", "A", "B", "C", "D"] as const)
            .filter((tier) => tier !== "C" || (tierCounts["C"] ?? 0) > 0 || selectedTier === "C")
            .map((tier) => {
            const active = selectedTier === tier;
            const count = tierCounts[tier] ?? 0;
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedTier(active ? "TODOS" : tier);
                  handleFilterChange();
                }}
                className={`rounded-full px-3 py-1 min-h-[32px] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-white/[0.05] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.09] hover:text-foreground"
                }`}
              >
                <span>Tier {tier}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-white/[0.08] text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ACTIVE FILTERS & INFO BAR */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-white/[0.06] text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground font-medium mr-1">
              Mostrando <strong className="text-foreground">{filteredAndSorted.length.toLocaleString()}</strong> de{" "}
              <strong className="text-foreground">{players.length.toLocaleString()}</strong> jugadores
            </span>

            {/* Active filter badges */}
            {selectedNationality !== "TODAS" && (
              <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs bg-white/[0.06] border-white/[0.1] text-foreground">
                <span>País: {selectedNationality}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNationality("TODAS");
                    handleFilterChange();
                  }}
                  aria-label={`Eliminar filtro de nacionalidad ${selectedNationality}`}
                  className="inline-flex size-4 items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                >
                  <X className="size-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
                </button>
              </Badge>
            )}

            {selectedPos !== "TODAS" && (
              <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs bg-white/[0.06] border-white/[0.1] text-foreground">
                <span>Posición: {selectedPos}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPos("TODAS");
                    handleFilterChange();
                  }}
                  aria-label={`Eliminar filtro de posición ${selectedPos}`}
                  className="inline-flex size-4 items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                >
                  <X className="size-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
                </button>
              </Badge>
            )}

            {selectedTier !== "TODOS" && (
              <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs bg-white/[0.06] border-white/[0.1] text-foreground">
                <span>Tier: {selectedTier}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTier("TODOS");
                    handleFilterChange();
                  }}
                  aria-label={`Eliminar filtro de Tier ${selectedTier}`}
                  className="inline-flex size-4 items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                >
                  <X className="size-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
                </button>
              </Badge>
            )}

            {overallPreset !== "ALL" && (
              <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs bg-white/[0.06] border-white/[0.1] text-foreground">
                <span>Media: {overallPreset === "CUSTOM" ? (customMinOverall || "0") + " - " + (customMaxOverall || "100") : overallPreset}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOverallPreset("ALL");
                    setCustomMinOverall("");
                    setCustomMaxOverall("");
                    handleFilterChange();
                  }}
                  aria-label="Eliminar filtro de media"
                  className="inline-flex size-4 items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                >
                  <X className="size-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
                </button>
              </Badge>
            )}

            {valuePreset !== "ALL" && (
              <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs bg-white/[0.06] border-white/[0.1] text-foreground">
                <span>Valor: {valuePreset === "CUSTOM" ? (customMinValue ? formatMoney(Number(customMinValue)) : "0") + " - " + (customMaxValue ? formatMoney(Number(customMaxValue)) : "Max") : valuePreset}</span>
                <button
                  type="button"
                  onClick={() => {
                    setValuePreset("ALL");
                    setCustomMinValue("");
                    setCustomMaxValue("");
                    handleFilterChange();
                  }}
                  aria-label="Eliminar filtro de valor económico"
                  className="inline-flex size-4 items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                >
                  <X className="size-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
                </button>
              </Badge>
            )}

            {selectedTeam !== "TODOS" && (
              <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs bg-white/[0.06] border-white/[0.1] text-foreground">
                <span>Equipo: {teams.find((t) => t.id === selectedTeam)?.name || selectedTeam}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeam("TODOS");
                    handleFilterChange();
                  }}
                  aria-label="Eliminar filtro de club"
                  className="inline-flex size-4 items-center justify-center rounded-full hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-primary outline-none transition-colors"
                >
                  <X className="size-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
                </button>
              </Badge>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive gap-1.5 h-8 min-h-[32px] px-3 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <RotateCcw className="size-3.5" /> Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Main Content View */}
      {filteredAndSorted.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-white/[0.12] bg-card/40 backdrop-blur-md rounded-2xl">
          <div className="size-12 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-3">
            <Search className="size-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="font-display font-semibold text-base text-foreground">No hay resultados</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No se encontraron jugadores con los filtros seleccionados. Intenta cambiar los criterios de nacionalidad, posición, media o valor.
          </p>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="mt-4 gap-1.5 min-h-[40px] px-4 font-semibold border-white/[0.1] hover:border-white/[0.2]"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Limpiar todos los filtros
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        <section id="players-results-section" aria-label="Resultados de búsqueda de jugadores" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              href={`/players/${player.id}`}
            />
          ))}
        </section>
      ) : (
        /* Scouting Table View */
        <div id="players-results-section" className="overflow-x-auto rounded-xl border border-white/[0.08] bg-card/40 backdrop-blur-md shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Jugador</th>
                <th scope="col" className="px-3 py-3">Pos</th>
                <th scope="col" className="px-3 py-3">País</th>
                <th scope="col" className="px-3 py-3">Equipo</th>
                <th scope="col" className="px-3 py-3 text-center">
                  {positionGroupTab === "gk" ? "Media (DEF+GK)" : "Media OVR"}
                </th>
                <th scope="col" className="px-3 py-3 text-center">Tier</th>
                <th scope="col" className="px-3 py-3 text-center hidden sm:table-cell">Contrato</th>
                <th scope="col" className="px-3 py-3 text-center hidden lg:table-cell">Renovación</th>
                {positionGroupTab !== "gk" && (
                  <>
                    <th scope="col" className="px-3 py-3 text-center hidden md:table-cell">VEL</th>
                    <th scope="col" className="px-3 py-3 text-center hidden md:table-cell">TIR</th>
                    <th scope="col" className="px-3 py-3 text-center hidden md:table-cell">PAS</th>
                  </>
                )}
                <th scope="col" className="px-3 py-3 text-center hidden md:table-cell">DEF</th>
                <th scope="col" className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-medium">
              {paginatedPlayers.map((player) => {
                const tierInfo = getPlayerTier(player);
                const contractInfo = getPlayerContractInfo(player);
                return (
                  <tr
                    key={player.id}
                    className="group transition-colors hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/players/${player.id}`}
                        className="font-semibold text-foreground group-hover:text-primary transition-colors block truncate max-w-[200px] outline-none focus-visible:underline focus-visible:text-primary"
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded px-1.5 py-0.5 text-[11px] font-bold bg-white/[0.06] border border-white/[0.08] text-foreground/80">
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
                    <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                      <span className="inline-flex items-center text-[11px] font-semibold text-muted-foreground bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">
                        {contractInfo.durationBadge}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs hidden lg:table-cell" title={contractInfo.renewalPercent > 0 ? `Coste de renovación: ${contractInfo.renewalPercentLabel} (${contractInfo.renewalCostLabel})` : "Renovación gratuita"}>
                      {contractInfo.renewalCost > 0 ? (
                        <span className="text-amber-400 font-bold">{contractInfo.renewalCostLabel}</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Gratis</span>
                      )}
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
                    <td className="px-4 py-2.5 text-right font-display text-xs font-semibold tabular-nums">
                      <BudgetDisplay amount={contractInfo.price} size="sm" />
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
        <nav
          aria-label="Paginación de jugadores"
          className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-4 text-xs text-muted-foreground"
        >
          <span>
            Página <strong className="text-foreground">{safePage}</strong> de{" "}
            <strong className="text-foreground">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
              className="h-9 min-h-[36px] px-3 gap-1.5 text-xs font-semibold border-white/[0.1] hover:border-white/[0.2] transition-colors"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              <span>Anterior</span>
            </Button>

            {/* Quick Page Selector */}
            <div className="flex items-center gap-1 px-1">
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
                const isCurrent = safePage === pNum;
                return (
                  <button
                    key={pNum}
                    type="button"
                    aria-current={isCurrent ? "page" : undefined}
                    aria-label={`Página ${pNum}`}
                    onClick={() => setCurrentPage(pNum)}
                    className={`size-9 min-w-[36px] min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
              className="h-9 min-h-[36px] px-3 gap-1.5 text-xs font-semibold border-white/[0.1] hover:border-white/[0.2] transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
