
export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { Button } from "@/components/ui/button";
import { PlayerBrowser } from "@/components/players/PlayerBrowser";
import { PlayersPageClient } from "@/components/players/PlayersPageClient";
import Link from "next/link";
import { Plus } from "lucide-react";

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
    <div className="animate-fade-up pb-12">
      <PageHeader
        title="Jugadores"
        actions={
          <Button asChild variant="secondary" className="gap-1.5">
            <Link href="/players?new=1">
              <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden /> Nuevo jugador
            </Link>
          </Button>
        }
      />

      <PlayersPageClient
        teams={teams}
        showForm={params.new === "1"}
        defaultTeamId={params.team}
      />

      <PlayerBrowser mode="players" players={players} teams={teams} />
    </div>
  );
}
