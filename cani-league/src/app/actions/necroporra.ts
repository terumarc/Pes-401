"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

/** Guarda la porra de quien ha entrado: todos los clubes, del primero al último. */
export async function saveNecroporraAction(leagueId: string, ranking: string[]): Promise<void> {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_necroporra", { p_league: leagueId, p_ranking: ranking });
  if (error) throw new Error(error.message);
  revalidatePath("/necroporra");
  revalidatePath("/calendar");
}
