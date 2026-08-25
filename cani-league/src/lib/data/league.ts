import { createClient } from "@/lib/supabase/server";
import type {
  League,
  Player,
  PlayerCreateInput,
  PlayerUpdateInput,
  StandingWithTeam,
  Team,
  TeamUpdateInput,
  TeamWithStanding,
} from "@/types";

export async function getPrimaryLeague(): Promise<League | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getTeamsByLeague(leagueId: string): Promise<Team[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("league_id", leagueId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getTeamById(id: string): Promise<Team | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getStandingsWithTeams(
  leagueId: string,
): Promise<StandingWithTeam[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("league_standings")
    .select("*, team:teams(*)")
    .eq("league_id", leagueId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StandingWithTeam[];
}

export async function getTeamsWithStandings(
  leagueId: string,
): Promise<TeamWithStanding[]> {
  const standings = await getStandingsWithTeams(leagueId);
  const supabase = await createClient();

  const { data: counts, error } = await supabase
    .from("players")
    .select("team_id");

  if (error) throw error;

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    countMap.set(row.team_id, (countMap.get(row.team_id) ?? 0) + 1);
  }

  return standings.map((s) => ({
    ...s.team,
    position: s.position,
    previous_position: s.previous_position,
    player_count: countMap.get(s.team_id) ?? 0,
  }));
}

export async function updateTeam(
  id: string,
  input: TeamUpdateInput,
): Promise<Team> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getPlayers(options?: {
  teamId?: string;
  marketOnly?: boolean;
}): Promise<(Player & { team: Team })[]> {
  const supabase = await createClient();
  let query = supabase.from("players").select("*, team:teams(*)");

  if (options?.teamId) {
    query = query.eq("team_id", options.teamId);
  }
  if (options?.marketOnly) {
    query = query.eq("available_in_market", true);
  }

  const { data, error } = await query.order("overall", {
    ascending: false,
    nullsFirst: false,
  });

  if (error) throw error;
  return (data ?? []) as (Player & { team: Team })[];
}

export async function getPlayerById(
  id: string,
): Promise<(Player & { team: Team }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*, team:teams(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as (Player & { team: Team }) | null;
}

export async function createPlayer(input: PlayerCreateInput): Promise<Player> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlayer(
  id: string,
  input: PlayerUpdateInput,
): Promise<Player> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlayer(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

export async function getDashboardStats(leagueId: string) {
  const [teams, players, marketPlayers, standings] = await Promise.all([
    getTeamsByLeague(leagueId),
    getPlayers(),
    getPlayers({ marketOnly: true }),
    getStandingsWithTeams(leagueId),
  ]);

  const leaguePlayers = players.filter((p) =>
    teams.some((t) => t.id === p.team_id),
  );

  return {
    teams,
    teamCount: teams.length,
    playerCount: leaguePlayers.length,
    marketCount: marketPlayers.filter((p) =>
      teams.some((t) => t.id === p.team_id),
    ).length,
    standings,
  };
}

export async function reorderStandings(
  leagueId: string,
  orderedTeamIds: string[],
): Promise<void> {
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("league_standings")
    .select("*")
    .eq("league_id", leagueId);

  if (fetchError) throw fetchError;

  const currentByTeam = new Map(
    (current ?? []).map((row) => [row.team_id, row]),
  );

  // Two-phase update avoids unique (league_id, position) collisions
  // while keeping position >= 1
  for (let i = 0; i < orderedTeamIds.length; i++) {
    const teamId = orderedTeamIds[i];
    const row = currentByTeam.get(teamId);
    if (!row) continue;

    const { error } = await supabase
      .from("league_standings")
      .update({
        previous_position: row.position,
        position: 1000 + i + 1,
      })
      .eq("id", row.id);

    if (error) throw error;
  }

  for (let i = 0; i < orderedTeamIds.length; i++) {
    const teamId = orderedTeamIds[i];
    const row = currentByTeam.get(teamId);
    if (!row) continue;

    const { error } = await supabase
      .from("league_standings")
      .update({ position: i + 1 })
      .eq("id", row.id);

    if (error) throw error;
  }
}
