export const revalidate = 60;
import Link from "next/link";
import { DashboardBudgetChart } from "@/components/dashboard/DashboardBudgetChart";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardStandingsPodium } from "@/components/dashboard/DashboardStandingsPodium";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamLogo } from "@/components/teams/TeamCard";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardStats,
  getPrimaryLeague,
} from "@/lib/data/league";
import { getMatchesByLeague } from "@/lib/data/matches";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  Store,
  Shield,
  Users,
  Trophy,
  Sparkles,
  Swords,
  Calendar,
  ArrowRight,
  Flame,
} from "lucide-react";

export default async function LeaguePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <SetupNotice />
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Cani League
        </h1>
        <p className="mt-2 text-muted-foreground">Temporada 2026</p>
      </div>
    );
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return (
      <div className="space-y-6">
        <SetupNotice />
        <p className="text-muted-foreground">
          No hay liga configurada. Ejecuta el seed SQL en Supabase.
        </p>
      </div>
    );
  }

  const [stats, rawMatches] = await Promise.all([
    getDashboardStats(league.id),
    getMatchesByLeague(league.id).catch(() => []),
  ]);

  const totalBudget = stats.standings.reduce(
    (sum, s) => sum + s.team.budget,
    0
  );
  const averageBudget =
    stats.standings.length > 0
      ? Math.round(totalBudget / stats.standings.length)
      : 0;

  const playedMatches = rawMatches.filter((m) => m.played).length;
  const totalMatches = rawMatches.length;

  // Next upcoming unplayed matches (up to 3)
  const nextMatches = rawMatches.filter((m) => !m.played).slice(0, 3);

  return (
    <div className="animate-fade-up space-y-6 sm:space-y-8 pb-12">
      {/* Header with Season Status */}
      <PageHeader
        eyebrow="Competición Oficial · PES 6 Cani Patch"
        title={league.name}
        description={`Panel ejecutivo de gestión para la Temporada ${league.season}. Supervisión deportiva, masa económica y mercado de fichajes.`}
        badge={
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold gap-1.5 py-1 px-2.5 shadow-xs"
          >
            <Sparkles className="size-3" /> Temporada Oficial
          </Badge>
        }
      />

      {/* Quick Actions Shortcuts for Managers */}
      <DashboardQuickActions />

      {/* Executive Hero KPI Metric Cards */}
      <DashboardKpiGrid
        totalBudget={totalBudget}
        averageBudget={averageBudget}
        playerCount={stats.playerCount}
        marketCount={stats.marketCount}
        teamCount={stats.teamCount}
        playedMatches={playedMatches}
        totalMatches={totalMatches}
      />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Primary Column (7 cols): Standings & Matches */}
        <div className="space-y-6 lg:col-span-7">
          {/* Clasificación en Directo con Podio Top 3 */}
          <DashboardCard
            title="Clasificación en Directo"
            href="/standings"
            cta="Tabla completa y orden"
          >
            <DashboardStandingsPodium standings={stats.standings} />
          </DashboardCard>

          {/* Estado de Competición / Próximos Enfrentamientos */}
          <DashboardCard
            title="Próximos Enfrentamientos"
            href="/calendar"
            cta="Ver calendario completo"
          >
            {nextMatches.length > 0 ? (
              <div className="space-y-2.5">
                {nextMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs transition-colors hover:bg-white/[0.04]"
                  >
                    {/* Home Team */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <TeamLogo
                        name={match.home_team.name}
                        logoUrl={match.home_team.logo_url}
                        color={match.home_team.primary_color}
                        size="sm"
                      />
                      <span className="truncate font-semibold text-foreground">
                        {match.home_team.name}
                      </span>
                    </div>

                    {/* Matchday Badge & VS */}
                    <div className="flex flex-col items-center shrink-0 px-2">
                      <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Jornada {match.matchday}
                      </span>
                      <span className="mt-0.5 text-[11px] font-extrabold text-muted-foreground/60">
                        VS
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-end gap-2.5 min-w-0 flex-1 text-right">
                      <span className="truncate font-semibold text-foreground">
                        {match.away_team.name}
                      </span>
                      <TeamLogo
                        name={match.away_team.name}
                        logoUrl={match.away_team.logo_url}
                        color={match.away_team.primary_color}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01]">
                <Calendar className="size-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {totalMatches > 0
                    ? "Todos los partidos de la temporada han sido disputados"
                    : "No hay partidos generados para esta temporada"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {totalMatches > 0
                    ? "Puedes consultar el histórico de actas y resultados en el calendario."
                    : "Accede al calendario para generar automáticamente el cuadro de enfrentamientos de ida y vuelta."}
                </p>
                <Link
                  href="/calendar"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Ir al panel de calendario</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </DashboardCard>
        </div>

        {/* Right Secondary Column (5 cols): Finances & Market Radar */}
        <div className="space-y-6 lg:col-span-5">
          {/* Distribución Financiera y Masa Salarial */}
          <DashboardCard
            title="Salud Financiera & Presupuestos"
            href="/finances"
            cta="Desglose por club"
          >
            <DashboardBudgetChart standings={stats.standings} />
          </DashboardCard>

          {/* Radar del Mercado y Oportunidades por Posición */}
          <DashboardCard
            title="Radar de Mercado & Oportunidades"
            href="/market"
            cta="Explorar catálogo"
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Descubre futbolistas transferibles por posición con cláusula de rescisión activa o agentes libres:
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/players?pos=DEF"
                  className="group flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/30 hover:bg-blue-500/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground group-hover:text-blue-400 transition-colors">
                      🛡️ Defensas
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-blue-400 transition-all" />
                  </div>
                  <span className="mt-2 text-[10px] text-muted-foreground">
                    Centrales y laterales
                  </span>
                </Link>

                <Link
                  href="/players?pos=MID"
                  className="group flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:bg-emerald-500/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                      🎯 Medios
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-emerald-400 transition-all" />
                  </div>
                  <span className="mt-2 text-[10px] text-muted-foreground">
                    Pivotes y mediapuntas
                  </span>
                </Link>

                <Link
                  href="/players?pos=ATT"
                  className="group flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-500/30 hover:bg-rose-500/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground group-hover:text-rose-400 transition-colors">
                      ⚡ Delanteros
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-rose-400 transition-all" />
                  </div>
                  <span className="mt-2 text-[10px] text-muted-foreground">
                    Extremos y arietes
                  </span>
                </Link>

                <Link
                  href="/players?pos=GK"
                  className="group flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/30 hover:bg-amber-500/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground group-hover:text-amber-400 transition-colors">
                      🧤 Porteros
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-amber-400 transition-all" />
                  </div>
                  <span className="mt-2 text-[10px] text-muted-foreground">
                    Guardametas oficiales
                  </span>
                </Link>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-amber-400 shrink-0" />
                  <span className="text-muted-foreground">
                    ¿Buscas agentes libres directos?
                  </span>
                </div>
                <Link
                  href="/market"
                  className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 shrink-0"
                >
                  <span>Fichar</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
