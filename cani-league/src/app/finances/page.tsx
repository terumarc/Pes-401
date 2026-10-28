export const dynamic = "force-dynamic";

import { FinancesPanel } from "@/components/finances/FinancesPanel";
import { LastClosure, SalariesEditor } from "@/components/finances/ContractSections";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedNav, TEAM_SECTIONS } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { getPlayerSalary } from "@/lib/contracts";
import { getLastContractEvents, getSalaryTable } from "@/lib/data/contracts";
import { getLeagueSquads, getPrimaryLeague, getTeamsWithStandings } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function FinancesPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const league = await getPrimaryLeague();
  if (!league) return <p className="text-muted-foreground">No hay ninguna liga configurada.</p>;

  const [teams, players, salaries, events] = await Promise.all([
    getTeamsWithStandings(league.id),
    getLeagueSquads(league.id),
    getSalaryTable(league.id),
    getLastContractEvents(league.id).catch(() => []),
  ]);

  // Lo que paga cada club en sueldos por temporada.
  const salaryByTeam: Record<string, number> = {};
  for (const p of players) {
    if (!p.team_id) continue;
    salaryByTeam[p.team_id] = (salaryByTeam[p.team_id] ?? 0) + getPlayerSalary(p, salaries);
  }

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Equipos" />
      <SegmentedNav label="Secciones de equipos" items={TEAM_SECTIONS} current="/finances" />
      <FinancesPanel
        teams={teams}
        salaryByTeam={salaryByTeam}
        extra={
          <>
            <SalariesEditor leagueId={league.id} initial={salaries} />
            <LastClosure events={events} />
          </>
        }
      />
    </div>
  );
}
