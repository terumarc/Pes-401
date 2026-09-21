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
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 sm:p-5 backdrop-blur-md shadow-xs">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden="true"
      />
      <div className="mb-4">
        <h4 className="font-display text-base font-bold text-foreground">Ranking de Presupuesto</h4>
        <p className="text-xs text-muted-foreground mt-0.5">Capacidad económica y tesorería disponible por club</p>
      </div>
      <ChartContainer config={config} className="h-[250px] w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="team" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toLocaleString("es-ES")} €`} />} />
            <Bar dataKey="budget" fill="var(--color-budget)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
