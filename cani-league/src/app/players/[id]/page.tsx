export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlayerActions } from "@/components/players/PlayerActions";
import { PlayerAvatar } from "@/components/players/PlayerCard";
import { PlayerForm } from "@/components/players/PlayerForm";
import { PlayerStats } from "@/components/players/PlayerStats";
import {
  getPlayerById,
  getPrimaryLeague,
  getTeamsByLeague,
} from "@/lib/data/league";
import { formatStat } from "@/lib/format/stats";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function PlayerDetailPage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured()) {
    return <p className="text-ink-muted">Configura Supabase primero.</p>;
  }

  const { id } = await params;
  const { edit } = await searchParams;
  const player = await getPlayerById(id);
  if (!player) notFound();

  const league = await getPrimaryLeague();
  const teams = league ? await getTeamsByLeague(league.id) : [];

  if (edit === "1") {
    return (
      <div className="animate-fade-up mx-auto max-w-2xl rounded-2xl border border-line bg-bg-elevated p-5 shadow-[var(--shadow-soft)] sm:p-8">
        <PlayerForm teams={teams} player={player} />
        <Link
          href={`/players/${player.id}`}
          className="mt-4 inline-block text-sm text-ink-muted hover:text-ink"
        >
          Cancelar
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={player.team.name}
        title={player.name}
        description={`${player.position}${player.age ? ` · ${player.age} años` : ""}${player.nationality ? ` · ${player.nationality}` : ""}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-line bg-bg-elevated p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-start gap-4">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photo_url}
              size="lg"
            />
            <div>
              <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
                Overall
              </p>
              <p className="font-display text-5xl font-semibold tabular-nums">
                {formatStat(player.overall)}
              </p>
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Equipo</dt>
              <dd>
                <Link href={`/teams/${player.team.id}`} className="hover:underline">
                  {player.team.name}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Valor</dt>
              <dd>
                <BudgetDisplay amount={player.market_value} size="sm" />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Precio de fichaje</dt>
              <dd>
                <BudgetDisplay amount={player.transfer_price} size="sm" />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Mercado</dt>
              <dd>
                {player.available_in_market ? "Disponible" : "No listado"}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <PlayerActions
              playerId={player.id}
              availableInMarket={player.available_in_market}
              teams={teams}
              currentTeamId={player.team_id}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-bg-elevated p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">
            Estadísticas
          </h2>
          <PlayerStats player={player} />
        </section>
      </div>
    </div>
  );
}
