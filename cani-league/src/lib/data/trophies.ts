import { createStaticClient } from "@/lib/supabase/server";
import { getTeamsByLeague } from "@/lib/data/league";
import { TROPHIES } from "@/constants";
import type { TeamTrophyCabinet, TrophyCounts, TrophyType } from "@/types";

export function emptyTrophyCounts(): TrophyCounts {
  return { league: 0, champions: 0, cup: 0, conference: 0 };
}

export function isTrophyType(value: string): value is TrophyType {
  return TROPHIES.some((t) => t.key === value);
}

export type TrophyCabinetResult =
  | { ok: true; cabinets: TeamTrophyCabinet[]; prizes: TrophyCounts }
  | { ok: false; reason: "missing_table" | "error"; message: string };

/**
 * Palmarés de todos los equipos de la liga. Sin caché: la sala de trofeos
 * se edita a mano y debe reflejar el último valor guardado.
 */
export async function getTrophyCabinets(
  leagueId: string,
): Promise<TrophyCabinetResult> {
  const teams = await getTeamsByLeague(leagueId);
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from("team_trophies")
    .select("team_id, trophy, count")
    .in(
      "team_id",
      teams.map((t) => t.id),
    );

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /team_trophies/.test(error.message);
    return {
      ok: false,
      reason: missing ? "missing_table" : "error",
      message: error.message,
    };
  }

  const { data: prizeRows, error: prizeError } = await supabase
    .from("trophy_prizes")
    .select("trophy, prize")
    .eq("league_id", leagueId);

  if (prizeError) {
    const missing =
      prizeError.code === "42P01" ||
      prizeError.code === "PGRST205" ||
      /trophy_prizes/.test(prizeError.message);
    return {
      ok: false,
      reason: missing ? "missing_table" : "error",
      message: prizeError.message,
    };
  }

  const prizes = emptyTrophyCounts();
  for (const row of prizeRows ?? []) {
    if (isTrophyType(row.trophy)) prizes[row.trophy] = row.prize;
  }

  const byTeam = new Map<string, TrophyCounts>();
  for (const row of data ?? []) {
    if (!isTrophyType(row.trophy)) continue;
    const counts = byTeam.get(row.team_id) ?? emptyTrophyCounts();
    counts[row.trophy] = row.count;
    byTeam.set(row.team_id, counts);
  }

  const cabinets = teams.map((team) => {
    const trophies = byTeam.get(team.id) ?? emptyTrophyCounts();
    const total = Object.values(trophies).reduce((a, b) => a + b, 0);
    return {
      team: {
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        logo_url: team.logo_url,
        primary_color: team.primary_color,
        budget: team.budget,
      },
      trophies,
      total,
    };
  });

  return { ok: true, cabinets, prizes };
}
