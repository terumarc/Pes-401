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
      <div className="animate-fade-up mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-card/50 p-6 backdrop-blur-md shadow-sm sm:p-8">
        <PlayerForm teams={teams} player={player} />
        <Link
          href={`/players/${player.id}`}
          className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[36px]"
        >
          ← Cancelar y volver al perfil
        </Link>
      </div>
    );
  }

  const isElite = mediaValue >= 88;

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        eyebrow={player.team.name}
        title={player.name}
        description={`${player.position}${player.age ? ` · ${player.age} años` : ""}${player.nationality ? ` · ${player.nationality}` : ""}`}
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr]">
        <section className="relative overflow-hidden h-fit rounded-2xl border border-white/[0.08] bg-card/40 p-6 backdrop-blur-md shadow-sm">
          {/* Top edge subtle sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="flex items-start gap-4">
            <PlayerAvatar
              name={player.name}
              photoUrl={player.photo_url}
              size="lg"
              isElite={isElite}
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] tracking-wider text-muted-foreground uppercase font-semibold">
                  Media
                </p>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.color} ring-1 ring-white/10`}>
                  {tierInfo.tier}
                </span>
              </div>
              <p className={`font-display text-5xl font-bold tabular-nums tracking-tight ${
                isElite ? "text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.3)]" : "text-foreground"
              }`}>
                {formatStat(mediaValue)}
              </p>
            </div>
          </div>

          <dl className="mt-6 space-y-3.5 border-t border-white/[0.06] pt-5 text-xs sm:text-sm">
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Club / Equipo</dt>
              <dd>
                <Link
                  href={`/teams/${player.team.id}`}
                  className="hover:text-primary transition-colors font-semibold text-foreground inline-flex items-center gap-1.5"
                >
                  <span
                    className="size-2.5 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: player.team.primary_color || '#94a3b8' }}
                  />
                  <span>{player.team.name}</span>
                </Link>
              </dd>
            </div>
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Precio Fijo (Tier {tierInfo.tier})</dt>
              <dd className="font-semibold text-foreground tabular-nums">
                <BudgetDisplay amount={contractInfo.price} size="sm" />
              </dd>
            </div>
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Duración Contrato</dt>
              <dd className="font-medium text-foreground">
                {contractInfo.durationLabel}
              </dd>
            </div>
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Prima de Renovación</dt>
              <dd className="font-semibold tabular-nums">
                {contractInfo.renewalCost > 0 ? (
                  <span className="text-amber-400">
                    {contractInfo.renewalPercentLabel} · <BudgetDisplay amount={contractInfo.renewalCost} size="sm" />
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">
                    Gratis
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Estado de Mercado</dt>
              <dd>
                {player.available_in_market ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Disponible
                  </span>
                ) : (
                  <span className="text-muted-foreground">Intransferible</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Operaciones del Jugador
            </h3>
            <PlayerActions
              playerId={player.id}
              availableInMarket={player.available_in_market}
              teams={teams}
              currentTeamId={player.team_id}
              player={player}
              variant="default"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-card/40 p-6 backdrop-blur-md shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Estadísticas PES Oficiales
            </h2>
            <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs font-bold text-muted-foreground">
              26 Atributos
            </span>
          </div>
          <PlayerStats player={player} />
        </section>
      </div>
    </div>
  );
}
