"use client";

import { useState, useMemo } from "react";
import {
  PES_STAT_DEFINITIONS,
  PES_CATEGORIES,
  getPesStatColor,
  estimatePesStatsFromLegacy,
  type PesStatCategory,
} from "@/constants/pes";
import { STAT_LABELS, type StatKey } from "@/constants";
import {
  PlayerRadarChart,
  PlayerPesBarChart,
} from "@/components/charts/LeagueCharts";
import { cn } from "@/lib/utils";
import type { Player, PesStats } from "@/types";

type PlayerStatsProps = {
  player: Player & { pes_stats?: PesStats };
};

type ChartMode = "radar26" | "macro" | "bars";

export function PlayerStats({ player }: PlayerStatsProps) {
  const [chartMode, setChartMode] = useState<ChartMode>("radar26");
  const [activeCategory, setActiveCategory] = useState<PesStatCategory | "all">("all");

  const stats: PesStats = useMemo(
    () => player.pes_stats ?? estimatePesStatsFromLegacy(player),
    [player]
  );

  const filteredDefs = useMemo(() => {
    if (activeCategory === "all") return PES_STAT_DEFINITIONS;
    return PES_STAT_DEFINITIONS.filter((d) => d.category === activeCategory);
  }, [activeCategory]);

  // 1. Radar 26 data
  const radar26Data = useMemo(() => {
    return PES_STAT_DEFINITIONS.map((def) => ({
      stat: def.shortLabel,
      value: stats[def.key] ?? 50,
      fullMark: 100,
      fullLabel: `${def.label} (${def.pesName}): ${stats[def.key] ?? 50}`,
    }));
  }, [stats]);

  // 2. Macro 7 data
  const macroData = useMemo(() => {
    return STAT_LABELS.map(({ key, label }) => ({
      stat: label.slice(0, 3).toUpperCase(),
      value: player[key as StatKey] ?? 50,
      fullMark: 100,
      fullLabel: `${label}: ${player[key as StatKey] ?? 50}`,
    }));
  }, [player]);

  // 3. Bars data (respects active category filter)
  const barData = useMemo(() => {
    return filteredDefs.map((def) => {
      const val = stats[def.key] ?? 50;
      const color = getPesStatColor(val);
      return {
        stat: def.shortLabel,
        value: val,
        fullName: `${def.label} (${def.pesName})`,
        fill: color.hex,
        category: def.category,
      };
    });
  }, [filteredDefs, stats]);

  return (
    <div className="space-y-6">
      {/* Chart Section */}
      <div>
        <div className="mb-3">

          <div role="tablist" aria-label="Modo de visualización gráfica" className="flex h-9 w-full rounded-[9px] bg-input p-[2px]">
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === "radar26"}
              onClick={() => setChartMode("radar26")}
              className={cn(
                "flex-1 rounded-[7px] text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                chartMode === "radar26"
                  ? "bg-[#636366] text-white"
                  : "text-[#ebebf5]/60"
              )}
            >
              Radar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === "macro"}
              onClick={() => setChartMode("macro")}
              className={cn(
                "flex-1 rounded-[7px] text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                chartMode === "macro"
                  ? "bg-[#636366] text-white"
                  : "text-[#ebebf5]/60"
              )}
            >
              Resumen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === "bars"}
              onClick={() => setChartMode("bars")}
              className={cn(
                "flex-1 rounded-[7px] text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                chartMode === "bars"
                  ? "bg-[#636366] text-white"
                  : "text-[#ebebf5]/60"
              )}
            >
              Barras
            </button>
          </div>
        </div>

        {chartMode === "radar26" && (
          <div className="py-2">
            <PlayerRadarChart data={radar26Data} maxHeight={320} />
          </div>
        )}

        {chartMode === "macro" && (
          <div className="py-2">
            <PlayerRadarChart data={macroData} maxHeight={280} />
          </div>
        )}

        {chartMode === "bars" && (
          <div className="py-2">
            <PlayerPesBarChart data={barData} />
          </div>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-muted-foreground">
            {filteredDefs.length} atributos
          </p>
        </div>

        <div role="group" aria-label="Filtrar atributos por categoría" className="flex flex-wrap gap-1.5">
          {PES_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-white text-black" : "bg-secondary text-foreground"
                )}
              >
                {cat.label.replace(/\s*\(\d+\)$/, "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* 26 Stats Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {filteredDefs.map((def, index) => {
          const val = stats[def.key] ?? 50;
          const colorInfo = getPesStatColor(val);

          return (
            <div
              key={def.key}
              className="flex flex-col justify-between rounded-[14px] bg-secondary p-3"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="flex h-5 min-w-8 items-center justify-center rounded bg-white/[0.08] px-1 font-mono text-[12px] font-bold text-muted-foreground">
                    {def.shortLabel}
                  </span>
                  <div className="truncate">
                    <div className="truncate text-[15px] font-semibold text-foreground">
                      {def.label}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {def.pesName}
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "font-display text-xl font-bold tabular-nums",
                      colorInfo.text
                    )}
                  >
                    {val}
                  </span>
                </div>
              </div>

              {/* Progress bar with PES color */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    colorInfo.bg
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* PES Color Scale Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 py-1 text-[12px] text-muted-foreground">
        <span className="font-semibold text-foreground">
          Escala PES:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500" />
          <span className="text-rose-400 font-medium">95-99 Élite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-orange-500" />
          <span className="text-orange-400 font-medium">90-94 Top</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="text-amber-300 font-medium">80-89 Muy Bueno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-300 font-medium">75-79 Bueno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-slate-400" />
          <span className="text-slate-400 font-medium">&lt;75 Normal</span>
        </div>
      </div>
    </div>
  );
}
