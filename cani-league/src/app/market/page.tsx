export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { MarketCard } from "@/components/market/MarketCard";
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
    return <p className="text-ink-muted">No hay liga configurada.</p>;
  }

  const [players, teams] = await Promise.all([
    getPlayers({ marketOnly: true }),
    getTeamsByLeague(league.id),
  ]);

  const marketPlayers = players.filter((p) =>
    teams.some((t) => t.id === p.team_id),
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Transferencias"
        title="Mercado"
        description={`${marketPlayers.length} jugadores disponibles`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {marketPlayers.map((player) => (
          <MarketCard key={player.id} player={player} teams={teams} />
        ))}
      </div>
      {marketPlayers.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-12 text-center text-sm text-ink-muted">
          No hay jugadores en el mercado. Márcalos desde su ficha.
        </p>
      )}
    </div>
  );
}
