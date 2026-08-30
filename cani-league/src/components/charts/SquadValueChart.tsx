"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoneyCompact } from "@/components/charts/LeagueCharts";

export function SquadValueChart() {
  const data = Array.from({ length: 5 }, (_, i) => {
    const week = i + 1;
    const value = Math.round(2_000_000 + Math.random() * 3_000_000);
    return { week, value };
  });

  const config = {
    value: { label: "Valor del plantel", color: "var(--primary)" },
  } as const;

  return (
    <ChartContainer config={config} className="h-[280px] w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => formatMoneyCompact(Number(v))} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
