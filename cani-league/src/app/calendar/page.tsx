export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { LeagueTable } from "@/components/league/LeagueTable";
import { GenerateFixturesBtn } from "@/components/league/GenerateFixturesBtn";
import { ResetLeagueBtn } from "@/components/league/ResetLeagueBtn";
import { QuickMatchModal } from "@/components/league/QuickMatchModal";
import { TeamFixturesView } from "@/components/league/TeamFixturesView";
import {
  getMatchesByLeague,
  buildLeagueTable,
} from "@/lib/data/matches";
import {
  getPrimaryLeague,
  getTeamsByLeague,
} from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function CalendarPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const league = await getPrimaryLeague();
  if (!league)
    return <p className="text-ink-muted">No hay liga configurada.</p>;

  const [teams, matches] = await Promise.all([
    getTeamsByLeague(league.id),
    getMatchesByLeague(league.id),
  ]);

  const tableRows = buildLeagueTable(teams, matches);
  const hasFixtures = matches.length > 0;
  const playedCount = matches.filter((m) => m.played).length;
  const totalMatches = matches.length;
  const progressPct = totalMatches > 0 ? Math.round((playedCount / totalMatches) * 100) : 0;

  return (
    <div className="animate-fade-up space-y-10">
      <PageHeader
        eyebrow={`${league.name} · ${league.season}`}
        title="Partidos de Liga"
        description={
          hasFixtures
            ? `${playedCount} de ${totalMatches} partidos jugados (${progressPct}% completado)`
            : "Genera el cuadro de enfrentamientos para empezar"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <QuickMatchModal
              leagueId={league.id}
              teams={teams}
              matches={matches}
            />
            <ResetLeagueBtn leagueId={league.id} />
            {!hasFixtures && (
              <GenerateFixturesBtn leagueId={league.id} teams={teams} />
            )}
          </div>
        }
      />

      {/* Clasificación en vivo */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Tabla de Clasificación
          </h2>
          <span className="text-xs text-muted-foreground">
            3 pts victoria · 1 pt empate
          </span>
        </div>
        <LeagueTable rows={tableRows} />
      </section>

      {/* Enfrentamientos por Equipos */}
      {hasFixtures && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-t border-border/50 pt-6">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Enfrentamientos entre Equipos
              </h2>
              <p className="text-xs text-muted-foreground">
                Toca cualquier equipo para ver sus partidos pendientes o anota el resultado directamente.
              </p>
            </div>
          </div>

          <TeamFixturesView teams={teams} matches={matches} />
        </section>
      )}
    </div>
  );
}
