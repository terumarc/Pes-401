export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { LeagueTable } from "@/components/league/LeagueTable";
import { GenerateFixturesBtn } from "@/components/league/GenerateFixturesBtn";
import { ResetLeagueBtn } from "@/components/league/ResetLeagueBtn";
import { QuickMatchModal } from "@/components/league/QuickMatchModal";
import { TeamFixturesView } from "@/components/league/TeamFixturesView";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getMatchesByLeague,
  buildLeagueTable,
} from "@/lib/data/matches";
import {
  getPrimaryLeague,
  getTeamsByLeague,
} from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  CalendarDays,
  Trophy,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Layers,
} from "lucide-react";

export default async function CalendarPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const league = await getPrimaryLeague();
  if (!league)
    return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const [allTeams, rawMatches] = await Promise.all([
    getTeamsByLeague(league.id),
    getMatchesByLeague(league.id),
  ]);

  // Filtrar estrictamente para excluir equipos de sistema (Agentes Libres) de partidos y calendario
  const teams = allTeams.filter(
    (t) =>
      !t.name.toLowerCase().includes("libre") &&
      !t.name.toLowerCase().includes("sin equipo")
  );

  const matches = rawMatches.filter(
    (m) =>
      teams.some((t) => t.id === m.home_team_id) &&
      teams.some((t) => t.id === m.away_team_id)
  );

  const tableRows = buildLeagueTable(teams, matches);
  const hasFixtures = matches.length > 0;
  const playedMatchesList = matches.filter((m) => m.played);
  const playedCount = playedMatchesList.length;
  const totalMatches = matches.length;
  const pendingCount = totalMatches - playedCount;
  const progressPct =
    totalMatches > 0 ? Math.round((playedCount / totalMatches) * 100) : 0;

  const totalGoals = playedMatchesList.reduce(
    (sum, m) => sum + (m.home_goals ?? 0) + (m.away_goals ?? 0),
    0
  );
  const avgGoals =
    playedCount > 0 ? (totalGoals / playedCount).toFixed(1) : "0.0";

  return (
    <div className="animate-fade-up space-y-8 pb-12">
      <PageHeader
        eyebrow={`Competición Oficial · Temporada ${league.season}`}
        title="Partidos & Calendario"
        description="Seguimiento de jornadas, actas de partidos en directo y tabla de clasificación oficial."
        badge={
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold gap-1.5 py-1 px-2.5"
          >
            <Sparkles className="size-3" /> Cani League
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <QuickMatchModal
              leagueId={league.id}
              teams={teams}
              matches={matches}
            />
            <GenerateFixturesBtn
              leagueId={league.id}
              teams={teams}
              hasExisting={hasFixtures}
            />
            <ResetLeagueBtn leagueId={league.id} />
          </div>
        }
      />

      {/* Season Progress & Metrics Card */}
      {hasFixtures && (
        <section
          aria-label="Progreso de la temporada"
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-5 backdrop-blur-md shadow-sm"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40" />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary" />
                  Progreso del Torneo
                </span>
                <span className="font-display text-sm font-extrabold tabular-nums text-foreground">
                  {progressPct}% completado
                </span>
              </div>
              <Progress value={progressPct} className="h-2 bg-white/[0.06]" />
              <p className="text-xs text-muted-foreground">
                {playedCount} de {totalMatches} partidos disputados en total
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 border-t lg:border-t-0 lg:border-l border-white/[0.08] pt-3 lg:pt-0 lg:pl-6 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center justify-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-400" /> Jugados
                </span>
                <p className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
                  {playedCount}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="size-3 text-amber-400" /> Pendientes
                </span>
                <p className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
                  {pendingCount}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center justify-center gap-1">
                  <Flame className="size-3 text-rose-400" /> Goles / Part.
                </span>
                <p className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
                  {avgGoals}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Clasificación en vivo */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-400" />
            <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              Tabla de Clasificación
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Criterio: 3 pts victoria · 1 pt empate · Desempate por DIF / GF
          </span>
        </div>
        <LeagueTable rows={tableRows} />
      </section>

      {/* Enfrentamientos por Equipos */}
      {hasFixtures ? (
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                Enfrentamientos entre Equipos
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Filtra por club o fase para anotar o editar resultados con controles táctiles.
            </p>
          </div>

          <TeamFixturesView teams={teams} matches={matches} />
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-card/20 py-16 text-center">
          <CalendarDays className="size-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="font-display text-lg font-bold text-foreground">
            Aún no se ha generado el calendario
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Pulsa en el botón &quot;Generar Calendario&quot; en la parte superior para crear automáticamente todas las jornadas de ida y vuelta de la liga.
          </p>
        </div>
      )}
    </div>
  );
}
