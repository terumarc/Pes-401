"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AuthError, requireAdmin } from "@/lib/auth";

export type MemberInput = {
  displayName: string;
  teamId: string | null;
  isAdmin: boolean;
};

/** Se devuelve el error en vez de lanzarlo: así el mensaje llega tal cual a la pantalla. */
export type MemberResult = { ok: true } | { ok: false; error: string };

function clean(input: MemberInput) {
  return {
    display_name: input.displayName.trim(),
    team_id: input.teamId || null,
    is_admin: input.isAdmin,
  };
}

function validate(row: ReturnType<typeof clean>): string | null {
  if (!row.display_name) return "Escribe un nombre.";
  if (row.display_name.length > 40) return "El nombre es demasiado largo.";
  return null;
}

function friendly(message: string): string {
  if (/members_team_key/i.test(message)) return "Ese club ya es de otra persona. Cámbiale antes de club.";
  if (/al menos un admin/i.test(message)) return "Tiene que quedar al menos un admin.";
  return message;
}

async function guard(): Promise<MemberResult | null> {
  try {
    await requireAdmin();
    return null;
  } catch (e) {
    return { ok: false, error: e instanceof AuthError ? e.message : "No tienes permiso." };
  }
}

function done(): MemberResult {
  try {
    revalidatePath("/usuarios");
    revalidatePath("/", "layout");
  } catch {}
  return { ok: true };
}

export async function updateMemberAction(id: string, input: MemberInput): Promise<MemberResult> {
  const denied = await guard();
  if (denied) return denied;
  const row = clean(input);
  const invalid = validate(row);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("members").update(row).eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  return done();
}

export async function removeMemberAction(id: string): Promise<MemberResult> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  return done();
}

/** Saca de la liga los móviles de alguien (por si alguien ha entrado con un club que no es el suyo). */
export async function removeDevicesAction(id: string): Promise<MemberResult> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member_devices", { p_member: id });
  if (error) return { ok: false, error: friendly(error.message) };
  return done();
}
