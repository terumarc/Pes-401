export const revalidate = 60;
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { MarketSearchList } from "@/components/market/MarketSearchList";
import {
  getPlayers,
  getPrimaryLeague,
  getTeamsByLeague,
} from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function MarketPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-muted-foreground">No hay liga configurada.</p>;
  }

  const [players, teams] = await Promise.all([
    getPlayers({ marketOnly: true }),
    getTeamsByLeague(league.id),
  ]);

  const marketPlayers = players.filter((p) =>
    teams.some((t) => t.id === p.team_id),
  );

  return (
    <div className="animate-fade-up space-y-6 pb-12">
      <PageHeader
        eyebrow="Transferencias y Fichajes"
        title="Mercado de Jugadores"
        description={`${marketPlayers.length.toLocaleString()} jugadores transferibles listados en el mercado`}
      />

      <MarketSearchList players={marketPlayers} teams={teams} />
    </div>
  );
}
