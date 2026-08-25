"use client";

import { STAT_LABELS, type StatKey } from "@/constants";
import { PlayerRadarChart } from "@/components/charts/LeagueCharts";
import { Progress } from "@/components/ui/progress";
import { formatStat, getStatBarWidth } from "@/lib/format/stats";
import type { Player } from "@/types";

type PlayerStatsProps = {
  player: Player;
};

export function PlayerStats({ player }: PlayerStatsProps) {
  const radarData = STAT_LABELS.map(({ key, label }) => ({
    stat: label.slice(0, 3).toUpperCase(),
    value: player[key as StatKey] ?? 0,
    fullMark: 100,
  }));

  const hasAnyStat = STAT_LABELS.some(
    ({ key }) => player[key as StatKey] !== null && player[key as StatKey] !== undefined,
  );

  return (
    <div className="space-y-8">
      {hasAnyStat && (
        <div>
          <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Perfil
          </p>
          <PlayerRadarChart data={radarData} />
        </div>
      )}

      <div className="space-y-4">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Detalle
        </p>
        {STAT_LABELS.map(({ key, label }, index) => {
          const value = player[key as StatKey];
          const width = getStatBarWidth(value);
          return (
            <div
              key={key}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  {label}
                </span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  {formatStat(value)}
                </span>
              </div>
              <Progress value={width} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
