"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin, requireTeam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { calendarKeyOf, getRenewalTable } from "@/lib/data/contracts";
import { TIERS, getContractDuration, getRenewalCost, isContractExpired } from "@/lib/contracts";
import { formatMoney } from "@/lib/format/money";
import type { TierName } from "@/lib/players";
import type { Player } from "@/types";

function refresh() {
  invalidateMemCache();
  try {
    revalidateTag("teams", "max");
    revalidatePath("/finances", "page");
    revalidatePath("/players", "layout");
    revalidatePath("/teams", "layout");
    revalidatePath("/movimientos");
  } catch {}
}

/** Guarda lo que cuesta renovar un nivel (en % de su precio). Solo admins. */
export async function setRenewalPercentAction(leagueId: string, tier: string, percent: number): Promise<number> {
  if (!TIERS.includes(tier as TierName)) throw new Error("Nivel no válido.");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("La renovación debe estar entre 0 y 100 %.");
  const value = Math.round(percent * 100) / 100;
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("contract_renewals")
    .upsert({ league_id: leagueId, tier, percent: value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`No se pudo guardar la renovación: ${error.message}`);
  refresh();
  return value;
}

/** Renueva un contrato acabado: el club paga la renovación y el contrato vuelve a estar completo. */
export async function renewContractAction(playerId: string): Promise<{ cost: number }> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("players").select("*").eq("id", playerId).maybeSingle();
  const player = row as Player | null;
  if (!player?.team_id) throw new Error("Jugador no encontrado.");
  await requireTeam(player.team_id);
  if (!isContractExpired(player)) throw new Error("Su contrato todavía no se ha acabado.");

  const { data: team } = await supabase.from("teams").select("id, name, budget, league_id").eq("id", player.team_id).single();
  if (!team) throw new Error("Club no encontrado.");
  const cost = getRenewalCost(player, await getRenewalTable(team.league_id, supabase));
  if ((team.budget ?? 0) < cost) {
    throw new Error(`No hay presupuesto: renovar cuesta ${formatMoney(cost)} y el club tiene ${formatMoney(team.budget ?? 0)}.`);
  }

  const { error: budgetErr } = await supabase.from("teams").update({ budget: team.budget - cost }).eq("id", team.id);
  if (budgetErr) throw new Error(budgetErr.message);
  const { error: playerErr } = await supabase
    .from("players")
    .update({ contract_seasons_left: getContractDuration(player) })
    .eq("id", player.id);
  if (playerErr) {
    await supabase.from("teams").update({ budget: team.budget }).eq("id", team.id);
    throw new Error(playerErr.message);
  }

  // Queda en el historial (el trigger lo apunta como «Renovación de …»).
  const { data: matches } = await supabase.from("matches").select("created_at").eq("league_id", team.league_id).limit(500);
  await supabase.from("contract_events").insert({
    league_id: team.league_id,
    calendar_key: calendarKeyOf(matches ?? []),
    team_id: team.id,
    player_id: player.id,
    player_name: player.name,
    team_name: team.name,
    kind: "renewal",
    amount: cost,
  });

  refresh();
  return { cost };
}
