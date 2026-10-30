import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag, revalidatePath } from "next/cache";
import { invalidateMemCache } from "@/lib/data/cache";
import { applySeasonMultipliers } from "@/lib/data/budget";
import { saveLeagueMatchGoals, type ScorerInput } from "@/lib/data/goals";
import { calendarKeyOf, claimSeasonStage, closeSeasonContracts } from "@/lib/data/contracts";
import { buildLeagueTable } from "@/lib/data/matches";
import type { Database } from "@/lib/supabase/database.types";
import type { Team, MatchWithTeams } from "@/types";

// Quien apunta o borra un resultado lo ve al momento: los datos caducan ya, sin servir los viejos mientras tanto.
const NOW = { expire: 0 };

export type RecordedMatch = {
  match: Database["public"]["Tables"]["matches"]["Row"];
  seasonStageApplied: "mid" | "end" | null;
  /** Clubes a los que les ha salido carta con este partido. */
  cardsDrawn: string[];
};

/**
 * Guarda el resultado de un partido de liga y, si con él se acaba la ida o la
 * vuelta, cobra los premios por posición y cierra los contratos. Los permisos
 * se comprueban antes de llamar aquí.
 */
export async function recordLeagueMatch(
  supabase: SupabaseClient<Database>,
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  scorers?: ScorerInput[],
): Promise<RecordedMatch> {
  // 1. Guardar resultado
  const { data: updatedMatch, error: updateErr } = await supabase
    .from("matches")
    .update({
      home_goals: Number(homeGoals),
      away_goals: Number(awayGoals),
      played: true,
      played_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select("*")
    .single();

  if (updateErr || !updatedMatch) {
    throw new Error("Error al actualizar el partido: " + (updateErr?.message || ""));
  }

  // 1b. Goleadores (opcional)
  if (Array.isArray(scorers)) {
    await saveLeagueMatchGoals(supabase, updatedMatch, scorers as ScorerInput[]);
  }

  // 2. Premios por posición: al acabar la ida (mitad de temporada) y al acabar la vuelta. Ganar partidos no da dinero.
  let seasonStageApplied: "mid" | "end" | null = null;
  const { data: allLeagueMatches } = await supabase
    .from("matches")
    .select(
      "*, home_team:teams!matches_home_team_id_fkey(id,name,short_name,primary_color,logo_url), away_team:teams!matches_away_team_id_fkey(id,name,short_name,primary_color,logo_url)",
    )
    .eq("league_id", updatedMatch.league_id)
    .eq("season", updatedMatch.season ?? "");

  if (allLeagueMatches && allLeagueMatches.length > 0) {
    const round1 = allLeagueMatches.filter((m) => m.round === 1);
    const round2 = allLeagueMatches.filter((m) => m.round === 2);

    const round1Complete = round1.length > 0 && round1.every((m) => m.played);
    const round2Complete = round2.length > 0 && round2.every((m) => m.played);

    // Si este partido completó la vuelta completa (final de temporada)
    if (round2Complete) {
      const { data: leagueTeams } = await supabase
        .from("teams")
        .select("*")
        .eq("league_id", updatedMatch.league_id);

      if (leagueTeams) {
        const playableTeams = (leagueTeams as Team[]).filter(
          (t) => !t.name.toLowerCase().includes("libre") && !t.name.toLowerCase().includes("sin equipo")
        );
        const table = buildLeagueTable(
          playableTeams,
          allLeagueMatches as unknown as MatchWithTeams[],
        );
        const standings = table.map((row, idx) => ({
          team_id: row.team.id,
          position: idx + 1,
        }));
        // Una sola vez por calendario: corregir un resultado después no vuelve a pagar ni cobrar.
        const calendarKey = calendarKeyOf(allLeagueMatches);
        if (await claimSeasonStage(supabase, updatedMatch.league_id, calendarKey, "end")) {
          await applySeasonMultipliers(updatedMatch.league_id, standings, "end");
          seasonStageApplied = "end";
        }
        // Después de cobrar los premios, se pagan sueldos y renovaciones.
        await closeSeasonContracts(updatedMatch.league_id, calendarKey);
      }
    } else if (round1Complete && updatedMatch.round === 1) {
      // Completó todos los partidos de ida (mitad de temporada)
      const { data: leagueTeams } = await supabase
        .from("teams")
        .select("*")
        .eq("league_id", updatedMatch.league_id);

      if (leagueTeams) {
        const playableTeams = (leagueTeams as Team[]).filter(
          (t) => !t.name.toLowerCase().includes("libre") && !t.name.toLowerCase().includes("sin equipo")
        );
        const table = buildLeagueTable(
          playableTeams,
          round1 as unknown as MatchWithTeams[],
        );
        const standings = table.map((row, idx) => ({
          team_id: row.team.id,
          position: idx + 1,
        }));
        if (await claimSeasonStage(supabase, updatedMatch.league_id, calendarKeyOf(allLeagueMatches), "mid")) {
          await applySeasonMultipliers(updatedMatch.league_id, standings, "mid");
          seasonStageApplied = "mid";
        }
      }
    }
  }

  // 3. Cartas de Suerte y Caja B: lo decide la base de datos (25%, seguro tras 5 partidos
  //    sin carta, máximo 2 por vuelta). Un partido corregido no vuelve a sacar carta.
  //    Los dos clubes a la vez: cada uno saca (o no) la suya.
  const draws = await Promise.all(
    [updatedMatch.home_team_id, updatedMatch.away_team_id].map(async (teamId) => {
      try {
        const { data: draw } = await supabase.rpc("draw_card", { p_match: updatedMatch.id, p_team: teamId });
        return draw?.id ? teamId : null;
      } catch {
        // Sin cartas no pasa nada: el resultado ya está guardado.
        return null;
      }
    }),
  );
  const cardsDrawn = draws.filter((t): t is string => !!t);

  // 4. Invalidación de caché
  invalidateMemCache();
  try {
    revalidateTag("matches", NOW);
    revalidateTag("standings", NOW);
    // El dinero de los clubes solo cambia con cartas o al cobrar premios de la vuelta.
    if (cardsDrawn.length || seasonStageApplied) revalidateTag("teams", NOW);
  } catch {}

  try {
    revalidatePath("/calendar");
    revalidatePath("/standings");
    revalidatePath("/league");
    revalidatePath("/teams");
    revalidatePath("/finances");
    if (cardsDrawn.length) revalidatePath("/noticias");
  } catch {}


  return { match: updatedMatch, seasonStageApplied, cardsDrawn };
}
