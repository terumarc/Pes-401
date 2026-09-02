export const revalidate = 60;
import { PageHeader } from "@/components/layout/PageHeader";
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
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={league.name}
        title="Clasificación"
        description="Orden manual. Arrastra para cambiar posiciones."
      />
      <StandingsList
        key={standings.map((s) => `${s.team_id}:${s.position}`).join("|")}
        leagueId={league.id}
        initialItems={standings}
      />
    </div>
  );
}
