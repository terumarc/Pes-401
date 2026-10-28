"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTrophyType } from "@/lib/data/trophies";
import { applyTrophyChange, type TrophyChangeResult } from "@/lib/data/trophy-change";
import { requireAdmin } from "@/lib/auth";

const MAX_PRIZE = 2_000_000_000;

/** Suma o quita títulos a mano desde la sala de trofeos: solo admins. */
export async function changeTeamTrophyAction(
  teamId: string,
  trophy: string,
  delta: number,
): Promise<TrophyChangeResult> {
  await requireAdmin();
  return applyTrophyChange(teamId, trophy, delta);
}

/** Fija el premio en metálico de una competición para la liga. */
export async function setTrophyPrizeAction(
  leagueId: string,
  trophy: string,
  prize: number,
): Promise<number> {
  if (!isTrophyType(trophy)) throw new Error("Trofeo no válido");
  if (!Number.isFinite(prize) || prize < 0) throw new Error("Premio no válido");
  await requireAdmin();
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
