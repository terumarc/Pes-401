export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { UsersManager, type MemberView } from "@/components/auth/UsersManager";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export default async function UsuariosPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/usuarios");
  if (!viewer.isAdmin) redirect("/calendar");

  const supabase = await createClient();
  const [league, { data: members }] = await Promise.all([
    getPrimaryLeague(),
    supabase.from("members").select("*").order("display_name"),
  ]);
  const teams = league ? await getTeamsByLeague(league.id) : [];
  const clubs = teams
    .filter((t) => !/libre|sin equipo/i.test(t.name))
    .map((t) => ({ id: t.id, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const views: MemberView[] = (members ?? []).map((m) => ({
    id: m.id,
    email: m.email,
    name: m.display_name,
    teamId: m.team_id,
    isAdmin: m.is_admin,
    joined: !!m.user_id,
    lastSeen: m.last_seen_at,
  }));

  return (
    <div className="animate-fade-up mx-auto max-w-2xl pb-12">
      <PageHeader title="Usuarios" />
      <UsersManager members={views} clubs={clubs} meId={viewer.memberId} />
    </div>
  );
}
