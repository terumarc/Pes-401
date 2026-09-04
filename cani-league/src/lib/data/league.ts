import { createClient, createStaticClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { safeCache, invalidateMemCache } from "./cache";
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

export const getPrimaryLeague = safeCache(
  async (): Promise<League | null> => {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("leagues")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  ["primary-league"],
  { revalidate: 3600, tags: ["league"] }
);

export const getTeamsByLeague = safeCache(
  async (leagueId: string): Promise<Team[]> => {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("league_id", leagueId)
      .order("name");

    if (error) throw error;
    // Excluir Agentes Libres y equipos de sistema de la lista de equipos de liga
    return (data ?? []).filter(
      (t) =>
        !t.name.toLowerCase().includes("libre") &&
        !t.name.toLowerCase().includes("sin equipo")
    );
  },
  ["teams-by-league"],
  { revalidate: 300, tags: ["teams"] }
);

export async function getTeamById(id: string): Promise<Team | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export const getStandingsWithTeams = safeCache(
  async (leagueId: string): Promise<StandingWithTeam[]> => {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("league_standings")
      .select("*, team:teams(*)")
      .eq("league_id", leagueId)
      .order("position", { ascending: true });

    if (error) throw error;
    return (data ?? []) as StandingWithTeam[];
  },
  ["standings-with-teams"],
  { revalidate: 120, tags: ["standings", "teams"] }
);

export const getTeamsWithStandings = safeCache(
  async (leagueId: string): Promise<TeamWithStanding[]> => {
    const standings = await getStandingsWithTeams(leagueId);
    const supabase = createStaticClient();

    const standingTeamIds = standings.map((s) => s.team_id);
    const { data: playersData, error } = await supabase
      .from("players")
      .select("team_id, name, overall, market_value")
      .in("team_id", standingTeamIds);

    if (error) throw error;

    type TeamStats = {
      count: number;
      totalOverall: number;
      overallCount: number;
      squadValue: number;
      topPlayer: { name: string; overall: number } | null;
    };

    const teamStatsMap = new Map<string, TeamStats>();

    for (const p of playersData ?? []) {
      const stat = teamStatsMap.get(p.team_id) ?? {
        count: 0,
        totalOverall: 0,
        overallCount: 0,
        squadValue: 0,
        topPlayer: null,
      };

      stat.count += 1;
      stat.squadValue += p.market_value || 0;

      if (p.overall != null) {
        stat.totalOverall += p.overall;
        stat.overallCount += 1;
        if (!stat.topPlayer || p.overall > stat.topPlayer.overall) {
          stat.topPlayer = { name: p.name, overall: p.overall };
        }
      }

      teamStatsMap.set(p.team_id, stat);
    }

    return standings.map((s) => {
      const stats = teamStatsMap.get(s.team_id);
      const avgOverall =
        stats && stats.overallCount > 0
          ? Math.round(stats.totalOverall / stats.overallCount)
          : undefined;

      return {
        ...s.team,
        position: s.position,
        previous_position: s.previous_position,
        player_count: stats?.count ?? 0,
        avg_overall: avgOverall,
        squad_value: stats?.squadValue ?? 0,
        top_player: stats?.topPlayer ?? undefined,
      };
    });
  },
  ["teams-with-standings"],
  { revalidate: 120, tags: ["teams", "standings", "players"] }
);

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
  invalidateMemCache("team");
  try {
    revalidateTag("teams", "max");
  } catch {}
  return data;
}

const PLAYER_LIST_COLUMNS =
  "id,team_id,name,short_name,photo_url,position,age,nationality,overall,speed,acceleration,shooting,passing,dribbling,defending,physical,market_value,transfer_price,available_in_market,created_at,team:teams(id,name,short_name,primary_color,logo_url)";

/** Internal helper to fetch all players in parallel chunks */
async function fetchAllPlayersInParallel(
  marketOnly = false,
): Promise<(Player & { team: Team })[]> {
  const supabase = createStaticClient();
  const pageSize = 1000;

  let countQuery = supabase
    .from("players")
    .select("*", { count: "exact", head: true });
  if (marketOnly) {
    countQuery = countQuery.eq("available_in_market", true);
  }
  const { count, error: countErr } = await countQuery;
  if (countErr) throw countErr;

  const total = count ?? 0;
  if (total === 0) return [];

  const totalPages = Math.ceil(total / pageSize);
  const pagePromises = Array.from({ length: totalPages }, (_, page) => {
    let query = supabase.from("players").select(PLAYER_LIST_COLUMNS);
    if (marketOnly) {
      query = query.eq("available_in_market", true);
    }
    return query
      .order("overall", { ascending: false, nullsFirst: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
  });

  const results = await Promise.all(pagePromises);
  const allPlayers: (Player & { team: Team })[] = [];
  for (const res of results) {
    if (res.error) throw res.error;
    if (res.data) {
      allPlayers.push(...(res.data as unknown as (Player & { team: Team })[]));
    }
  }

  return allPlayers;
}

let memoryAllPlayers: { data: (Player & { team: Team })[]; expires: number } | null = null;
let memoryMarketPlayers: { data: (Player & { team: Team })[]; expires: number } | null = null;

export function invalidatePlayersCache() {
  memoryAllPlayers = null;
  memoryMarketPlayers = null;
  invalidateMemCache("player");
}

export function invalidateTierCache() {
  invalidatePlayersCache();
}

async function getCachedAllPlayers(): Promise<(Player & { team: Team })[]> {
  const now = Date.now();
  if (memoryAllPlayers && memoryAllPlayers.expires > now) {
    return memoryAllPlayers.data;
  }
  const data = await fetchAllPlayersInParallel(false);
  memoryAllPlayers = { data, expires: now + 60_000 };
  return data;
}

async function getCachedMarketPlayers(): Promise<(Player & { team: Team })[]> {
  const now = Date.now();
  if (memoryMarketPlayers && memoryMarketPlayers.expires > now) {
    return memoryMarketPlayers.data;
  }
  const data = await fetchAllPlayersInParallel(true);
  memoryMarketPlayers = { data, expires: now + 60_000 };
  return data;
}

export async function getPlayers(options?: {
  teamId?: string;
  marketOnly?: boolean;
}): Promise<(Player & { team: Team })[]> {
  // If requesting players for a specific team, fetch directly (typically ~25 rows, very fast)
  if (options?.teamId) {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("players")
      .select("*, team:teams(*)")
      .eq("team_id", options.teamId)
      .order("overall", { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data ?? []) as (Player & { team: Team })[];
  }

  // If requesting all market players, use cached parallel loader
  if (options?.marketOnly) {
    return getCachedMarketPlayers();
  }

  // Otherwise return all players from cached parallel loader
  return getCachedAllPlayers();
}

export async function getPlayerById(
  id: string,
): Promise<(Player & { team: Team }) | null> {
  const supabase = createStaticClient();
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
  invalidatePlayersCache();
  try {
    revalidateTag("players", "max");
  } catch {}
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
  invalidatePlayersCache();
  try {
    revalidateTag("players", "max");
  } catch {}
  return data;
}

export async function deletePlayer(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
  invalidatePlayersCache();
  try {
    revalidateTag("players", "max");
  } catch {}
}

export async function getDashboardStats(leagueId: string) {
  // 1. Fetch teams and standings in parallel
  const [teams, standings] = await Promise.all([
    getTeamsByLeague(leagueId),
    getStandingsWithTeams(leagueId),
  ]);

  const teamIds = teams.map((t) => t.id);
  const supabase = createStaticClient();

  // 2. Fetch counts directly using lightweight HEAD requests (transfers 0 rows instead of 10,000!)
  const [playerCountRes, marketCountRes] = await Promise.all([
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .in("team_id", teamIds),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .in("team_id", teamIds)
      .eq("available_in_market", true),
  ]);

  return {
    teams,
    teamCount: teams.length,
    playerCount: playerCountRes.count ?? 0,
    marketCount: marketCountRes.count ?? 0,
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

  invalidateMemCache("standing");
  try {
    revalidateTag("standings", "max");
  } catch {}
}
