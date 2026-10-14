"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { isTrophyType } from "@/lib/data/trophies";

const MAX_TROPHIES = 99;
const MAX_PRIZE = 2_000_000_000;

function revalidateTrophyViews() {
  invalidateMemCache("teams");
  for (const t of ["teams", "dashboard", "league"]) {
    try {
      revalidateTag(t, "max");
    } catch {}
  }
  try {
    revalidatePath("/trophies", "page");
    revalidatePath("/finances", "page");
    revalidatePath("/teams", "layout");
    revalidatePath("/league", "page");
  } catch {}
}

export type TrophyChangeResult = {
  count: number;
  budget: number;
  /** Dinero sumado (positivo) o descontado (negativo) del presupuesto. */
  budgetDelta: number;
};

/**
 * Suma o quita títulos de una competición a un equipo. Cada título sumado
 * añade el premio de esa competición al presupuesto del club; cada título
 * quitado lo descuenta.
 */
export async function changeTeamTrophyAction(
  teamId: string,
  trophy: string,
  delta: number,
): Promise<TrophyChangeResult> {
  if (!isTrophyType(trophy)) throw new Error("Trofeo no válido");

  const supabase = await createClient();

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, league_id, budget")
    .eq("id", teamId)
    .single();
  if (teamErr || !team) throw new Error(teamErr?.message || "Equipo no encontrado");

  const [{ data: current, error: curErr }, { data: prizeRow, error: prizeErr }] =
    await Promise.all([
      supabase
        .from("team_trophies")
        .select("count")
        .eq("team_id", teamId)
        .eq("trophy", trophy)
        .maybeSingle(),
      supabase
        .from("trophy_prizes")
        .select("prize")
        .eq("league_id", team.league_id)
        .eq("trophy", trophy)
        .maybeSingle(),
    ]);
  if (curErr) throw new Error(curErr.message);
  if (prizeErr) throw new Error(prizeErr.message);

  const previous = current?.count ?? 0;
  const next = Math.max(0, Math.min(MAX_TROPHIES, previous + Math.trunc(delta)));
  const applied = next - previous;
  const budgetDelta = applied * (prizeRow?.prize ?? 0);

  if (applied === 0) {
    return { count: previous, budget: team.budget, budgetDelta: 0 };
  }

  const { error: upErr } = await supabase.from("team_trophies").upsert(
    { team_id: teamId, trophy, count: next, updated_at: new Date().toISOString() },
    { onConflict: "team_id,trophy" },
  );
  if (upErr) throw new Error(upErr.message || "No se pudo guardar el trofeo");

  let budget = team.budget;
  if (budgetDelta !== 0) {
    budget = team.budget + budgetDelta;
    const { error: budgetErr } = await supabase
      .from("teams")
      .update({ budget })
      .eq("id", teamId);
    if (budgetErr) {
      // Deshacer el título para no dejar palmarés y presupuesto descuadrados
      await supabase
        .from("team_trophies")
        .upsert(
          { team_id: teamId, trophy, count: previous, updated_at: new Date().toISOString() },
          { onConflict: "team_id,trophy" },
        );
      throw new Error(budgetErr.message || "No se pudo actualizar el presupuesto");
    }
  }

  revalidateTrophyViews();
  return { count: next, budget, budgetDelta };
}

/** Fija el premio en metálico de una competición para la liga. */
export async function setTrophyPrizeAction(
  leagueId: string,
  trophy: string,
  prize: number,
): Promise<number> {
  if (!isTrophyType(trophy)) throw new Error("Trofeo no válido");
  if (!Number.isFinite(prize) || prize < 0) throw new Error("Premio no válido");
  const value = Math.min(MAX_PRIZE, Math.trunc(prize));

  const supabase = await createClient();
  const { error } = await supabase.from("trophy_prizes").upsert(
    { league_id: leagueId, trophy, prize: value, updated_at: new Date().toISOString() },
    { onConflict: "league_id,trophy" },
  );
  if (error) throw new Error(error.message || "No se pudo guardar el premio");

  try {
    revalidatePath("/trophies", "page");
  } catch {}
  return value;
}
