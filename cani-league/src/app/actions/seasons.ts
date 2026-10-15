"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { changeTeamTrophyAction } from "@/app/actions/trophies";
import { calendarKeyOf, closeSeasonContracts } from "@/lib/data/contracts";
import { generateFixtures } from "@/lib/data/matches";
import { buildLeagueTable } from "@/lib/data/matches";
import { topScorers, type GoalRow } from "@/lib/stats";
import type { League, MatchWithTeams, Team } from "@/types";

const isSystemTeam = (name: string) => /libre|sin equipo/i.test(name);

/** Propuesta de nombre para la siguiente temporada: «2026» → «2027»; si no es un número, «X (2)». */
export async function suggestNextSeason(current: string): Promise<string> {
  const n = Number(current);
  if (Number.isInteger(n)) return String(n + 1);
  const m = current.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${current} (2)`;
}

/**
 * Cierra la temporada en curso y empieza la siguiente:
 * 1. Guarda la clasificación final, los campeones y los goleadores.
 * 2. Da el título de Liga al primero (con su premio).
 * 3. Cobra sueldos y renovaciones si no se había hecho ya.
 * 4. Cambia el nombre de la temporada y genera el calendario nuevo.
 * Los partidos anteriores se conservan para el historial.
 */
export async function startNewSeasonAction(leagueId: string, nextSeason: string): Promise<void> {
  const label = nextSeason.trim();
  if (!label) throw new Error("Escribe el nombre de la nueva temporada.");

  const supabase = await createClient();
  const { data: league } = await supabase.from("leagues").select("*").eq("id", leagueId).single();
  if (!league) throw new Error("Liga no encontrada.");
  if (label === league.season) throw new Error("La nueva temporada debe tener otro nombre.");

  const { data: existing } = await supabase.from("seasons").select("id").eq("league_id", leagueId).eq("season", label).maybeSingle();
  if (existing) throw new Error(`La temporada «${label}» ya existe en el historial.`);

  const [{ data: teams }, { data: matches }, { data: standings }, { data: goals }, { data: finals }] = await Promise.all([
    supabase.from("teams").select("*").eq("league_id", leagueId),
    supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(id,name,short_name,primary_color,logo_url), away_team:teams!matches_away_team_id_fkey(id,name,short_name,primary_color,logo_url)")
      .eq("league_id", leagueId)
      .eq("season", league.season),
    supabase.from("league_standings").select("team_id, position").eq("league_id", leagueId).order("position"),
    supabase.from("match_goals").select("team_id, player_id, player_name, goals").eq("league_id", leagueId).eq("season", league.season),
    supabase.from("cup_ties").select("trophy, winner_team_id").eq("league_id", leagueId).eq("season", league.season).eq("is_final", true),
  ]);

  const clubs = ((teams ?? []) as Team[]).filter((t) => !isSystemTeam(t.name));
  const played = ((matches ?? []) as unknown as MatchWithTeams[]).filter((m) => m.played);

  // Clasificación final: la de la pestaña Tabla; con los puntos de los partidos jugados.
  const table = buildLeagueTable(clubs, played);
  const order = (standings ?? []).map((s) => s.team_id).filter((id) => clubs.some((c) => c.id === id));
  const ranking = order.length ? order : table.map((r) => r.team.id);
  const finalStandings = ranking.map((teamId, i) => {
    const row = table.find((r) => r.team.id === teamId);
    const team = clubs.find((c) => c.id === teamId);
    return {
      position: i + 1,
      team_id: teamId,
      name: team?.name ?? "",
      points: row?.points ?? 0,
      played: row?.played ?? 0,
      won: row?.won ?? 0,
      drawn: row?.drawn ?? 0,
      lost: row?.lost ?? 0,
      goals_for: row?.goals_for ?? 0,
      goals_against: row?.goals_against ?? 0,
    };
  });

  const nameOf = (id: string | null | undefined) => clubs.find((c) => c.id === id)?.name ?? null;
  const champions: Record<string, { team_id: string; name: string } | null> = {
    league: ranking[0] ? { team_id: ranking[0], name: nameOf(ranking[0]) ?? "" } : null,
  };
  for (const f of finals ?? []) {
    champions[f.trophy] = f.winner_team_id ? { team_id: f.winner_team_id, name: nameOf(f.winner_team_id) ?? "" } : null;
  }

  const scorers = topScorers((goals ?? []) as GoalRow[])
    .slice(0, 10)
    .map((s) => ({ ...s, team: nameOf(s.teamId) }));

  const { error: insErr } = await supabase.from("seasons").insert({
    league_id: leagueId,
    season: league.season,
    standings: finalStandings,
    champions,
    top_scorers: scorers,
  });
  if (insErr) throw new Error(`No se pudo guardar la temporada: ${insErr.message}`);

  // Título de Liga para el campeón (las copas ya se dan al jugar su final).
  if (ranking[0] && played.length > 0) await changeTeamTrophyAction(ranking[0], "league", 1);

  // Sueldos y renovaciones (no hace nada si ya se cobraron al acabar la vuelta).
  if (matches && matches.length) await closeSeasonContracts(leagueId, calendarKeyOf(matches));

  // Temporada nueva: las flechas de la clasificación empiezan de cero.
  for (const s of standings ?? []) {
    await supabase.from("league_standings").update({ previous_position: s.position }).eq("league_id", leagueId).eq("team_id", s.team_id);
  }
  const { error: upErr } = await supabase.from("leagues").update({ season: label }).eq("id", leagueId);
  if (upErr) throw new Error(`No se pudo cambiar de temporada: ${upErr.message}`);

  await generateFixtures({ ...(league as League), season: label }, clubs);

  invalidateMemCache();
  for (const tag of ["matches", "standings", "teams", "leagues"]) {
    try {
      revalidateTag(tag, "max");
    } catch {}
  }
  try {
    revalidatePath("/", "layout");
  } catch {}
}
