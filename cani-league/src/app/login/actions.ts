"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginResult = { ok: true } | { ok: false; error: string };
/** `welcome`: es su primera vez (aún sin club) y toca elegir nombre y club. */
export type VerifyResult = { ok: true; welcome: boolean } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Paso 1: comprueba que el email está en la liga y manda el código. Si viene con
 * un enlace de invitación válido, el email entra en la liga en ese momento.
 */
export async function sendCodeAction(rawEmail: string, invite?: string | null): Promise<LoginResult> {
  const email = clean(rawEmail);
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Escribe un email válido." };

  const supabase = await createClient();
  const { data: invited, error: inviteErr } = await supabase.rpc("is_invited", { p_email: email });
  if (inviteErr) return { ok: false, error: "No se ha podido comprobar el email. Inténtalo de nuevo." };
  if (!invited) {
    if (!invite) {
      return {
        ok: false,
        error: "Este email no está en la liga. Entra con el enlace de invitación que hay en el grupo.",
      };
    }
    const { data: joined } = await supabase.rpc("join_with_code", { p_email: email, p_code: invite });
    if (!joined) {
      return { ok: false, error: "Este enlace de invitación ya no vale. Pide el nuevo en el grupo." };
    }
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "over_email_send_rate_limit" || error.status === 429) {
      return { ok: false, error: "Se han pedido demasiados códigos. Espera un poco y vuelve a intentarlo." };
    }
    if (code === "email_address_not_authorized") {
      return {
        ok: false,
        error: "El servidor de correo aún no puede enviar a este email. Un admin tiene que configurar el envío de correos.",
      };
    }
    return { ok: false, error: `No se ha podido enviar el código: ${error.message}` };
  }
  return { ok: true };
}

/** Paso 2: comprueba el código y deja la sesión iniciada. */
export async function verifyCodeAction(rawEmail: string, rawToken: string): Promise<VerifyResult> {
  const email = clean(rawEmail);
  const token = rawToken.replace(/\D/g, "");
  if (token.length < 6) return { ok: false, error: "El código tiene 6 cifras." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "otp_expired") return { ok: false, error: "El código ha caducado o no es correcto. Pide otro." };
    return { ok: false, error: "Código incorrecto. Revísalo o pide otro." };
  }

  const { data: member } = await supabase.rpc("claim_membership");
  return { ok: true, welcome: !!member && !member.onboarded_at };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
