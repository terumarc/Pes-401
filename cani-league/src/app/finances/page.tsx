export const dynamic = "force-dynamic";

import { FinancesPanel } from "@/components/finances/FinancesPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedNav, TEAM_SECTIONS } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { getPrimaryLeague, getTeamsWithStandings } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function FinancesPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const league = await getPrimaryLeague();
  if (!league) return <p className="text-muted-foreground">No hay ninguna liga configurada.</p>;

  const teams = await getTeamsWithStandings(league.id);

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Equipos" />
      <SegmentedNav label="Secciones de equipos" items={TEAM_SECTIONS} current="/finances" />
      <FinancesPanel teams={teams} />
    </div>
  );
}
