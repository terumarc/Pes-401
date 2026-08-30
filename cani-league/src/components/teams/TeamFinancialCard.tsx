"use client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { BudgetComparisonChart } from "@/components/charts/LeagueCharts";

export function TeamFinancialCard({ team }) {
  const data = [team]; // BudgetComparisonChart expects array of teams
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{team.name}</CardTitle>
        <CardDescription>{team.short_name}</CardDescription>
      </CardHeader>
      <CardContent>
        <BudgetComparisonChart teams={data} />
      </CardContent>
    </Card>
  );
}
