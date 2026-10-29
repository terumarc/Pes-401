export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeScreen, type ClubChoice } from "@/components/auth/WelcomeScreen";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Bienvenida · Cani League" };

/** Primera entrada: elegir nombre y club. */
export default async function BienvenidaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, viewer] = await Promise.all([searchParams, getViewer()]);
  if (!viewer) redirect("/login");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/calendar";
  if (viewer.onboarded) redirect(safeNext);

  const supabase = await createClient();
  const [league, { data: members }] = await Promise.all([
    getPrimaryLeague(),
    supabase.from("members").select("display_name, team_id").not("team_id", "is", null),
  ]);
  const teams = league ? await getTeamsByLeague(league.id) : [];
  const owners = new Map((members ?? []).map((m) => [m.team_id as string, m.display_name]));

  const clubs: ClubChoice[] = teams
    .filter((t) => !/libre|sin equipo/i.test(t.name))
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.primary_color,
      logoUrl: t.logo_url,
      takenBy: owners.get(t.id) ?? null,
      // El nombre que ya tenía apuntado el club (owner_name) ayuda a encontrar el tuyo.
      hint: t.owner_name?.trim() || null,
    }))
    .sort((a, b) => Number(!!a.takenBy) - Number(!!b.takenBy) || a.name.localeCompare(b.name, "es"));

  return <WelcomeScreen name={viewer.name} isAdmin={viewer.isAdmin} clubs={clubs} next={safeNext} />;
}
