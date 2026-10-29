"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type ProfileResult = { ok: true } | { ok: false; error: string };

/** Crea un enlace de invitación nuevo; el anterior deja de valer. */
export async function newInviteCodeAction(): Promise<ProfileResult & { code?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Solo un admin puede crear enlaces de invitación." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("new_invite_code");
  if (error || !data) return { ok: false, error: error?.message ?? "No se ha podido crear el enlace." };
  try {
    revalidatePath("/usuarios");
  } catch {}
  return { ok: true, code: data };
}
