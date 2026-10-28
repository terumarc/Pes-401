export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedNav, TABLE_SECTIONS } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { LeagueTable } from "@/components/standings/LeagueTable";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { buildLeagueTable, getMatchesByLeague } from "@/lib/data/matches";
import { teamForm } from "@/lib/stats";

export default async function StandingsPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-ink-muted">No hay liga configurada.</p>;
  }

  const [teams, matches] = await Promise.all([
    getTeamsByLeague(league.id),
    getMatchesByLeague(league.id).catch(() => []),
  ]);
  // La misma tabla con la que se reparten los premios al acabar la ida y la liga.
  const rows = buildLeagueTable(teams, matches);
  const forms = Object.fromEntries(teams.map((t) => [t.id, teamForm(matches, t.id)]));

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Tabla" />
      <SegmentedNav label="Secciones de la tabla" items={TABLE_SECTIONS} current="/standings" />
      <LeagueTable rows={rows} forms={forms} />
    </div>
  );
}
