import { createClient } from "@/lib/supabase/server";
import type { League, LeagueTableRow, Match, MatchWithTeams, Team } from "@/types";

// ─── Queries ────────────────────────────────────────────────

export async function getMatchesByLeague(
    leagueId: string,
    options?: { matchday?: number; round?: number },
): Promise<MatchWithTeams[]> {
    const supabase = await createClient();
    let query = supabase
        .from("matches")
        .select(
            `*, home_team:teams!matches_home_team_id_fkey(id,name,short_name,primary_color,logo_url),
           away_team:teams!matches_away_team_id_fkey(id,name,short_name,primary_color,logo_url)`,
        )
        .eq("league_id", leagueId)
        .order("matchday", { ascending: true })
        .order("created_at", { ascending: true });

    if (options?.matchday) query = query.eq("matchday", options.matchday);
    if (options?.round) query = query.eq("round", options.round);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as MatchWithTeams[];
}

export async function getMatchById(id: string): Promise<MatchWithTeams | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("matches")
        .select(
            `*, home_team:teams!matches_home_team_id_fkey(id,name,short_name,primary_color,logo_url),
           away_team:teams!matches_away_team_id_fkey(id,name,short_name,primary_color,logo_url)`,
        )
        .eq("id", id)
        .maybeSingle();
    if (error) throw error;
    return data as MatchWithTeams | null;
}

/** Genera el calendario completo (ida+vuelta) para los equipos de una liga */
export async function generateFixtures(
    league: League,
    teams: Team[],
): Promise<Match[]> {
    const supabase = await createClient();

    const n = teams.length;
    // Round-robin con n equipos → n-1 jornadas por vuelta
    // Si n es impar se añade un "bye" (descansa)
    const teamList = [...teams];
    if (n % 2 !== 0) teamList.push({ id: "BYE" } as Team);

    const half = teamList.length / 2;
    const rounds = teamList.length - 1;
    const fixed = teamList[0];
    const rotating = teamList.slice(1);

    const inserts: Omit<Match, "id" | "created_at">[] = [];

    for (let round = 0; round < rounds; round++) {
        const matchday = round + 1;
        const pairs: [Team, Team][] = [];

        pairs.push([fixed, rotating[round % (teamList.length - 1)]]);
        for (let i = 1; i < half; i++) {
            const home = rotating[(round + i) % (teamList.length - 1)];
            const away = rotating[(round + teamList.length - 1 - i) % (teamList.length - 1)];
            pairs.push([home, away]);
        }

        for (const [home, away] of pairs) {
            if (home.id === "BYE" || away.id === "BYE") continue;

            // Ida
            inserts.push({
                league_id: league.id,
                home_team_id: home.id,
                away_team_id: away.id,
                matchday,
                round: 1,
                home_goals: null,
                away_goals: null,
                played: false,
                played_at: null,
            });

            // Vuelta
            inserts.push({
                league_id: league.id,
                home_team_id: away.id,
                away_team_id: home.id,
                matchday: rounds + matchday,
                round: 2,
                home_goals: null,
                away_goals: null,
                played: false,
                played_at: null,
            });
        }
    }

    const { data, error } = await supabase
        .from("matches")
        .insert(inserts)
        .select("*");
    if (error) throw error;
    return (data ?? []) as Match[];
}

// ─── Clasificación calculada desde partidos ─────────────────

export function buildLeagueTable(
    teams: Team[],
    matches: MatchWithTeams[],
): LeagueTableRow[] {
    const map = new Map<string, LeagueTableRow>();

    for (const team of teams) {
        map.set(team.id, {
            team,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goals_for: 0,
            goals_against: 0,
            goal_diff: 0,
            points: 0,
        });
    }

    for (const m of matches) {
        if (!m.played || m.home_goals == null || m.away_goals == null) continue;

        const home = map.get(m.home_team_id);
        const away = map.get(m.away_team_id);
        if (!home || !away) continue;

        home.played++;
        away.played++;
        home.goals_for += m.home_goals;
        home.goals_against += m.away_goals;
        away.goals_for += m.away_goals;
        away.goals_against += m.home_goals;

        if (m.home_goals > m.away_goals) {
            home.won++; home.points += 3;
            away.lost++;
        } else if (m.home_goals < m.away_goals) {
            away.won++; away.points += 3;
            home.lost++;
        } else {
            home.drawn++; home.points++;
            away.drawn++; away.points++;
        }
    }

    return Array.from(map.values())
        .map((row) => ({
            ...row,
            goal_diff: row.goals_for - row.goals_against,
        }))
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
            if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
            return a.team.name.localeCompare(b.team.name);
        });
}
