import { createClient } from "@/lib/supabase/server";
import { buildLeagueTable, getMatchesByLeague } from "@/lib/data/matches";
import { getTeamsByLeague } from "@/lib/data/league";
import { scorePorra, type NecroPick } from "@/lib/necroporra";
import type { League, Team } from "@/types";

const isSystemTeam = (name: string) => /libre|sin equipo/i.test(name);

export type NecroEntry = {
  memberId: string;
  name: string;
  teamId: string | null;
  points: number;
  exact: number;
  picks: NecroPick[];
};

export type Necroporra = {
  season: string;
  /** Cerrada: ya se ha jugado algún partido de liga de la temporada. */
  locked: boolean;
  /** Se han jugado todos: la puntuación ya es la definitiva. */
  finished: boolean;
  clubs: Team[];
  /** Clasificación de ahora, con la que se puntúa. */
  table: string[];
  /** La porra de quien mira (si la ha hecho). */
  mine: string[] | null;
  /** Quién la ha hecho ya. */
  entrants: { memberId: string; name: string; teamId: string | null }[];
  /** Con la porra cerrada: todas, de más a menos puntos. */
  board: NecroEntry[];
};

export async function getNecroporra(league: League, memberId: string | null): Promise<Necroporra> {
  const supabase = await createClient();
  const [teams, matches, { data: rows }, { data: entrantRows }] = await Promise.all([
    getTeamsByLeague(league.id),
    getMatchesByLeague(league.id).catch(() => []),
    supabase.from("necroporra_picks").select("*").eq("league_id", league.id).eq("season", league.season),
    supabase.rpc("necroporra_entrants", { p_league: league.id, p_season: league.season }),
  ]);

  const clubs = teams.filter((t) => !isSystemTeam(t.name));
  const clubMatches = matches.filter(
    (m) => clubs.some((c) => c.id === m.home_team_id) && clubs.some((c) => c.id === m.away_team_id),
  );
  const locked = clubMatches.some((m) => m.played);
  const finished = clubMatches.length > 0 && clubMatches.every((m) => m.played);
  const table = buildLeagueTable(clubs, clubMatches).map((r) => r.team.id);
  const actual = new Map(table.map((id, i) => [id, i + 1]));

  const entrants = (entrantRows ?? []).map((e) => ({ memberId: e.member_id, name: e.display_name, teamId: e.team_id }));
  const nameOf = new Map(entrants.map((e) => [e.memberId, e.name]));
  const picks = rows ?? [];

  const board = locked
    ? picks
        .map((p) => ({
          memberId: p.member_id,
          name: nameOf.get(p.member_id) ?? "Alguien",
          teamId: p.team_id,
          ...scorePorra(p.ranking, p.team_id, actual),
        }))
        .sort((a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name, "es"))
    : [];

  return {
    season: league.season,
    locked,
    finished,
    clubs,
    table,
    mine: picks.find((p) => p.member_id === memberId)?.ranking ?? null,
    entrants,
    board,
  };
}
