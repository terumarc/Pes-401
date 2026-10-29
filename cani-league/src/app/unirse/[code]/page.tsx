export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EntryScreen } from "@/components/auth/EntryScreen";
import { getEntryData } from "@/lib/data/entry";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Únete a la Cani League",
  description: "Te han invitado a la liga de PES 6 de los amigos. Elige tu club.",
};

/** Enlace de invitación que se comparte en el grupo: /unirse/<código>. */
export default async function UnirsePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isSupabaseConfigured()) return null;

  // Quien ya está dentro no necesita invitación.
  if (await getViewer()) redirect("/calendar");

  const supabase = await createClient();
  const [{ data: valid }, { season, clubs }] = await Promise.all([
    supabase.rpc("is_valid_invite", { p_code: code }),
    getEntryData(),
  ]);

  return (
    <EntryScreen
      season={season}
      clubs={clubs}
      next="/calendar"
      invite={valid ? code : null}
      initialError={valid ? null : "Este enlace de invitación ya no vale. Pide el nuevo en el grupo."}
    />
  );
}
