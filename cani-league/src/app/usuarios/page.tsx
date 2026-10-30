export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { UsersManager, type MemberView } from "@/components/auth/UsersManager";
import { InviteLinkCard } from "@/components/auth/InviteLinkCard";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export default async function UsuariosPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/usuarios");
  if (!viewer.isAdmin) redirect("/calendar");

  const supabase = await createClient();
  const [league, { data: members }, h] = await Promise.all([
    getPrimaryLeague(),
    supabase.from("members").select("id, display_name, team_id, is_admin, last_seen_at").order("display_name"),
    headers(),
  ]);
  const { data: devices } = await supabase.from("member_devices").select("member_id");
  const deviceCount = new Map<string, number>();
  for (const d of devices ?? []) deviceCount.set(d.member_id, (deviceCount.get(d.member_id) ?? 0) + 1);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const teams = league ? await getTeamsByLeague(league.id) : [];
  const clubs = teams
    .filter((t) => !/libre|sin equipo/i.test(t.name))
    .map((t) => ({ id: t.id, name: t.name, logoUrl: t.logo_url, color: t.primary_color }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const views: MemberView[] = (members ?? []).map((m) => ({
    id: m.id,
    name: m.display_name,
    teamId: m.team_id,
    isAdmin: m.is_admin,
    devices: deviceCount.get(m.id) ?? 0,
    lastSeen: m.last_seen_at,
  }));

  return (
    <div className="animate-fade-up mx-auto max-w-2xl pb-12">
      <PageHeader title="Usuarios" />
      <div className="space-y-8">
        <InviteLinkCard origin={origin} />
        <UsersManager members={views} clubs={clubs} meId={viewer.memberId} />
      </div>
    </div>
  );
}
