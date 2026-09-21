"use client";

import { BudgetComparisonChart } from "@/components/charts/LeagueCharts";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { ArrowUpRight, TrendingUp, ShieldAlert, Award } from "lucide-react";
import type { StandingWithTeam } from "@/types";

export function DashboardBudgetChart({
  standings,
}: {
  standings: StandingWithTeam[];
}) {
  const sortedByBudget = [...standings].sort(
    (a, b) => b.team.budget - a.team.budget
  );
  const highest = sortedByBudget[0];
  const lowest = sortedByBudget[sortedByBudget.length - 1];
  const total = standings.reduce((sum, s) => sum + s.team.budget, 0);
  const average = standings.length > 0 ? Math.round(total / standings.length) : 0;

  return (
    <div className="space-y-4">
      {/* Financial Health Mini Summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Award className="size-3 text-amber-400" /> Mayor Masa
          </span>
          <p className="mt-1 truncate font-semibold text-foreground">
            {highest ? highest.team.short_name || highest.team.name : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {highest ? <BudgetDisplay amount={highest.team.budget} size="sm" /> : null}
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="size-3 text-emerald-400" /> Promedio Club
          </span>
          <p className="mt-1 font-semibold text-foreground">
            <BudgetDisplay amount={average} size="sm" />
          </p>
          <p className="text-[10px] text-muted-foreground">Límite medio</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <ShieldAlert className="size-3 text-blue-400" /> Menor Masa
          </span>
          <p className="mt-1 truncate font-semibold text-foreground">
            {lowest ? lowest.team.short_name || lowest.team.name : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {lowest ? <BudgetDisplay amount={lowest.team.budget} size="sm" /> : null}
          </p>
        </div>
      </div>

      {/* Chart container */}
      <div className="pt-2">
        <BudgetComparisonChart
          teams={standings.map((s) => ({
            name: s.team.name,
            short_name: s.team.short_name,
            budget: s.team.budget,
            color: s.team.primary_color,
          }))}
        />
      </div>
    </div>
  );
}
