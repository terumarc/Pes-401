export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { ClubCards } from "@/components/teams/ClubCards";
import { SegmentedNav, TEAM_SECTIONS } from "@/components/layout/SegmentedNav";
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

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Equipos" />
      <SegmentedNav label="Secciones de equipos" items={TEAM_SECTIONS} current="/teams" />
      <ClubCards teams={teams} />
    </div>
  );
}
