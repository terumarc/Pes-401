"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { invalidatePlayersCache } from "@/lib/data/league";
import { revalidateTag, revalidatePath } from "next/cache";
import type { Team, TeamUpdateInput } from "@/types";

export async function updateTeamAction(
  id: string,
  input: TeamUpdateInput
): Promise<Team> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Error al actualizar el club");
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
    revalidatePath("/dashboard", "page");
    revalidatePath("/league", "page");
    revalidatePath("/standings", "page");
    revalidatePath("/finances", "page");
  } catch {}

  return data;
}
