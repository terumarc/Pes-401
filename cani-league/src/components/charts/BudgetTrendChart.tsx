"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoneyCompact } from "@/components/charts/LeagueCharts";

export function BudgetTrendChart({
  teams = [],
}: {
  teams?: Array<{ name: string; short_name?: string | null; budget?: number }>;
}) {
  const data = [...teams]
    .sort((a, b) => (b.budget || 0) - (a.budget || 0))
    .map((t) => ({
      team: t.short_name || t.name,
      budget: t.budget || 0,
    }));

  const config = {
    budget: { label: "Presupuesto", color: "var(--primary)" },
  } as const;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-sm">
      <h4 className="font-display text-sm font-semibold mb-3">Ranking de Presupuesto</h4>
      <ChartContainer config={config} className="h-[250px] w-full">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="team" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="budget" fill="var(--color-budget)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
