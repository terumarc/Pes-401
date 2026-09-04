export const dynamic = "force-dynamic";
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
    getPlayers(),
    getTeamsByLeague(league.id),
  ]);

  // Equipos compradores elegibles (equipos reales de la liga)
  const buyerTeams = teams.filter(
    (t) =>
      !t.name.toLowerCase().includes("libre") &&
      !t.name.toLowerCase().includes("sin equipo")
  );

  return (
    <div className="animate-fade-up space-y-6 pb-12">
      <PageHeader
        eyebrow="Transferencias y Fichajes"
        title="Mercado de Jugadores"
        description={`${players.length.toLocaleString()} jugadores disponibles (cláusulas de rescisión y agentes libres)`}
      />

      <MarketSearchList players={players} teams={buyerTeams} />
    </div>
  );
}
