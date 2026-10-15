import type { SupabaseClient } from "@supabase/supabase-js";

export type ScorerInput = { teamId: string; playerId: string | null; playerName: string; goals: number };

/**
 * Sustituye los goleadores de un partido de liga. Solo se guardan goles de los dos
 * equipos del partido y nunca más de los que marcó cada uno.
 */
export async function saveLeagueMatchGoals(
  supabase: SupabaseClient,
  match: { id: string; league_id: string; season: string | null; home_team_id: string; away_team_id: string; home_goals: number | null; away_goals: number | null },
  scorers: ScorerInput[],
) {
  await supabase.from("match_goals").delete().eq("match_id", match.id);
  const limit: Record<string, number> = {
    [match.home_team_id]: match.home_goals ?? 0,
    [match.away_team_id]: match.away_goals ?? 0,
  };
  const rows = [];
  for (const s of scorers) {
    const left = limit[s.teamId] ?? 0;
    const goals = Math.min(Math.max(0, Math.floor(s.goals)), left);
    if (!goals || !s.playerName) continue;
    limit[s.teamId] = left - goals;
    rows.push({
      league_id: match.league_id,
      season: match.season ?? "",
      match_id: match.id,
      team_id: s.teamId,
      player_id: s.playerId,
      player_name: s.playerName,
      goals,
    });
  }
  if (rows.length) {
    const { error } = await supabase.from("match_goals").insert(rows);
    if (error) throw error;
  }
}
