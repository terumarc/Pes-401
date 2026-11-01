export const dynamic = "force-dynamic";

import { FinancesPanel } from "@/components/finances/FinancesPanel";
import { ExpiredContracts, RenewalsEditor } from "@/components/finances/ContractSections";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedNav, TEAM_SECTIONS } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { getExpiredContracts, getRenewalTable } from "@/lib/data/contracts";
import { getPrimaryLeague, getTeamsWithStandings } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function FinancesPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const league = await getPrimaryLeague();
  if (!league) return <p className="text-muted-foreground">No hay ninguna liga configurada.</p>;

  const [teams, renewals, expired] = await Promise.all([
    getTeamsWithStandings(league.id),
    getRenewalTable(league.id),
    getExpiredContracts(league.id).catch(() => []),
  ]);

  // Contratos acabados sin renovar de cada club.
  const expiredByTeam: Record<string, number> = {};
  for (const e of expired) expiredByTeam[e.teamId] = (expiredByTeam[e.teamId] ?? 0) + 1;

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Equipos" />
      <SegmentedNav label="Secciones de equipos" items={TEAM_SECTIONS} current="/finances" />
      <FinancesPanel
        teams={teams}
        expiredByTeam={expiredByTeam}
        extra={
          <>
            <ExpiredContracts rows={expired} />
            <RenewalsEditor leagueId={league.id} initial={renewals} />
          </>
        }
      />
    </div>
  );
}
