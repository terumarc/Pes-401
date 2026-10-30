import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { createClient } from "@/lib/supabase/server";

export type EntryClub = {
  id: string;
  name: string;
  color: string;
  logoUrl: string | null;
  /** Nombre de quien ya lo lleva en la app; null si está libre. */
  owner: string | null;
  /** Ya hay un móvil dentro con este club: nadie más puede entrar. */
  locked: boolean;
  /** Dueño apuntado en el club, para reconocer el tuyo. */
  hint: string | null;
};

/** Lo que necesita la pantalla de entrada: temporada y clubes (con escudo, color y si ya tienen dueño). */
export async function getEntryData(): Promise<{ season: string | null; clubs: EntryClub[] }> {
  const league = await getPrimaryLeague().catch(() => null);
  if (!league) return { season: null, clubs: [] };

  const supabase = await createClient();
  const [teams, { data: owners }] = await Promise.all([
    getTeamsByLeague(league.id).catch(() => []),
    supabase.rpc("entry_clubs_status"),
  ]);
  const ownerOf = new Map((owners ?? []).map((o) => [o.team_id, o.owner_name]));
  const lockedOf = new Map((owners ?? []).map((o) => [o.team_id, o.locked]));

  const clubs = teams
    .filter((t) => !/libre|sin equipo/i.test(t.name))
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.primary_color,
      logoUrl: t.logo_url,
      owner: ownerOf.get(t.id) ?? null,
      locked: lockedOf.get(t.id) ?? false,
      hint: t.owner_name?.trim() || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return { season: league.season, clubs };
}
