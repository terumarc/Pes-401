export const dynamic = "force-dynamic";
import { FinancesPanel } from "@/components/finances/FinancesPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function FinancesPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-ink-muted">No hay liga configurada.</p>;
  }

  const teams = await getTeamsByLeague(league.id);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Economía"
        title="Finanzas"
        description="Presupuestos editables. Barras relativas al máximo."
      />
      <FinancesPanel teams={teams} />
    </div>
  );
}
