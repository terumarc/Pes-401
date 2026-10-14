export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedNav, TABLE_SECTIONS } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { StandingsList } from "@/components/standings/StandingsList";
import {
  getPrimaryLeague,
  getStandingsWithTeams,
} from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function StandingsPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-ink-muted">No hay liga configurada.</p>;
  }

  const standings = await getStandingsWithTeams(league.id);

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Tabla" />
      <SegmentedNav label="Secciones de la tabla" items={TABLE_SECTIONS} current="/standings" />
      <StandingsList
        key={standings.map((s) => `${s.team_id}:${s.position}`).join("|")}
        leagueId={league.id}
        initialItems={standings}
      />
    </div>
  );
}
