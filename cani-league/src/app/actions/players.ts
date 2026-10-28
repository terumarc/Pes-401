"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidatePlayersCache } from "@/lib/data/league";
import { invalidateMemCache } from "@/lib/data/cache";
import { requireAdmin, requireTeam } from "@/lib/auth";
import type { Player, PlayerCreateInput, PlayerUpdateInput } from "@/types";

function refresh() {
  invalidatePlayersCache();
  invalidateMemCache();
  try {
    revalidateTag("players", "max");
    revalidateTag("teams", "max");
    revalidatePath("/players", "layout");
    revalidatePath("/teams", "layout");
    revalidatePath("/market");
  } catch {}
}

/** Alta de un jugador en la base de datos: solo admins. */
export async function createPlayerAction(input: PlayerCreateInput): Promise<Player> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").insert(input).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el jugador.");
  refresh();
  return data as Player;
}

/** Editar la ficha de un jugador (medias, precio, club…): solo admins. */
export async function updatePlayerAction(id: string, input: PlayerUpdateInput): Promise<Player> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").update(input).eq("id", id).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo guardar el jugador.");
  refresh();
  return data as Player;
}

export async function deletePlayerAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

/** Poner o quitar un jugador del mercado: su club o un admin. */
export async function setPlayerMarketAction(id: string, available: boolean): Promise<Player> {
  const supabase = await createClient();
  const { data: player } = await supabase.from("players").select("team_id").eq("id", id).single();
  if (!player) throw new Error("Jugador no encontrado.");
  await requireTeam(player.team_id);
  const { data, error } = await supabase
    .from("players")
    .update({ available_in_market: available })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo guardar.");
  refresh();
  return data as Player;
}
