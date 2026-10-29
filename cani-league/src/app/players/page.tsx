
export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { Button } from "@/components/ui/button";
import { PlayerBrowser } from "@/components/players/PlayerBrowser";
import { PlayersPageClient } from "@/components/players/PlayersPageClient";
import Link from "next/link";
import { Plus } from "lucide-react";

import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { searchPlayers } from "@/lib/data/player-search";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

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

  const [initial, teams, viewer] = await Promise.all([
    searchPlayers({}),
    getTeamsByLeague(league.id),
    getViewer(),
  ]);
  const isAdmin = !!viewer?.isAdmin;

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader
        title="Jugadores"
        actions={
          isAdmin ? (
            <Button asChild variant="secondary" className="gap-1.5">
              <Link href="/players?new=1">
                <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden /> Nuevo jugador
              </Link>
            </Button>
          ) : undefined
        }
      />

      <PlayersPageClient
        teams={teams}
        showForm={isAdmin && params.new === "1"}
        defaultTeamId={params.team}
      />

      <PlayerBrowser mode="players" initial={initial} teams={teams} />
    </div>
  );
}
