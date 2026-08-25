"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/format/money";

export function formatMoneyCompact(amountEuros: number): string {
  const n = Math.trunc(amountEuros);
  if (Math.abs(n) >= 1_000_000) {
    const m = n / 1_000_000;
    return `€${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `€${Math.round(n / 1_000)}K`;
  }
  return formatMoney(n);
}

export function PlayerRadarChart({
  data,
}: {
  data: { stat: string; value: number; fullMark: number }[];
}) {
  const config = {
    value: { label: "Stat", color: "var(--primary)" },
  } satisfies ChartConfig;

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Sin estadísticas para graficar
      </p>
    );
  }

  return (
    <ChartContainer
      config={config}
      className="mx-auto aspect-square max-h-[280px] w-full"
      initialDimension={{ width: 280, height: 280 }}
    >
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="stat"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Radar
          dataKey="value"
          fill="var(--color-value)"
          fillOpacity={0.35}
          stroke="var(--color-value)"
          strokeWidth={2}
        />
      </RadarChart>
    </ChartContainer>
  );
}

export function BudgetComparisonChart({
  teams,
}: {
  teams: { name: string; short_name: string; budget: number; color: string }[];
}) {
  const config = {
    budget: { label: "Presupuesto", color: "var(--primary)" },
  } satisfies ChartConfig;

  const data = [...teams]
    .sort((a, b) => b.budget - a.budget)
    .map((t) => ({
      name: t.short_name || t.name.slice(0, 3).toUpperCase(),
      fullName: t.name,
      budget: t.budget,
      fill: t.color,
    }));

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[260px] w-full"
      initialDimension={{ width: 480, height: 260 }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickFormatter={(v) => formatMoneyCompact(Number(v))}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={48}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                String(payload?.[0]?.payload?.fullName ?? "")
              }
              formatter={(value) => formatMoney(Number(value))}
            />
          }
        />
        <Bar dataKey="budget" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.fullName} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function MarketPriceChart({
  players,
}: {
  players: {
    name: string;
    transfer_price: number;
    market_value: number;
  }[];
}) {
  const config = {
    transfer_price: { label: "Precio fichaje", color: "var(--primary)" },
    market_value: { label: "Valor mercado", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const data = [...players]
    .sort((a, b) => b.transfer_price - a.transfer_price)
    .slice(0, 8)
    .map((p) => ({
      name: p.name.split(" ").slice(-1)[0] ?? p.name,
      fullName: p.name,
      transfer_price: p.transfer_price,
      market_value: p.market_value,
    }));

  if (data.length === 0) return null;

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[280px] w-full"
      initialDimension={{ width: 480, height: 280 }}
    >
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v) => formatMoneyCompact(Number(v))}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                String(payload?.[0]?.payload?.fullName ?? "")
              }
              formatter={(value) => formatMoney(Number(value))}
            />
          }
        />
        <Bar
          dataKey="market_value"
          fill="var(--color-market_value)"
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
        <Bar
          dataKey="transfer_price"
          fill="var(--color-transfer_price)"
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function SquadOverallChart({
  players,
}: {
  players: { name: string; overall: number | null; position: string }[];
}) {
  const config = {
    overall: { label: "Overall", color: "var(--primary)" },
  } satisfies ChartConfig;

  const data = [...players]
    .filter((p) => p.overall !== null)
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
    .map((p) => ({
      name: p.name.split(" ").slice(-1)[0] ?? p.name,
      fullName: p.name,
      overall: p.overall ?? 0,
      position: p.position,
    }));

  if (data.length === 0) return null;

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[240px] w-full"
      initialDimension={{ width: 480, height: 240 }}
    >
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as
                  | { fullName?: string; position?: string }
                  | undefined;
                return row
                  ? `${row.fullName ?? ""} · ${row.position ?? ""}`
                  : "";
              }}
            />
          }
        />
        <Bar
          dataKey="overall"
          fill="var(--color-overall)"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ChartContainer>
  );
}
