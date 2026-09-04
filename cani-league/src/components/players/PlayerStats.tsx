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
      <div className="rounded-xl border border-line/60 bg-bg-surface/50 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line/40 pb-3">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-subtle uppercase">
            Gráfica de Habilidades
          </span>

          <div className="inline-flex rounded-lg border border-line/70 bg-bg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartMode("radar26")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-all",
                chartMode === "radar26"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              Radar PES (26)
            </button>
            <button
              type="button"
              onClick={() => setChartMode("macro")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-all",
                chartMode === "macro"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              Resumen (7)
            </button>
            <button
              type="button"
              onClick={() => setChartMode("bars")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-all",
                chartMode === "bars"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              Barras
            </button>
          </div>
        </div>

        {chartMode === "radar26" && (
          <div className="py-2">
            <p className="mb-2 text-center text-xs text-ink-subtle">
              Polígono de las 26 estadísticas PES (pasa el cursor por cada eje para ver el valor exacto)
            </p>
            <PlayerRadarChart data={radar26Data} maxHeight={320} />
          </div>
        )}

        {chartMode === "macro" && (
          <div className="py-2">
            <p className="mb-2 text-center text-xs text-ink-subtle">
              Visión general de las 7 habilidades clave
            </p>
            <PlayerRadarChart data={macroData} maxHeight={280} />
          </div>
        )}

        {chartMode === "bars" && (
          <div className="py-2">
            <p className="mb-2 text-center text-xs text-ink-subtle">
              Comparativa de barras coloreadas según el rango oficial PES
            </p>
            <PlayerPesBarChart data={barData} />
          </div>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-subtle uppercase">
            Atributos Detallados ({filteredDefs.length})
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PES_CATEGORIES.map((cat) => {
            const count =
              cat.id === "all"
                ? PES_STAT_DEFINITIONS.length
                : PES_STAT_DEFINITIONS.filter((d) => d.category === cat.id).length;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-line/60 bg-bg-surface/60 text-ink-muted hover:bg-bg-elevated hover:text-ink"
                )}
              >
                {cat.label} ({count})
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
              className="group flex flex-col justify-between rounded-xl border border-line/60 bg-bg-surface/40 p-3 transition-colors hover:border-line hover:bg-bg-surface"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="flex h-5 min-w-8 items-center justify-center rounded bg-line/60 px-1 font-mono text-[10px] font-bold text-ink-muted">
                    {def.shortLabel}
                  </span>
                  <div className="truncate">
                    <div className="truncate text-xs font-semibold text-ink">
                      {def.label}
                    </div>
                    <div className="text-[10px] tracking-wide text-ink-subtle uppercase">
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
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/40">
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
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-line/40 bg-bg-surface/20 px-4 py-2.5 text-[11px] text-ink-subtle">
        <span className="font-semibold uppercase tracking-wider text-ink-muted">
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
