import { createStaticClient } from "@/lib/supabase/server";
import type { GoalRow, MatchLite } from "@/lib/stats";

/** Todos los partidos de liga jugados, de todas las temporadas (para historial y rachas). */
export async function getAllPlayedMatches(leagueId: string): Promise<MatchLite[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, season, home_team_id, away_team_id, home_goals, away_goals, played, played_at, matchday")
    .eq("league_id", leagueId)
    .eq("played", true);
  if (error) return [];
  return (data ?? []) as MatchLite[];
}

/** Goles de una temporada (o de todas si no se indica). */
export async function getGoals(leagueId: string, season?: string): Promise<GoalRow[]> {
  const supabase = createStaticClient();
  let q = supabase.from("match_goals").select("team_id, player_id, player_name, goals, match_id, season").eq("league_id", leagueId);
  if (season !== undefined) q = q.eq("season", season);
  const { data, error } = await q;
  if (error) return []; // sin la tabla (migración 006) no hay goleadores
  return (data ?? []) as GoalRow[];
}

/** Cruces de copa de una temporada. */
export async function getCupTies(leagueId: string, season: string) {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("cup_ties")
    .select("*")
    .eq("league_id", leagueId)
    .eq("season", season)
    .order("round", { ascending: true })
    .order("slot", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export type SeasonRecord = {
  id: string;
  season: string;
  standings: { position: number; team_id: string; name: string; points: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number }[];
  champions: Record<string, { team_id: string; name: string } | null>;
  top_scorers: { name: string; team: string | null; goals: number }[];
  closed_at: string;
};

/** Temporadas cerradas, de la más reciente a la más antigua. */
export async function getSeasons(leagueId: string): Promise<SeasonRecord[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from("seasons").select("*").eq("league_id", leagueId).order("closed_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as SeasonRecord[];
}
