export const dynamic = "force-dynamic";

import { Shield, Users, Wallet, Trophy, Coins } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { TeamDirectory } from "@/components/teams/TeamDirectory";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import {
  getPrimaryLeague,
  getTeamsWithStandings,
} from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function TeamsPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-ink-muted">No hay liga configurada.</p>;
  }

  const teams = await getTeamsWithStandings(league.id);
  const totalBudget = teams.reduce((sum, t) => sum + (t.budget || 0), 0);
  const totalPlayers = teams.reduce((sum, t) => sum + (t.player_count || 0), 0);
  const totalSquadValue = teams.reduce((sum, t) => sum + (t.squad_value || 0), 0);
  const avgTeamBudget = teams.length > 0 ? Math.round(totalBudget / teams.length) : 0;

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      <PageHeader
        eyebrow="Clubes de la Liga"
        title="Equipos"
        description={`${teams.length} clubes compitiendo en ${league.name} · Temporada ${league.season}`}
      />

      {/* KPI STATS CARDS - STRIPE POLISH */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* TOTAL CLUBES */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md shadow-xs transition-all hover:border-white/[0.18] hover:bg-card/85">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Shield className="size-3.5" />
            </div>
            <span>Total Clubes</span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-foreground tabular-nums">
            {teams.length}{" "}
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              clubes
            </span>
          </p>
        </div>

        {/* FUTBOLISTAS */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md shadow-xs transition-all hover:border-white/[0.18] hover:bg-card/85">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Users className="size-3.5" />
            </div>
            <span>Futbolistas</span>
          </div>
          <p className="mt-2 font-display text-2xl font-black text-foreground tabular-nums">
            {totalPlayers}{" "}
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              en liga
            </span>
          </p>
        </div>

        {/* DINERO TOTAL */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md shadow-xs transition-all hover:border-white/[0.18] hover:bg-card/85">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wallet className="size-3.5" />
            </div>
            <span>Dinero Total</span>
          </div>
          <div className="mt-2 font-display text-xl font-black text-foreground sm:text-2xl tabular-nums">
            <BudgetDisplay amount={totalBudget} size="sm" />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Medio: <BudgetDisplay amount={avgTeamBudget} size="sm" />
          </p>
        </div>

        {/* VALOR DE MERCADO TOTAL */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 backdrop-blur-md shadow-xs transition-all hover:border-white/[0.18] hover:bg-card/85">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Coins className="size-3.5" />
            </div>
            <span>Valor Mercado</span>
          </div>
          <div className="mt-2 font-display text-xl font-black text-foreground sm:text-2xl tabular-nums">
            <BudgetDisplay amount={totalSquadValue} size="sm" />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Suma de plantillas de la liga
          </p>
        </div>
      </div>

      {/* DIRECTORIO Y BUSCADOR INTERACTIVO */}
      <TeamDirectory teams={teams} />
    </div>
  );
}
