export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  UserPlus,
  Users,
  Wallet,
  Star,
  TrendingUp,
  ChevronLeft,
  BarChart3,
  Coins,
} from "lucide-react";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { EditTeamButton } from "@/components/teams/EditTeamButton";
import { TeamLogo } from "@/components/teams/TeamCard";
import { TeamSquadView } from "@/components/teams/TeamSquadView";
import { SquadOverallChart } from "@/components/charts/LeagueCharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPlayers,
  getPrimaryLeague,
  getTeamById,
  getTeamsByLeague,
} from "@/lib/data/league";
import {
  getPlayerEffectiveRating,
  getPlayerFixedPrice,
  getPlayerContractInfo,
} from "@/lib/players";
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

  const totalValue = players.reduce((sum, p) => sum + getPlayerFixedPrice(p), 0);
  const totalRenewalCost = players.reduce(
    (sum, p) => sum + getPlayerContractInfo(p).renewalCost,
    0
  );
  const ratedPlayers = players.filter((p) => p.overall != null);
  const avgOverall =
    ratedPlayers.length > 0
      ? Math.round(
          ratedPlayers.reduce((sum, p) => sum + (getPlayerEffectiveRating(p) || 0), 0) /
            ratedPlayers.length
        )
      : null;

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      {/* BOTÓN VOLVER CON ACABADO GLASS */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground border border-white/[0.08] bg-card/40 backdrop-blur-md shadow-xs h-9 px-3"
        >
          <Link href="/teams">
            <ChevronLeft className="size-4" />
            <span>Volver a Equipos</span>
          </Link>
        </Button>
      </div>

      {/* HERO BANNER DEL EQUIPO - STRIPE POLISH */}
      <div className="group relative overflow-hidden rounded-3xl border border-white/[0.1] bg-card/70 backdrop-blur-md shadow-xl transition-all">
        {/* Banner superior cromático */}
        <div
          className="relative h-36 w-full sm:h-44"
          style={{
            background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color || "#0C1222"} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
          {/* Hairline reflection */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-70" />
        </div>

        <div className="relative px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
          <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            {/* ESCUDO Y TÍTULO */}
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
              <div className="rounded-full bg-card p-1.5 shadow-2xl ring-4 ring-background/90 transition-transform duration-300 group-hover:scale-102">
                <TeamLogo
                  name={team.name}
                  logoUrl={team.logo_url}
                  color={team.primary_color}
                  size="xl"
                />
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-3xl font-black tracking-tight uppercase text-foreground sm:text-4xl">
                    {team.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className="font-display text-xs font-black uppercase border-white/20 bg-white/[0.08] backdrop-blur-xs text-foreground"
                  >
                    {team.short_name}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <span>Propietario / Mánager:</span>
                  <span className="font-bold text-foreground">
                    {team.owner_name?.trim() || "Sin asignar"}
                  </span>
                </p>
              </div>
            </div>

            {/* ACCIONES DEL CLUB */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <Button asChild className="gap-1.5 font-display font-semibold shadow-sm h-10 px-4">
                <Link href={`/players?new=1&team=${team.id}`}>
                  <UserPlus className="size-4" />
                  <span>Añadir Jugador</span>
                </Link>
              </Button>
              <EditTeamButton team={team} />
            </div>
          </div>

          {/* KPI STATS CARDS EN HERO */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* PRESUPUESTO */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md shadow-xs transition-all hover:bg-white/[0.06]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <Wallet className="size-3.5" />
                </div>
                <span>Presupuesto</span>
              </div>
              <div className="mt-2 font-display text-xl font-black text-foreground sm:text-2xl tabular-nums">
                <BudgetDisplay amount={team.budget} size="lg" />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Liquidez para fichajes
              </p>
            </div>

            {/* PLANTILLA */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md shadow-xs transition-all hover:bg-white/[0.06]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Users className="size-3.5" />
                </div>
                <span>Plantilla</span>
              </div>
              <p className="mt-2 font-display text-xl font-black text-foreground sm:text-2xl tabular-nums">
                {players.length}{" "}
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  jugadores
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Fichas ocupadas
              </p>
            </div>

            {/* MEDIA OVR */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md shadow-xs transition-all hover:bg-white/[0.06]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Star className="size-3.5" />
                </div>
                <span>Media OVR</span>
              </div>
              <p className="mt-2 font-display text-xl font-black text-foreground sm:text-2xl tabular-nums">
                {avgOverall ? `★ ${avgOverall}` : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Nivel global del equipo
              </p>
            </div>

            {/* VALOR PLANTILLA */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md shadow-xs transition-all hover:bg-white/[0.06]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Coins className="size-3.5" />
                </div>
                <span>Valor Plantilla</span>
              </div>
              <div className="mt-2 font-display text-xl font-black text-foreground sm:text-2xl tabular-nums">
                <BudgetDisplay amount={totalValue} size="lg" />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Renovaciones:{" "}
                {totalRenewalCost > 0 ? (
                  <span className="font-semibold text-amber-400">{totalRenewalCost}M €</span>
                ) : (
                  <span className="font-semibold text-emerald-400">0M €</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICO DE OVR DE LA PLANTILLA */}
      {players.length > 0 && (
        <Card className="rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <BarChart3 className="size-4 text-primary" />
                <span>Nivel de los Jugadores (Overall PES)</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Distribución de valoraciones de PES 6 en la plantilla
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <SquadOverallChart players={players} />
          </CardContent>
        </Card>
      )}

      {/* GESTIÓN INTERACTIVA DE PLANTILLA (SQUAD VIEW CON FILTROS TÁCTICOS) */}
      <TeamSquadView team={team} players={players} teams={teams} />
    </div>
  );
}
