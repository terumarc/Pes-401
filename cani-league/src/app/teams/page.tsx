export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { TeamDirectory } from "@/components/teams/TeamDirectory";
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
    <div className="animate-fade-up space-y-8 pb-12">
      <PageHeader
        eyebrow="Clubes de la Liga"
        title="Equipos"
        description={`${teams.length} clubes compitiendo en ${league.name} · Temporada ${league.season}`}
      />

      {/* DIRECTORIO Y BUSCADOR INTERACTIVO */}
      <TeamDirectory teams={teams} />
    </div>
  );
}
