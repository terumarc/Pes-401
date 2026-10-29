"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EnterResult = { ok: true } | { ok: false; error: string };

function done(): EnterResult {
  try {
    revalidatePath("/", "layout");
  } catch {}
  return { ok: true };
}

/**
 * Elegir club con el enlace del grupo. Si está libre, se queda con él quien lo
 * elige (con su nombre); si ya tiene dueño, este móvil entra como él y al dueño
 * le llega un aviso. Sin correo, sin código y sin PIN: el móvil queda recordado.
 * La sesión anónima de este móvil la abre el navegador antes de llamar aquí.
 */
export async function joinClubAction(input: { teamId: string; name: string | null; invite: string | null }): Promise<EnterResult> {
  if (!input.invite) return { ok: false, error: "Para entrar, abre el enlace de invitación del grupo." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_club", {
    p_team: input.teamId,
    p_name: input.name?.trim() || null,
    p_code: input.invite,
  });
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
