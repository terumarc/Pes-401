"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { invalidatePlayersCache } from "@/lib/data/league";
import { revalidateTag, revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/auth";
import type { Team, TeamUpdateInput } from "@/types";

export async function updateTeamAction(
  id: string,
  input: TeamUpdateInput
): Promise<Team> {
  const viewer = await requireTeam(id);
  const supabase = await createClient();

  // El presupuesto solo lo cambia un admin; queda apuntado en los movimientos.
  let budgetChange: { from: number; to: number } | null = null;
  if (input.budget !== undefined) {
    const { data: current } = await supabase.from("teams").select("budget").eq("id", id).single();
    if (current && current.budget !== input.budget) {
      if (!viewer.isAdmin) throw new Error("Solo un admin puede cambiar el presupuesto.");
      budgetChange = { from: current.budget, to: input.budget };
    }
  }

  const { data, error } = await supabase
    .from("teams")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Error al actualizar el club");
  }

  if (budgetChange) {
    const delta = budgetChange.to - budgetChange.from;
    await supabase.rpc("log_app_event", {
      p_kind: "budget_adjust",
      p_team: id,
      p_amount: delta,
      p_title: `Ajuste de presupuesto de ${data.name}`,
      p_payload: { from: budgetChange.from, to: budgetChange.to },
    });
  }

  // 1. Limpiar toda la caché en memoria del servidor
  invalidateMemCache();
  invalidatePlayersCache();

  // 2. Invalidar todos los tags relacionados con equipos y clasificaciones en Next.js
  const tags = ["teams", "standings", "dashboard", "league", "matches"];
  for (const t of tags) {
    try {
      revalidateTag(t, "max");
    } catch {}
  }

  // 3. Invalidar layouts y paths para sincronizar el Client Router Cache del navegador
  try {
    revalidatePath("/", "layout");
    revalidatePath("/teams", "layout");
    revalidatePath("/teams", "page");
    revalidatePath(`/teams/${id}`, "page");
    revalidatePath(`/teams/${id}`, "layout");
    revalidatePath("/league", "page");
    revalidatePath("/standings", "page");
    revalidatePath("/finances", "page");
  } catch {}

  return data;
}
