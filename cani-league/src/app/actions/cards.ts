"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { getPendingCard } from "@/lib/data/cards";
import { getViewer, requireViewer } from "@/lib/auth";
import type { CardDraw } from "@/lib/cards";

/** La carta boca abajo del club de quien está usando la app. */
export async function getMyPendingCardAction(): Promise<CardDraw | null> {
  const viewer = await getViewer();
  if (!viewer?.teamId) return null;
  return getPendingCard(viewer.teamId);
}

/** Gira la carta: queda en las noticias y se avisa a los clubes implicados. El dinero ya se movió al sacarla. */
export async function revealCardAction(drawId: string): Promise<{ budget: number | null }> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reveal_card", { p_draw: drawId });
  if (error) throw new Error(error.message);

  const teamId = data?.team_id ?? viewer.teamId;
  const { data: team } = teamId
    ? await supabase.from("teams").select("budget").eq("id", teamId).maybeSingle()
    : { data: null };

  invalidateMemCache();
  try {
    revalidateTag("teams", "max");
    revalidatePath("/noticias");
    revalidatePath("/teams");
    revalidatePath("/finances");
    revalidatePath("/movimientos");
  } catch {}

  return { budget: team?.budget ?? null };
}
