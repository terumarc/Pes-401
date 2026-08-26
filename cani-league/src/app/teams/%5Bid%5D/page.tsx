export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  UserPlus,
  Users,
  Wallet,
  Star,
  TrendingUp,
  Store,
  ChevronLeft,
} from "lucide-react";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { PlayerActions } from "@/components/players/PlayerActions";
import { PlayerAvatar } from "@/components/players/PlayerCard";
import { EditTeamButton } from "@/components/teams/EditTeamButton";
import { TeamLogo } from "@/components/teams/TeamCard";
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
import { formatStat } from "@/lib/format/stats";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export function getPositionCategory(pos: string): { label: string; color: string } {
  const p = pos.toUpperCase();
  if (p === "GK") return { label: "Portero", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
  if (["CB", "LB", "RB", "SW", "LWB", "RWB"].includes(p)) {
    return { label: "Defensa", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" };
  }
  if (["DMF", "CMF", "AMF", "LMF", "RMF", "SMF"].includes(p)) {
    return { label: "Medio", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" };
  }
  return { label: "Delantero", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" };
}

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

  const totalValue = players.reduce((sum, p) => sum + (p.market_value || 0), 0);
  const ratedPlayers = players.filter((p) => p.overall != null);
  const avgOverall =
    ratedPlayers.length > 0
      ? Math.round(
          ratedPlayers.reduce((sum, p) => sum + (p.overall || 0), 0) /
            ratedPlayers.length,
        )
      : null;

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      {/* BOTÓN VOLVER */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link href="/teams">
            <ChevronLeft className="size-4" />
            Volver a Equipos
          </Link>
        </Button>
      </div>

      {/* HERO BANNER DEL EQUIPO */}
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-md">
        <div
          className="h-32 w-full sm:h-40"
          style={{
            background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color || "#0C1222"} 100%)`,
          }}
        >
          <div className="h-full w-full bg-black/20 backdrop-blur-[1px]" />
        </div>

        <div className="relative px-6 pb-6 pt-0 sm:px-8">
          <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
              <div className="rounded-full bg-card p-1.5 shadow-xl ring-4 ring-background">
                <TeamLogo
                  name={team.name}
                  logoUrl={team.logo_url}
                  color={team.primary_color}
                  size="xl"
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
                    {team.name}
                  </h1>
                  <Badge variant="secondary" className="font-display text-xs font-bold uppercase">
                    {team.short_name}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Propietario:{" "}
                  <span className="font-semibold text-foreground">
                    {team.owner_name?.trim() || "Sin asignar"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button asChild className="gap-1.5 font-display font-semibold shadow-sm">
                <Link href={`/players?new=1&team=${team.id}`}>
                  <UserPlus className="size-4" />
                  Añadir Jugador
                </Link>
              </Button>
              <EditTeamButton team={team} />
            </div>
          </div>

          {/* KPI STATS CARDS */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <Wallet className="size-3.5 text-primary" />
                Presupuesto
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">
                <BudgetDisplay amount={team.budget} size="lg" />
              </p>
            </div>

            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <Users className="size-3.5 text-primary" />
                Plantilla
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">
                {players.length} <span className="text-sm font-medium text-muted-foreground">jugadores</span>
              </p>
            </div>

            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <Star className="size-3.5 text-amber-500" />
                Media OVR
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">
                {avgOverall ? `★ ${avgOverall}` : "—"}
              </p>
            </div>

            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <TrendingUp className="size-3.5 text-emerald-500" />
                Valor Plantilla
              </div>
              <p className="mt-1 font-display text-xl font-extrabold text-foreground sm:text-2xl">
                <BudgetDisplay amount={totalValue} size="lg" />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICO DE OVR DE LA PLANTILLA */}
      {players.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-display text-lg font-bold">
                Nivel de los Jugadores (Overall)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Distribución de valoraciones de PES en la plantilla
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <SquadOverallChart players={players} />
          </CardContent>
        </Card>
      )}

      {/* LISTA DE JUGADORES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Jugadores del Club
            </h2>
            <p className="text-xs text-muted-foreground">
              {players.length} futbolistas registrados en el equipo
            </p>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="rounded-3xl border border-dashed py-16 text-center">
            <p className="font-display text-lg font-bold">Sin jugadores todavía</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Añade jugadores o fíchalos desde el mercado para completar la plantilla.
            </p>
            <Button asChild className="mt-4 gap-1.5 font-display font-semibold">
              <Link href={`/players?new=1&team=${team.id}`}>
                <UserPlus className="size-4" />
                Añadir Primer Jugador
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => {
              const posCat = getPositionCategory(player.position);
              const isHighOvr = (player.overall ?? 0) >= 80;

              return (
                <Card
                  key={player.id}
                  className="group relative overflow-hidden border-border/80 bg-card transition-all duration-200 hover:border-foreground/30 hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar
                          name={player.name}
                          photoUrl={player.photo_url}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h4 className="truncate font-display text-base font-bold">
                            {player.name}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn("h-4 text-[10px] font-extrabold uppercase", posCat.color)}
                            >
                              {player.position}
                            </Badge>
                            {player.age && (
                              <span className="text-xs text-muted-foreground">
                                {player.age} años
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {player.overall != null && (
                        <div
                          className={cn(
                            "flex flex-col items-center justify-center rounded-xl px-2.5 py-1 font-display font-black shadow-xs",
                            isHighOvr
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                          )}
                        >
                          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/80">
                            OVR
                          </span>
                          <span className="text-base font-extrabold tabular-nums">
                            {player.overall}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* PRECIOS Y VALORES */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-2 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Valor Mercado
                        </span>
                        <p className="font-display font-bold text-foreground">
                          <BudgetDisplay amount={player.market_value} size="sm" />
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Precio Fichaje
                        </span>
                        <p className="font-display font-bold text-foreground">
                          <BudgetDisplay amount={player.transfer_price} size="sm" />
                        </p>
                      </div>
                    </div>

                    {/* MERCADO FLAG Y ACCIONES */}
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                      {player.available_in_market ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                        >
                          <Store className="size-3" />
                          En Mercado
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Intransferible</span>
                      )}

                      <PlayerActions
                        playerId={player.id}
                        availableInMarket={player.available_in_market}
                        teams={teams}
                        currentTeamId={player.team_id}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
