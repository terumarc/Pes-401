export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { TeamCard } from "@/components/teams/TeamCard";
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
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Plantillas"
        title="Equipos"
        description={`${teams.length} equipos en ${league.name}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}
