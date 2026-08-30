export const dynamic = "force-dynamic";
import { Shield, Users, Wallet, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { TeamCard } from "@/components/teams/TeamCard";
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
  const avgTeamBudget = teams.length > 0 ? Math.round(totalBudget / teams.length) : 0;

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      <PageHeader
        eyebrow="Clubes de la Liga"
        title="Equipos"
        description={`${teams.length} clubes compitiendo en ${league.name} · Temporada ${league.season}`}
      />

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <Shield className="size-3.5 text-primary" />
            Total Clubes
          </div>
          <p className="mt-1 font-display text-2xl font-extrabold text-foreground">
            {teams.length} <span className="text-sm font-medium text-muted-foreground">equipos</span>
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <Users className="size-3.5 text-primary" />
            Futbolistas
          </div>
          <p className="mt-1 font-display text-2xl font-extrabold text-foreground">
            {totalPlayers} <span className="text-sm font-medium text-muted-foreground">en liga</span>
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <Wallet className="size-3.5 text-primary" />
            Dinero Total
          </div>
          <p className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">
            <BudgetDisplay amount={totalBudget} size="sm" />
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <Trophy className="size-3.5 text-amber-500" />
            Presupuesto Medio
          </div>
          <p className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">
            <BudgetDisplay amount={avgTeamBudget} size="sm" />
          </p>
        </div>
      </div>

      {/* GRID DE EQUIPOS */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <TeamFinancialCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}
