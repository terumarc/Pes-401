export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { MarketSearchList } from "@/components/market/MarketSearchList";
import { StatStrip } from "@/components/fantasy/primitives";
import {
  getPlayers,
  getPrimaryLeague,
  getTeamsByLeague,
} from "@/lib/data/league";
import { getPlayerFixedPrice } from "@/lib/players";
import { formatMoney } from "@/lib/format/money";
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

  // Estadísticas del Mercado
  const freeAgentsCount = players.filter(
    (p) =>
      !p.team_id ||
      p.team?.name?.toLowerCase().includes("libre") ||
      p.team?.name?.toLowerCase().includes("sin equipo")
  ).length;

  const clausePlayersCount = players.length - freeAgentsCount;

  const totalValue = players.reduce((acc, p) => acc + getPlayerFixedPrice(p), 0);
  const avgValue = players.length > 0 ? Math.round(totalValue / players.length) : 0;

  return (
    <div className="animate-fade-up space-y-5 pb-12">
      <PageHeader
        eyebrow="Transferencias"
        title="Mercado"
        description="Ficha agentes libres al momento o paga la cláusula de un jugador de otro club."
      />

      <StatStrip
        items={[
          { label: "En el mercado", value: players.length.toLocaleString("es-ES") },
          { label: "Agentes libres", value: freeAgentsCount.toLocaleString("es-ES"), hint: "Fichaje directo" },
          { label: "Con cláusula", value: clausePlayersCount.toLocaleString("es-ES"), hint: "De otros clubes" },
          { label: "Precio medio", value: formatMoney(avgValue) },
        ]}
      />

      <MarketSearchList players={players} teams={buyerTeams} />
    </div>
  );
}
