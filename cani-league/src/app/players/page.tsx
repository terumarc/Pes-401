
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayersPageClient } from "@/components/players/PlayersPageClient";
import Link from "next/link";

import { getPlayers, getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    new?: string;
    team?: string;
    edit?: string;
    q?: string;
  }>;
};

export default async function PlayersPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-ink-muted">No hay liga configurada.</p>;
  }

  const [players, teams] = await Promise.all([
    getPlayers(),
    getTeamsByLeague(league.id),
  ]);

  const leaguePlayers = players.filter((p: any) =>
    teams.some((t: any) => t.id === p.team_id)
  );

  const searchQuery = params.q?.toLowerCase() ?? "";
  const filteredPlayers = leaguePlayers.filter(
    (p: any) =>
      p.name.toLowerCase().includes(searchQuery) ||
      (p.position?.toLowerCase().includes(searchQuery) ?? false)
  );

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      <PageHeader
        eyebrow="Plantilla global"
        title="Jugadores"
        description={`${filteredPlayers.length} jugadores registrados`}
        actions={
          <>
            <form method="GET" className="flex items-center gap-2">
              <Input
                name="q"
                placeholder="Buscar jugador…"
                defaultValue={searchQuery}
                className="mr-2 w-64"
              />
              <Button asChild>
                <Link href="/players?new=1">Nuevo jugador</Link>
              </Button>
            </form>
          </>
        }
      />

      <PlayersPageClient
        teams={teams}
        showForm={params.new === "1"}
        defaultTeamId={params.team}
      />

      <div className="mt-6 grid gap-3">
        {filteredPlayers.map((player: any) => (
          <PlayerCard
            key={player.id}
            player={player}
            href={`/players/${player.id}`}
          />
        ))}
        {filteredPlayers.length === 0 && (
          <p className="rounded-2xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            No hay jugadores que coincidan con la búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}
