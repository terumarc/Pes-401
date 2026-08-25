export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlayerActions } from "@/components/players/PlayerActions";
import { PlayerAvatar } from "@/components/players/PlayerCard";
import { EditTeamButton } from "@/components/teams/EditTeamButton";
import { TeamLogo } from "@/components/teams/TeamCard";
import {
  getPlayers,
  getPrimaryLeague,
  getTeamById,
  getTeamsByLeague,
} from "@/lib/data/league";
import { formatStat } from "@/lib/format/stats";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TeamDetailPage({ params }: Props) {
  if (!isSupabaseConfigured()) {
    return <p className="text-ink-muted">Configura Supabase primero.</p>;
  }

  const { id } = await params;
  const team = await getTeamById(id);
  if (!team) notFound();

  const league = await getPrimaryLeague();
  const [players, teams] = await Promise.all([
    getPlayers({ teamId: team.id }),
    league ? getTeamsByLeague(league.id) : Promise.resolve([]),
  ]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Equipo"
        title={team.name}
        description={team.owner_name?.trim() || "Sin propietario"}
        actions={<EditTeamButton team={team} />}
      />

      <section className="mb-10 flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-bg-elevated p-6 shadow-[var(--shadow-soft)]">
        <TeamLogo
          name={team.name}
          logoUrl={team.logo_url}
          color={team.primary_color}
          size="lg"
        />
        <div>
          <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
            {team.short_name}
          </p>
          <p className="mt-1 text-sm text-ink-muted">Presupuesto</p>
          <BudgetDisplay amount={team.budget} size="lg" />
        </div>
        <div
          className="ml-auto hidden h-16 w-16 rounded-2xl sm:block"
          style={{ backgroundColor: team.primary_color }}
          aria-hidden
        />
      </section>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Plantilla
        </h2>
        <Link
          href={`/players?new=1&team=${team.id}`}
          className="rounded-xl border border-line px-3 py-2 text-xs font-medium hover:bg-bg-elevated"
        >
          Añadir jugador
        </Link>
      </div>

      <ul className="space-y-3">
        {players.map((player) => (
          <li
            key={player.id}
            className="rounded-2xl border border-line bg-bg-elevated p-4 shadow-[var(--shadow-soft)]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <PlayerAvatar
                  name={player.name}
                  photoUrl={player.photo_url}
                />
                <div className="min-w-0">
                  <p className="truncate font-display font-semibold">
                    {player.name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {player.position} · OVR {formatStat(player.overall)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-subtle">
                    <span>
                      Valor <BudgetDisplay amount={player.market_value} size="sm" />
                    </span>
                    <span>
                      Fichaje{" "}
                      <BudgetDisplay amount={player.transfer_price} size="sm" />
                    </span>
                  </div>
                </div>
              </div>
              <PlayerActions
                playerId={player.id}
                availableInMarket={player.available_in_market}
                teams={teams}
                currentTeamId={player.team_id}
              />
            </div>
          </li>
        ))}
        {players.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line-strong px-5 py-10 text-center text-sm text-ink-muted">
            Sin jugadores todavía.
          </li>
        )}
      </ul>
    </div>
  );
}
