import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { getPrimaryLeague } from "@/lib/data/league";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Únete a la Cani League",
  description: "Te han invitado a la liga de PES 6 de los amigos.",
};

/** Enlace de invitación que se comparte en el grupo: /unirse/<código>. */
export default async function UnirsePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isSupabaseConfigured()) return null;

  // Quien ya ha entrado no necesita invitación.
  const viewer = await getViewer();
  if (viewer) redirect(viewer.onboarded ? "/calendar" : "/bienvenida");

  const supabase = await createClient();
  const [{ data: valid }, league] = await Promise.all([
    supabase.rpc("is_valid_invite", { p_code: code }),
    getPrimaryLeague().catch(() => null),
  ]);

  return (
    <LoginScreen
      season={league?.season ?? null}
      next="/calendar"
      invite={valid ? code : null}
      initialError={valid ? null : "Este enlace de invitación ya no vale. Pide el nuevo en el grupo."}
    />
  );
}
