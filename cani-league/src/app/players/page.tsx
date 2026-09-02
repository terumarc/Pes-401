
export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { Button } from "@/components/ui/button";
import { PlayerList } from "@/components/players/PlayerList";
import { PlayersPageClient } from "@/components/players/PlayersPageClient";
import Link from "next/link";
import { UserPlus } from "lucide-react";

import { getPlayers, getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    new?: string;
    team?: string;
    edit?: string;
  }>;
};

export default async function PlayersPage({ searchParams }: Props) {
  const params = await searchParams;

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

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      <PageHeader
        eyebrow="Base de datos global"
        title="Jugadores"
        description={`${players.length.toLocaleString()} jugadores registrados en el sistema`}
        actions={
          <Button asChild size="sm" className="gap-2">
            <Link href="/players?new=1">
              <UserPlus className="size-4" /> Nuevo jugador
            </Link>
          </Button>
        }
      />

      <PlayersPageClient
        teams={teams}
        showForm={params.new === "1"}
        defaultTeamId={params.team}
      />

      <PlayerList players={players} teams={teams} />
    </div>
  );
}
