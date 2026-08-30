"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoneyCompact } from "@/components/charts/LeagueCharts";

export function BudgetTrendChart() {
  const data = Array.from({ length: 5 }, (_, i) => {
    const week = i + 1;
    const budget = Math.round(1_000_000 + Math.random() * 4_000_000);
    return { week, budget };
  });

  const config = {
    budget: { label: "Presupuesto", color: "var(--primary)" },
  } as const;

  return (
    <ChartContainer config={config} className="h-[280px] w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => formatMoneyCompact(Number(v))} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="budget" stroke="var(--color-budget)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
