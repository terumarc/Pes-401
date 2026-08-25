"use client";

import { BudgetComparisonChart } from "@/components/charts/LeagueCharts";
import type { StandingWithTeam } from "@/types";

export function DashboardBudgetChart({
  standings,
}: {
  standings: StandingWithTeam[];
}) {
  return (
    <BudgetComparisonChart
      teams={standings.map((s) => ({
        name: s.team.name,
        short_name: s.team.short_name,
        budget: s.team.budget,
        color: s.team.primary_color,
      }))}
    />
  );
}
