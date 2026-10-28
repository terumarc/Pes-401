"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AuthError, requireAdmin } from "@/lib/auth";

export type MemberInput = {
  email: string;
  displayName: string;
  teamId: string | null;
  isAdmin: boolean;
};

/** Se devuelve el error en vez de lanzarlo: así el mensaje llega tal cual a la pantalla. */
export type MemberResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(input: MemberInput) {
  return {
    email: input.email.trim().toLowerCase(),
    display_name: input.displayName.trim(),
    team_id: input.teamId || null,
    is_admin: input.isAdmin,
  };
}

function validate(row: ReturnType<typeof clean>): string | null {
  if (!row.display_name) return "Escribe un nombre.";
  if (!EMAIL_RE.test(row.email)) return "Escribe un email válido.";
  return null;
}

function friendly(message: string): string {
  if (/members_email_key|duplicate key/i.test(message)) return "Ese email ya está en la liga.";
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

export async function addMemberAction(input: MemberInput): Promise<MemberResult> {
  const denied = await guard();
  if (denied) return denied;
  const row = clean(input);
  const invalid = validate(row);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("members").insert(row);
  if (error) return { ok: false, error: friendly(error.message) };
  return done();
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
