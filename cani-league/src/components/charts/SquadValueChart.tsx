"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoneyCompact } from "@/components/charts/LeagueCharts";

export function SquadValueChart({
  teams = [],
}: {
  teams?: Array<{ name: string; short_name?: string | null; squad_value?: number }>;
}) {
  const data = teams.map((t) => ({
    team: t.short_name || t.name,
    value: t.squad_value || 0,
  }));

  const config = {
    value: { label: "Valor del plantel", color: "var(--primary)" },
  } as const;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 sm:p-5 backdrop-blur-md shadow-xs">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"
        aria-hidden="true"
      />
      <div className="mb-4">
        <h4 className="font-display text-base font-bold text-foreground">Valor de Plantilla por Club</h4>
        <p className="text-xs text-muted-foreground mt-0.5">Tasación de mercado acumulada según los tiers de los jugadores</p>
      </div>
      <ChartContainer config={config} className="h-[250px] w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="team" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toLocaleString("es-ES")} €`} />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
