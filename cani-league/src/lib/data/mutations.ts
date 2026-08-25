"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Player,
  PlayerCreateInput,
  PlayerUpdateInput,
  Team,
  TeamUpdateInput,
} from "@/types";

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
    .update({ team_id: buyerTeamId, available_in_market: false })
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
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teams")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
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
  return data;
}

export async function deletePlayerClient(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
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
}

// ─── Partidos ────────────────────────────────────────────────

import type { Match } from "@/types";

export async function recordMatchResultClient(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
): Promise<Match> {
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
  return data as Match;
}

export async function resetMatchResultClient(matchId: string): Promise<Match> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ home_goals: null, away_goals: null, played: false, played_at: null })
    .eq("id", matchId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Match;
}

export async function generateFixturesClient(
  leagueId: string,
  teamIds: string[],
): Promise<void> {
  const supabase = createClient();

  const teamList = [...teamIds];
  if (teamList.length % 2 !== 0) teamList.push("BYE");

  const half = teamList.length / 2;
  const rounds = teamList.length - 1;
  const fixed = teamList[0];
  const rotating = teamList.slice(1);

  const inserts: any[] = [];

  for (let round = 0; round < rounds; round++) {
    const matchday = round + 1;
    const pairs: [string, string][] = [];

    pairs.push([fixed, rotating[round % (teamList.length - 1)]]);
    for (let i = 1; i < half; i++) {
      const home = rotating[(round + i) % (teamList.length - 1)];
      const away = rotating[(round + teamList.length - 1 - i) % (teamList.length - 1)];
      pairs.push([home, away]);
    }

    for (const [home, away] of pairs) {
      if (home === "BYE" || away === "BYE") continue;

      inserts.push({
        league_id: leagueId,
        home_team_id: home,
        away_team_id: away,
        matchday,
        round: 1,
        home_goals: null,
        away_goals: null,
        played: false,
        played_at: null,
      });

      inserts.push({
        league_id: leagueId,
        home_team_id: away,
        away_team_id: home,
        matchday: rounds + matchday,
        round: 2,
        home_goals: null,
        away_goals: null,
        played: false,
        played_at: null,
      });
    }
  }

  const { error } = await supabase.from("matches").insert(inserts);
  if (error) throw error;
}

export async function resetLeagueClient(leagueId: string): Promise<void> {
  const supabase = createClient();
  // Borrar todos los partidos de la liga
  const { error: matchesError } = await supabase.from("matches").delete().eq("league_id", leagueId);
  if (matchesError) throw matchesError;

  // Restaurar el presupuesto de los equipos (p. ej. a 50 millones por defecto)
  const { error: teamsError } = await supabase
    .from("teams")
    .update({ budget: 50000000 })
    .eq("league_id", leagueId);
  if (teamsError) throw teamsError;
}
