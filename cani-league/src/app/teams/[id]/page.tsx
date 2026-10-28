export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { EditTeamButton } from "@/components/teams/EditTeamButton";
import { TeamLogo } from "@/components/teams/TeamCard";
import { ClubSections } from "@/components/teams/ClubSections";
import { Button } from "@/components/ui/button";
import { getPlayers, getPrimaryLeague, getTeamById, getTeamsByLeague } from "@/lib/data/league";
import { getPlayerEffectiveRating, getPlayerFixedPrice } from "@/lib/players";
import { formatMoney } from "@/lib/format/money";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getGoals } from "@/lib/data/stats";
import { getMatchesByLeague } from "@/lib/data/matches";
import { teamForm } from "@/lib/stats";
import { FormDots } from "@/components/league/FormDots";

type Props = { params: Promise<{ id: string }> };

/** Cifras grandes y abreviadas para la cabecera del club (50M €). */
function short(value: number) {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  return formatMoney(value);
}

export default async function TeamDetailPage({ params }: Props) {
  if (!isSupabaseConfigured()) return <p className="text-muted-foreground">Configura Supabase primero.</p>;

  const { id } = await params;
  const team = await getTeamById(id);
  if (!team) notFound();

  const league = await getPrimaryLeague();
  const [players, teams, goals, matches] = await Promise.all([
    getPlayers({ teamId: team.id }),
    league ? getTeamsByLeague(league.id) : Promise.resolve([]),
    league ? getGoals(league.id, league.season) : Promise.resolve([]),
    league ? getMatchesByLeague(league.id).catch(() => []) : Promise.resolve([]),
  ]);
  const goalsByPlayer: Record<string, number> = {};
  for (const g of goals) if (g.player_id && g.team_id === team.id) goalsByPlayer[g.player_id] = (goalsByPlayer[g.player_id] ?? 0) + g.goals;
  const form = teamForm(matches, team.id);

  const totalValue = players.reduce((sum, p) => sum + getPlayerFixedPrice(p), 0);
  const rated = players.filter((p) => p.overall != null);
  const avgOverall = rated.length
    ? Math.round(rated.reduce((sum, p) => sum + (getPlayerEffectiveRating(p) || 0), 0) / rated.length)
    : null;

  const stats = [
    { label: "Presupuesto", value: short(team.budget || 0) },
    { label: "Valor", value: short(totalValue) },
    { label: "Media", value: avgOverall ?? "–" },
  ];

  return (
    <div className="animate-fade-up pb-12">
      {/* Cabecera del club: el color del equipo se funde con el fondo, como en Apple Sports. */}
      <header className="relative -mx-4 -mt-2 mb-6 px-4 pb-2 pt-6 md:mx-0 md:mt-0 md:rounded-[22px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 md:rounded-[22px]"
          style={{ background: `linear-gradient(180deg, ${team.primary_color}66 0%, transparent 85%)` }}
        />
        <div className="relative flex flex-col items-center text-center">
          <TeamLogo name={team.name} logoUrl={team.logo_url} color={team.primary_color} size="xl" />
          <h1 className="mt-3 text-[length:min(1.6471rem,42px)] font-bold leading-tight tracking-tight">{team.name}</h1>
          <p className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground">{team.owner_name?.trim() || "Sin propietario"}</p>
          <FormDots form={form} className="mt-2" />

          <dl className="mt-5 grid w-full max-w-md grid-cols-3 rounded-[22px] bg-card py-3">
            {stats.map((s, i) => (
              <div key={s.label} className={i > 0 ? "border-l border-border" : undefined}>
                <dt className="text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{s.label}</dt>
                <dd className="text-[length:min(1.1765rem,30px)] font-bold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex w-full max-w-md gap-2 large-text:flex-col large-text:[&>*]:min-h-11">
            <Button asChild variant="secondary" className="flex-1 gap-1.5">
              <Link href={`/players?new=1&team=${team.id}`}>
                <UserPlus className="size-4" aria-hidden />
                Añadir jugador
              </Link>
            </Button>
            <EditTeamButton team={team} className="flex-1" />
          </div>
        </div>
      </header>

      <ClubSections team={team} players={players} teams={teams} goals={goalsByPlayer} />
    </div>
  );
}
