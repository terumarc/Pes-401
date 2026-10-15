"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidatePlayersCache } from "@/lib/data/league";
import { invalidateMemCache } from "@/lib/data/cache";
import { getMarketWindow } from "@/lib/data/season";

const isSystemTeam = (name: string | null | undefined) => /libre|sin equipo/i.test(name ?? "");

function refresh() {
  invalidatePlayersCache();
  invalidateMemCache();
  try {
    revalidateTag("players", "max");
    revalidateTag("teams", "max");
    revalidatePath("/market");
    revalidatePath("/players", "layout");
    revalidatePath("/teams", "layout");
    revalidatePath("/finances");
  } catch {}
}

export type OfferInput = {
  playerId: string;
  buyerTeamId: string;
  amount: number;
  swapPlayerId?: string | null;
};

/** Un club ofrece dinero (y si quiere, un jugador suyo) por un jugador de otro club. */
export async function createOfferAction(input: OfferInput): Promise<void> {
  const amount = Math.max(0, Math.round(Number(input.amount) || 0));
  const supabase = await createClient();

  const { data: player } = await supabase.from("players").select("id, name, team_id, team:teams(id, name, league_id)").eq("id", input.playerId).single();
  if (!player) throw new Error("Jugador no encontrado.");
  const seller = player.team as unknown as { id: string; name: string; league_id: string } | null;
  if (!seller || isSystemTeam(seller.name)) throw new Error("Es agente libre: fíchalo directamente desde el mercado.");
  if (seller.id === input.buyerTeamId) throw new Error("El jugador ya es de ese club.");

  const { data: buyer } = await supabase.from("teams").select("id, name, budget").eq("id", input.buyerTeamId).single();
  if (!buyer || isSystemTeam(buyer.name)) throw new Error("Elige el club que hace la oferta.");
  if (buyer.budget < amount) throw new Error(`${buyer.name} no tiene presupuesto para ofrecer esa cantidad.`);

  const swap: string | null = input.swapPlayerId || null;
  if (swap) {
    const { data: sp } = await supabase.from("players").select("team_id").eq("id", swap).single();
    if (!sp || sp.team_id !== buyer.id) throw new Error("El jugador del intercambio tiene que ser del club que oferta.");
  }
  if (amount === 0 && !swap) throw new Error("La oferta necesita dinero o un jugador a cambio.");

  // Una sola oferta pendiente por club y jugador: la nueva sustituye a la anterior.
  await supabase
    .from("transfer_offers")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("player_id", player.id)
    .eq("buyer_team_id", buyer.id)
    .eq("status", "pending");

  const { error } = await supabase.from("transfer_offers").insert({
    league_id: seller.league_id,
    player_id: player.id,
    buyer_team_id: buyer.id,
    seller_team_id: seller.id,
    amount,
    swap_player_id: swap,
  });
  if (error) throw new Error(`No se pudo enviar la oferta: ${error.message}`);
  refresh();
}

async function closeOffer(offerId: string, status: "rejected" | "cancelled") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transfer_offers")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  refresh();
}

/** El dueño del jugador rechaza la oferta. */
export async function rejectOfferAction(offerId: string): Promise<void> {
  await closeOffer(offerId, "rejected");
}

/** El club que ofertó la retira. */
export async function cancelOfferAction(offerId: string): Promise<void> {
  await closeOffer(offerId, "cancelled");
}

/**
 * El dueño del jugador acepta: solo con el mercado abierto.
 * Se mueven el dinero y los jugadores, se apuntan los fichajes y caducan
 * las demás ofertas pendientes por esos jugadores.
 */
export async function acceptOfferAction(offerId: string): Promise<void> {
  const supabase = await createClient();
  const { data: offer } = await supabase.from("transfer_offers").select("*").eq("id", offerId).single();
  if (!offer || offer.status !== "pending") throw new Error("Esta oferta ya no está pendiente.");

  const window = await getMarketWindow(supabase, offer.league_id);
  if (!window.open) throw new Error(`Mercado cerrado. ${window.reason}`);

  const [{ data: player }, { data: buyer }, { data: seller }, swapRes] = await Promise.all([
    supabase.from("players").select("id, name, team_id").eq("id", offer.player_id).single(),
    supabase.from("teams").select("id, name, budget").eq("id", offer.buyer_team_id).single(),
    supabase.from("teams").select("id, name, budget").eq("id", offer.seller_team_id).single(),
    offer.swap_player_id
      ? supabase.from("players").select("id, name, team_id").eq("id", offer.swap_player_id).single()
      : Promise.resolve({ data: null }),
  ]);
  const swap = swapRes.data as { id: string; name: string; team_id: string } | null;

  if (!player || !buyer || !seller) throw new Error("Faltan datos de la oferta.");
  if (player.team_id !== seller.id) {
    await closeOffer(offerId, "cancelled");
    throw new Error(`${player.name} ya no está en ${seller.name}. La oferta se ha cancelado.`);
  }
  if (offer.swap_player_id && (!swap || swap.team_id !== buyer.id)) {
    await closeOffer(offerId, "cancelled");
    throw new Error("El jugador del intercambio ya no está en el club que ofertó. La oferta se ha cancelado.");
  }
  if (buyer.budget < offer.amount) throw new Error(`${buyer.name} ya no tiene presupuesto para pagar esta oferta.`);

  // Marca la oferta primero: si dos personas aceptan a la vez, solo una sigue.
  const { data: claimed } = await supabase
    .from("transfer_offers")
    .update({ status: "accepted", resolved_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "pending")
    .select("id");
  if (!claimed?.length) throw new Error("Esta oferta ya no está pendiente.");

  if (offer.amount > 0) {
    await supabase.from("teams").update({ budget: buyer.budget - offer.amount }).eq("id", buyer.id);
    await supabase.from("teams").update({ budget: seller.budget + offer.amount }).eq("id", seller.id);
  }
  await supabase.from("players").update({ team_id: buyer.id, available_in_market: false, contract_seasons_left: null }).eq("id", player.id);
  if (swap) {
    await supabase.from("players").update({ team_id: seller.id, available_in_market: false, contract_seasons_left: null }).eq("id", swap.id);
  }

  const rows = [
    {
      league_id: offer.league_id,
      player_id: player.id,
      player_name: player.name,
      from_team_id: seller.id,
      from_team_name: seller.name,
      to_team_id: buyer.id,
      to_team_name: buyer.name,
      fee: offer.amount,
    },
  ];
  if (swap) {
    rows.push({
      league_id: offer.league_id,
      player_id: swap.id,
      player_name: swap.name,
      from_team_id: buyer.id,
      from_team_name: buyer.name,
      to_team_id: seller.id,
      to_team_name: seller.name,
      fee: 0,
    });
  }
  await supabase.from("transfers").insert(rows);

  // Las demás ofertas por estos jugadores ya no tienen sentido.
  const moved = [player.id, ...(swap ? [swap.id] : [])];
  const now = new Date().toISOString();
  for (const id of moved) {
    await supabase.from("transfer_offers").update({ status: "cancelled", resolved_at: now }).eq("status", "pending").eq("player_id", id);
    await supabase.from("transfer_offers").update({ status: "cancelled", resolved_at: now }).eq("status", "pending").eq("swap_player_id", id);
  }

  refresh();
}
