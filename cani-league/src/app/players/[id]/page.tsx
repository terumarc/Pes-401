export const revalidate = 60;
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
import { getPlayerTier, getPlayerEffectiveRating, getPlayerContractInfo } from "@/lib/players";
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
  const tierInfo = getPlayerTier(player);
  const mediaValue = getPlayerEffectiveRating(player);
  const contractInfo = getPlayerContractInfo(player);

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

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr]">
        <section className="h-fit rounded-2xl border border-line bg-bg-elevated p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-start gap-4">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photo_url}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
                  Media
                </p>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.color}`}>
                  {tierInfo.tier}
                </span>
              </div>
              <p className="font-display text-5xl font-semibold tabular-nums">
                {formatStat(mediaValue)}
              </p>
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Equipo</dt>
              <dd>
                <Link href={`/teams/${player.team.id}`} className="hover:underline font-medium">
                  {player.team.name}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Precio Fijo (Tier {tierInfo.tier})</dt>
              <dd className="font-semibold text-foreground">
                <BudgetDisplay amount={contractInfo.price} size="sm" />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Duración Contrato</dt>
              <dd className="font-medium text-foreground">
                {contractInfo.durationLabel}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Prima de Renovación</dt>
              <dd className="font-semibold">
                {contractInfo.renewalCost > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    {contractInfo.renewalPercentLabel} · <BudgetDisplay amount={contractInfo.renewalCost} size="sm" />
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Gratis
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Mercado</dt>
              <dd>
                {player.available_in_market ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Disponible</span>
                ) : (
                  <span className="text-ink-muted">No listado</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <PlayerActions
              playerId={player.id}
              availableInMarket={player.available_in_market}
              teams={teams}
              currentTeamId={player.team_id}
              player={player}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-bg-elevated p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Estadísticas PES
            </h2>
            <span className="rounded-full border border-line/80 bg-bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
              26 Atributos
            </span>
          </div>
          <PlayerStats player={player} />
        </section>
      </div>
    </div>
  );
}
