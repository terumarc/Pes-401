export const dynamic = "force-dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayersPageClient } from "@/components/players/PlayersPageClient";
import { Button } from "@/components/ui/button";
import {
  getPlayers,
  getPrimaryLeague,
  getTeamsByLeague,
} from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ new?: string; team?: string; edit?: string }>;
};

export default async function PlayersPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-muted-foreground">No hay liga configurada.</p>;
  }

  const params = await searchParams;
  const [players, teams] = await Promise.all([
    getPlayers(),
    getTeamsByLeague(league.id),
  ]);

  const leaguePlayers = players.filter((p) =>
    teams.some((t) => t.id === p.team_id),
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Plantilla global"
        title="Jugadores"
        description={`${leaguePlayers.length} jugadores registrados`}
        actions={
          <Button asChild>
            <Link href="/players?new=1">Nuevo jugador</Link>
          </Button>
        }
      />

      <PlayersPageClient
        teams={teams}
        showForm={params.new === "1"}
        defaultTeamId={params.team}
      />

      <div className="mt-6 grid gap-3">
        {leaguePlayers.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            href={`/players/${player.id}`}
          />
        ))}
        {leaguePlayers.length === 0 && (
          <p className="rounded-2xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            Aún no hay jugadores. Crea el primero.
          </p>
        )}
      </div>
    </div>
  );
}
