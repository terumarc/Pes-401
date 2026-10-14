export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { GenerateFixturesBtn } from "@/components/league/GenerateFixturesBtn";
import { ResetLeagueBtn } from "@/components/league/ResetLeagueBtn";
import { QuickMatchModal } from "@/components/league/QuickMatchModal";
import { Scoreboard } from "@/components/league/Scoreboard";
import { getMatchesByLeague, buildLeagueTable } from "@/lib/data/matches";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function CalendarPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const league = await getPrimaryLeague();
  if (!league) return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const [allTeams, rawMatches] = await Promise.all([
    getTeamsByLeague(league.id),
    getMatchesByLeague(league.id),
  ]);

  // Fuera los equipos de sistema (Agentes Libres).
  const teams = allTeams.filter(
    (t) => !t.name.toLowerCase().includes("libre") && !t.name.toLowerCase().includes("sin equipo"),
  );
  const matches = rawMatches.filter(
    (m) => teams.some((t) => t.id === m.home_team_id) && teams.some((t) => t.id === m.away_team_id),
  );

  // Balance de cada equipo (G-E-P) para mostrar bajo el escudo.
  const records: Record<string, string> = {};
  for (const row of buildLeagueTable(teams, matches)) {
    records[row.team.id] = `${row.won}-${row.drawn}-${row.lost}`;
  }

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader
        title="Partidos"
        actions={<QuickMatchModal leagueId={league.id} teams={teams} matches={matches} />}
      />

      {matches.length > 0 ? (
        <Scoreboard matches={matches} records={records} />
      ) : (
        <div className="rounded-[22px] bg-card px-6 py-12 text-center">
          <p className="text-[17px] font-semibold">Aún no hay calendario</p>
          <p className="mx-auto mt-1 max-w-xs text-[15px] text-muted-foreground">
            Genera las jornadas de ida y vuelta para empezar a apuntar resultados.
          </p>
        </div>
      )}

      <section aria-label="Calendario" className="mt-10 space-y-2">
        <h2 className="text-[13px] font-medium text-muted-foreground">Calendario</h2>
        <div className="flex flex-wrap gap-2">
          <GenerateFixturesBtn leagueId={league.id} teams={teams} hasExisting={matches.length > 0} />
          <ResetLeagueBtn leagueId={league.id} />
        </div>
      </section>
    </div>
  );
}
