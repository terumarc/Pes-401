"use client";

import { createClient } from "@/lib/supabase/client";
import { getLeagueSeason } from "./season";
import type {
  Match,
  Player,
  PlayerCreateInput,
  PlayerUpdateInput,
  Team,
  TeamUpdateInput,
} from "@/types";


async function triggerServerRevalidate(tag?: string, path?: string) {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag, path }),
    });
  } catch {}
}

export type TransferResult = {
  player: Player;
  buyerBudget: number;
  sellerBudget: number;
};

/** Ficha un jugador: mueve al jugador, descuenta del comprador y abona al vendedor */
export async function transferPlayerClient(
  playerId: string,
  buyerTeamId: string,
): Promise<TransferResult> {
  const supabase = createClient();

  // 1. Leer jugador y precio
  const { data: player, error: playerErr } = await supabase
    .from("players")
    .select("*, team:teams(*)")
    .eq("id", playerId)
    .single();
  if (playerErr || !player) throw playerErr ?? new Error("Jugador no encontrado");
  if (!player.available_in_market) throw new Error("El jugador no está en el mercado");
  if (player.team_id === buyerTeamId) throw new Error("El jugador ya pertenece a este equipo");

  const price = player.transfer_price;

  // 2. Leer presupuesto del comprador
  const { data: buyer, error: buyerErr } = await supabase
    .from("teams")
    .select("id, budget")
    .eq("id", buyerTeamId)
    .single();
  if (buyerErr || !buyer) throw buyerErr ?? new Error("Equipo comprador no encontrado");
  if (buyer.budget < price)
    throw new Error(
      `Presupuesto insuficiente. Necesitas €${price.toLocaleString("es-ES")} pero tienes €${buyer.budget.toLocaleString("es-ES")}.`,
    );

  // 3. Leer presupuesto del vendedor
  const { data: seller, error: sellerErr } = await supabase
    .from("teams")
    .select("id, budget")
    .eq("id", player.team_id)
    .single();
  if (sellerErr || !seller) throw sellerErr ?? new Error("Equipo vendedor no encontrado");

  // 4. Mover jugador + sacarlo del mercado
  const { data: updatedPlayer, error: moveErr } = await supabase
    .from("players")
    .update({ team_id: buyerTeamId, available_in_market: false, contract_seasons_left: null })
    .eq("id", playerId)
    .select("*")
    .single();
  if (moveErr || !updatedPlayer) throw moveErr ?? new Error("Error al mover el jugador");

  // 5. Descontar del comprador
  const newBuyerBudget = buyer.budget - price;
  const { error: buyerUpdateErr } = await supabase
    .from("teams")
    .update({ budget: newBuyerBudget })
    .eq("id", buyerTeamId);
  if (buyerUpdateErr) throw buyerUpdateErr;

  // 6. Abonar al vendedor
  const newSellerBudget = seller.budget + price;
  const { error: sellerUpdateErr } = await supabase
    .from("teams")
    .update({ budget: newSellerBudget })
    .eq("id", player.team_id);
  if (sellerUpdateErr) throw sellerUpdateErr;

  // 7. Registrar el fichaje en la tabla de transferencias
  const buyerTeamData = await supabase
    .from("teams")
    .select("name, league_id")
    .eq("id", buyerTeamId)
    .single();
  const sellerTeamData = await supabase
    .from("teams")
    .select("name")
    .eq("id", player.team_id)
    .single();

  if (buyerTeamData.data && sellerTeamData.data) {
    await supabase.from("transfers").insert({
      league_id: buyerTeamData.data.league_id,
      player_id: playerId,
      player_name: player.name,
      from_team_id: player.team_id,
      from_team_name: sellerTeamData.data.name,
      to_team_id: buyerTeamId,
      to_team_name: buyerTeamData.data.name,
      fee: price,
    });
  }

  await triggerServerRevalidate();

  return {
    player: updatedPlayer,
    buyerBudget: newBuyerBudget,
    sellerBudget: newSellerBudget,
  };
}

export async function updateTeamClient(
  id: string,
  input: TeamUpdateInput,
): Promise<Team> {
  try {
    const { updateTeamAction } = await import("@/app/actions/teams");
    return await updateTeamAction(id, input);
  } catch {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("teams")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    await triggerServerRevalidate("teams");
    return data;
  }
}

export async function createPlayerClient(
  input: PlayerCreateInput,
): Promise<Player> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  await triggerServerRevalidate("players");
  return data;
}

export async function updatePlayerClient(
  id: string,
  input: PlayerUpdateInput,
): Promise<Player> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  await triggerServerRevalidate("players");
  return data;
}

export async function deletePlayerClient(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
  await triggerServerRevalidate("players");
}

export async function setPlayerMarketClient(
  id: string,
  available: boolean,
): Promise<Player> {
  return updatePlayerClient(id, { available_in_market: available });
}

export async function reorderStandingsClient(
  leagueId: string,
  orderedTeamIds: string[],
): Promise<void> {
  const supabase = createClient();

  const { data: current, error: fetchError } = await supabase
    .from("league_standings")
    .select("*")
    .eq("league_id", leagueId);

  if (fetchError) throw fetchError;

  const currentByTeam = new Map(
    (current ?? []).map((row) => [row.team_id, row]),
  );

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

  await triggerServerRevalidate("standings");
}

// ─── Partidos ────────────────────────────────────────────────

import { calculateStartingBudget } from "@/lib/economy";

export async function recordMatchResultClient(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  scorers?: { teamId: string; playerId: string | null; playerName: string; goals: number }[],
): Promise<Match> {
  try {
    const res = await fetch("/api/matches/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeGoals, awayGoals, scorers }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.match) return json.match as Match;
    }
  } catch {}

  const supabase = createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({
      home_goals: homeGoals,
      away_goals: awayGoals,
      played: true,
      played_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select("*")
    .single();
  if (error) throw error;

  await triggerServerRevalidate();

  return data as Match;
}

export async function recordDirectMatchClient(
  leagueId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
  preferredMatchId?: string,
): Promise<Match> {
  const supabase = createClient();

  if (preferredMatchId) {
    return recordMatchResultClient(preferredMatchId, homeGoals, awayGoals);
  }

  // Solo se buscan partidos de la temporada en curso.
  const season = await getLeagueSeason(supabase, leagueId);

  // 1. Buscar si hay partido pendiente con este orden exacto (local/visitante)
  const { data: exactMatch } = await supabase
    .from("matches")
    .select("*")
    .eq("league_id", leagueId)
    .eq("season", season)
    .eq("home_team_id", homeTeamId)
    .eq("away_team_id", awayTeamId)
    .eq("played", false)
    .order("matchday", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (exactMatch) {
    return recordMatchResultClient(exactMatch.id, homeGoals, awayGoals);
  }

  // 2. Buscar si hay partido pendiente invertido
  const { data: reverseMatch } = await supabase
    .from("matches")
    .select("*")
    .eq("league_id", leagueId)
    .eq("season", season)
    .eq("home_team_id", awayTeamId)
    .eq("away_team_id", homeTeamId)
    .eq("played", false)
    .order("matchday", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (reverseMatch) {
    const { data: updatedMatch, error: updateErr } = await supabase
      .from("matches")
      .update({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_goals: homeGoals,
        away_goals: awayGoals,
        played: true,
        played_at: new Date().toISOString(),
      })
      .eq("id", reverseMatch.id)
      .select("*")
      .single();

    if (updateErr) throw updateErr;
    await triggerServerRevalidate();
    return updatedMatch as Match;
  }

  // 3. Si no hay fixture previo, crear y guardar el partido jugado
  const { data: newMatch, error: insertErr } = await supabase
    .from("matches")
    .insert({
      league_id: leagueId,
      season,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      matchday: 99,
      round: 1,
      home_goals: homeGoals,
      away_goals: awayGoals,
      played: true,
      played_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertErr) throw insertErr;
  await triggerServerRevalidate();
  return newMatch as Match;
}

export async function resetMatchResultClient(matchId: string): Promise<Match> {
  const supabase = createClient();
  await supabase.from("match_goals").delete().eq("match_id", matchId);
  const { data, error } = await supabase
    .from("matches")
    .update({ home_goals: null, away_goals: null, played: false, played_at: null })
    .eq("id", matchId)
    .select("*")
    .single();
  if (error) throw error;
  await triggerServerRevalidate("matches");
  return data as Match;
}

export async function generateFixturesClient(
  leagueId: string,
  teamIds?: string[],
): Promise<void> {
  const res = await fetch("/api/matches/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leagueId }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Error al generar el calendario");
  }
}

import { ECONOMY_CONFIG } from "@/lib/economy";

export async function resetLeagueClient(
  leagueId: string,
  mode: "calendar" | "league" = "league",
): Promise<void> {
  const res = await fetch("/api/matches/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leagueId, mode }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      json.error ||
        (mode === "calendar"
          ? "Error al reiniciar el calendario"
          : "Error al resetear la liga"),
    );
  }
}

export type ReleaseResult = {
  player: Player;
  sellerTeamId: string;
  sellerTeamName: string;
  previousBudget: number;
  newBudget: number;
  originalPrice: number;
  releaseFee: number;
};

export async function releasePlayerClient(
  playerId: string,
): Promise<ReleaseResult> {
  const res = await fetch("/api/market/release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Error al liberar al jugador");
  }

  return json as ReleaseResult;
}

