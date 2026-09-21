export const dynamic = "force-dynamic";

import { FinancesPanel } from "@/components/finances/FinancesPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { getPrimaryLeague, getTeamsWithStandings } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { BudgetTrendChart } from "@/components/charts/BudgetTrendChart";
import { SquadValueChart } from "@/components/charts/SquadValueChart";
import { formatMoney } from "@/lib/format/money";
import { Wallet, TrendingUp, Coins, Shield } from "lucide-react";

export default async function FinancesPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
        No hay ninguna liga configurada.
      </div>
    );
  }

  const teams = await getTeamsWithStandings(league.id);

  const totalBudget = teams.reduce((acc, t) => acc + (t.budget || 0), 0);
  const avgBudget = teams.length > 0 ? Math.round(totalBudget / teams.length) : 0;
  const totalSquadValue = teams.reduce((acc, t) => acc + (t.squad_value || 0), 0);
  const topBudgetTeam = [...teams].sort((a, b) => b.budget - a.budget)[0];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Control Económico"
        title="Finanzas y Presupuestos"
        description="Gestión de tesorería, límites salariales, valor patrimonial de las plantillas y normativa de premios de liga."
      />

      {/* EXECUTIVE FINANCIAL KPIS BAR */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Total Budget */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md transition-all hover:border-white/20 shadow-xs">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Masa Presupuestaria</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="size-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-display font-extrabold tracking-tight text-foreground tabular-nums">
            {formatMoney(totalBudget)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Límite salarial total de {teams.length} clubes
          </p>
        </div>

        {/* Average Budget */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md transition-all hover:border-white/20 shadow-xs">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Presupuesto Promedio</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <TrendingUp className="size-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-display font-extrabold tracking-tight text-foreground tabular-nums">
            {formatMoney(avgBudget)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Media de tesorería por club
          </p>
        </div>

        {/* Squad Value */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md transition-all hover:border-white/20 shadow-xs">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Valor de Plantillas</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Coins className="size-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-display font-extrabold tracking-tight text-foreground tabular-nums">
            {formatMoney(totalSquadValue)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tasación fija por tiers de jugadores
          </p>
        </div>

        {/* Leader in Budget */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md transition-all hover:border-white/20 shadow-xs">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Líder Financiero</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Shield className="size-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 truncate text-base sm:text-lg font-display font-bold text-foreground">
            {topBudgetTeam ? topBudgetTeam.name : "—"}
          </div>
          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground tabular-nums">
            {topBudgetTeam ? `${formatMoney(topBudgetTeam.budget)} en caja` : "—"}
          </p>
        </div>
      </div>

      {/* FINANCES MAIN PANEL */}
      <FinancesPanel teams={teams} />

      {/* ECONOMIC ANALYTICS CHARTS */}
      <div className="grid gap-6 md:grid-cols-2">
        <BudgetTrendChart teams={teams} />
        <SquadValueChart teams={teams} />
      </div>
    </div>
  );
}
