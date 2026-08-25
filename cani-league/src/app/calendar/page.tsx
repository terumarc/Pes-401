export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { LeagueTable } from "@/components/league/LeagueTable";
import { MatchRow } from "@/components/league/MatchRow";
import { GenerateFixturesBtn } from "@/components/league/GenerateFixturesBtn";
import { ResetLeagueBtn } from "@/components/league/ResetLeagueBtn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    getMatchesByLeague,
    buildLeagueTable,
} from "@/lib/data/matches";
import {
    getPrimaryLeague,
    getTeamsByLeague,
} from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function CalendarPage() {
    if (!isSupabaseConfigured()) return <SetupNotice />;

    const league = await getPrimaryLeague();
    if (!league)
        return <p className="text-ink-muted">No hay liga configurada.</p>;

    const [teams, matches] = await Promise.all([
        getTeamsByLeague(league.id),
        getMatchesByLeague(league.id),
    ]);

    const tableRows = buildLeagueTable(teams, matches);

    // Agrupar partidos por jornada
    const matchdays = new Map<number, typeof matches>();
    for (const m of matches) {
        const arr = matchdays.get(m.matchday) ?? [];
        arr.push(m);
        matchdays.set(m.matchday, arr);
    }
    const sortedMatchdays = [...matchdays.entries()].sort(([a], [b]) => a - b);

    const hasFixtures = matches.length > 0;
    const totalMatchdays = (teams.length % 2 === 0 ? teams.length - 1 : teams.length) * 2;

    // Calcular la jornada actual (la primera que tenga algún partido sin jugar)
    let currentMatchday = 1;
    for (const [md, mdMatches] of sortedMatchdays) {
        if (mdMatches.some(m => !m.played)) {
            currentMatchday = md;
            break;
        }
    }
    if (sortedMatchdays.length > 0 && sortedMatchdays.every(([, mdMatches]) => mdMatches.every(m => m.played))) {
        currentMatchday = sortedMatchdays[sortedMatchdays.length - 1][0];
    }

    return (
        <div className="animate-fade-up space-y-10">
            <PageHeader
                eyebrow={`${league.name} · ${league.season}`}
                title="Liga"
                description={
                    hasFixtures
                        ? `${matches.filter((m) => m.played).length} de ${matches.length} partidos jugados`
                        : "Genera el calendario para empezar"
                }
                actions={
                    <div className="flex items-center gap-3">
                        <ResetLeagueBtn leagueId={league.id} />
                        {!hasFixtures && (
                            <GenerateFixturesBtn leagueId={league.id} teams={teams} />
                        )}
                    </div>
                }
            />

            {/* Clasificación */}
            <section>
                <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">
                    Clasificación
                </h2>
                <LeagueTable rows={tableRows} />
            </section>

            {/* Calendario */}
            {hasFixtures && (
                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-display text-xl font-semibold tracking-tight">
                            Calendario
                        </h2>
                        <span className="text-sm text-ink-muted">{totalMatchdays} Jornadas</span>
                    </div>
                    <Tabs defaultValue={currentMatchday.toString()} className="w-full">
                        <ScrollArea className="w-full pb-3">
                            <TabsList className="mb-4 inline-flex w-full justify-start md:w-auto">
                                {sortedMatchdays.map(([matchday]) => (
                                    <TabsTrigger key={matchday} value={matchday.toString()}>
                                        J{matchday}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                        <div className="mt-2 min-h-[300px]">
                            {sortedMatchdays.map(([matchday, dayMatches]) => {
                                const isVuelta = dayMatches[0]?.round === 2;
                                const roundLabel = isVuelta ? "Vuelta" : "Ida";
                                return (
                                    <TabsContent key={matchday} value={matchday.toString()} className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-semibold tracking-widest text-ink-subtle uppercase">
                                                Jornada {matchday} · {roundLabel}
                                            </span>
                                            <div className="h-px flex-1 bg-line" />
                                            <span className="text-xs text-ink-muted">
                                                {dayMatches.filter((m) => m.played).length}/{dayMatches.length} jugados
                                            </span>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {dayMatches.map((match) => (
                                                <MatchRow key={match.id} match={match} />
                                            ))}
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </div>
                    </Tabs>
                </section>
            )}
        </div>
    );
}
