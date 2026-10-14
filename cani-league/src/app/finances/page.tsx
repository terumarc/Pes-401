export const dynamic = "force-dynamic";

import { FinancesPanel } from "@/components/finances/FinancesPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { getPrimaryLeague, getTeamsWithStandings } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { BudgetTrendChart } from "@/components/charts/BudgetTrendChart";
import { SquadValueChart } from "@/components/charts/SquadValueChart";

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


  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Control Económico"
        title="Finanzas y Presupuestos"
        description="Gestión de tesorería, límites salariales, valor patrimonial de las plantillas y normativa de premios de liga."
      />

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
