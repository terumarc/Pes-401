"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { getLeagueSeason } from "@/lib/data/season";
import { recordLeagueMatch } from "@/lib/data/record-match";
import { requireOneOf } from "@/lib/auth";
import type { Match } from "@/types";

// Quien apunta o borra un resultado lo ve al momento: los datos caducan ya, sin servir los viejos mientras tanto.
const NOW = { expire: 0 };

/**
 * Apunta un partido eligiendo los dos equipos: usa el partido pendiente que
 * cuadre (en ese orden o al revés) o, si no hay ninguno, crea uno.
 * Pueden hacerlo los dos clubes que lo juegan o un admin.
 */
export async function recordDirectMatchAction(
  leagueId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
  preferredMatchId?: string,
): Promise<Match> {
  await requireOneOf([homeTeamId, awayTeamId]);
  const supabase = await createClient();

  let matchId = preferredMatchId ?? null;

  if (!matchId) {
    const season = await getLeagueSeason(supabase, leagueId);
    const pending = (home: string, away: string) =>
      supabase
        .from("matches")
        .select("id")
        .eq("league_id", leagueId)
        .eq("season", season)
        .eq("home_team_id", home)
        .eq("away_team_id", away)
        .eq("played", false)
        .order("matchday", { ascending: true })
        .limit(1)
        .maybeSingle();

    const { data: exact } = await pending(homeTeamId, awayTeamId);
    if (exact) {
      matchId = exact.id;
    } else {
      const { data: reverse } = await pending(awayTeamId, homeTeamId);
      if (reverse) {
        // Se jugó con los campos cambiados: se da la vuelta al partido.
        const { error } = await supabase
          .from("matches")
          .update({ home_team_id: homeTeamId, away_team_id: awayTeamId })
          .eq("id", reverse.id);
        if (error) throw new Error(error.message);
        matchId = reverse.id;
      } else {
        const { data: created, error } = await supabase
          .from("matches")
          .insert({
            league_id: leagueId,
            season,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            matchday: 99,
            round: 1,
          })
          .select("id")
          .single();
        if (error || !created) throw new Error(error?.message ?? "No se pudo crear el partido.");
        matchId = created.id;
      }
    }
  } else {
    const { data: m } = await supabase.from("matches").select("home_team_id, away_team_id").eq("id", matchId).single();
    if (!m) throw new Error("Partido no encontrado.");
    await requireOneOf([m.home_team_id, m.away_team_id]);
  }

  const { match } = await recordLeagueMatch(supabase, matchId, homeGoals, awayGoals);
  return match as Match;
}

/** Borra el resultado de un partido (vuelve a pendiente): sus dos clubes o un admin. */
export async function resetMatchResultAction(matchId: string): Promise<Match> {
  const supabase = await createClient();
  const [{ data: m }, { count: cards }] = await Promise.all([
    supabase.from("matches").select("home_team_id, away_team_id").eq("id", matchId).single(),
    supabase.from("card_draws").select("id", { count: "exact", head: true }).eq("match_id", matchId),
  ]);
  if (!m) throw new Error("Partido no encontrado.");
  await requireOneOf([m.home_team_id, m.away_team_id]);

  // Goles fuera y partido a pendiente a la vez (las cartas las anula la base de datos).
  const [, { data, error }] = await Promise.all([
    supabase.from("match_goals").delete().eq("match_id", matchId),
    supabase
      .from("matches")
      .update({ home_goals: null, away_goals: null, played: false, played_at: null })
      .eq("id", matchId)
      .select("*")
      .single(),
  ]);
  if (error || !data) throw new Error(error?.message ?? "No se pudo borrar el resultado.");

  invalidateMemCache();
  try {
    revalidateTag("matches", NOW);
    revalidateTag("standings", NOW);
    revalidatePath("/calendar");
    revalidatePath("/standings");
    // Si tenía cartas, se han anulado y el dinero ha vuelto a los clubes.
    if (cards) {
      revalidateTag("teams", NOW);
      revalidatePath("/noticias");
    }
  } catch {}
  return data as Match;
}
