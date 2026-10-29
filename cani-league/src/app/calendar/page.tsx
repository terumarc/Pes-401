export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { MATCH_SECTIONS, SegmentedNav } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { GenerateFixturesBtn } from "@/components/league/GenerateFixturesBtn";
import { ResetLeagueBtn } from "@/components/league/ResetLeagueBtn";
import { QuickMatchModal } from "@/components/league/QuickMatchModal";
import { Scoreboard, type Roster } from "@/components/league/Scoreboard";
import { getAllPlayedMatches, getGoals } from "@/lib/data/stats";
import type { GoalRow } from "@/lib/stats";
import { getMatchesByLeague, buildLeagueTable } from "@/lib/data/matches";
import { getLeagueSquads, getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export default async function CalendarPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const [league, viewer] = await Promise.all([getPrimaryLeague(), getViewer()]);
  if (!league) return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const [allTeams, rawMatches, players, goals, history] = await Promise.all([
    getTeamsByLeague(league.id),
    getMatchesByLeague(league.id),
    getLeagueSquads(league.id),
    getGoals(league.id, league.season),
    getAllPlayedMatches(league.id),
  ]);

  // Fuera los equipos de sistema (Agentes Libres).
  const teams = allTeams.filter(
    (t) => !t.name.toLowerCase().includes("libre") && !t.name.toLowerCase().includes("sin equipo"),
  );
  const matches = rawMatches.filter(
    (m) => teams.some((t) => t.id === m.home_team_id) && teams.some((t) => t.id === m.away_team_id),
  );

  // Plantillas (para elegir goleadores), goles ya apuntados por partido y nombres cortos.
  const rosters: Record<string, Roster> = {};
  for (const p of players) {
    if (!p.team_id) continue;
    (rosters[p.team_id] ??= []).push({ id: p.id, name: p.name });
  }
  for (const list of Object.values(rosters)) list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  const goalsByMatch: Record<string, GoalRow[]> = {};
  for (const g of goals) if (g.match_id) (goalsByMatch[g.match_id] ??= []).push(g);
  const teamNames = Object.fromEntries(allTeams.map((t) => [t.id, t.short_name || t.name]));

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
      <SegmentedNav label="Competiciones" items={MATCH_SECTIONS} current="/calendar" />

      {matches.length > 0 ? (
        <Scoreboard matches={matches} records={records} extras={{ rosters, goals: goalsByMatch, history, teamNames }} />
      ) : (
        <div className="rounded-[22px] bg-card px-6 py-12 text-center">
          <p className="text-[length:min(1rem,25.5px)] font-semibold">Aún no hay calendario</p>
          <p className="mx-auto mt-1 max-w-xs text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
            Genera las jornadas de ida y vuelta para empezar a apuntar resultados.
          </p>
        </div>
      )}

      {viewer?.isAdmin && (
        <section aria-label="Calendario" className="mt-10 space-y-2">
          <h2 className="text-[length:min(0.7647rem,19.5px)] font-medium text-muted-foreground">Calendario · admin</h2>
          <div className="flex flex-wrap gap-2">
            <GenerateFixturesBtn leagueId={league.id} teams={teams} hasExisting={matches.length > 0} />
            <ResetLeagueBtn leagueId={league.id} />
          </div>
        </section>
      )}
    </div>
  );
}
