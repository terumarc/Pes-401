import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { revalidateTag } from "next/cache";
import { calculateMatchReward } from "@/lib/economy";
import { applySeasonMultipliers } from "@/lib/data/budget";
import { buildLeagueTable } from "@/lib/data/matches";
import type { Team, MatchWithTeams } from "@/types";

export async function POST(request: Request) {
  try {
    const { matchId, homeGoals, awayGoals } = await request.json();

    if (!matchId || homeGoals == null || awayGoals == null) {
      return NextResponse.json(
        { error: "Parámetros requeridos faltantes (matchId, homeGoals, awayGoals)" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

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
      return NextResponse.json(
        { error: "Error al actualizar el partido: " + (updateErr?.message || "") },
        { status: 500 },
      );
    }

    // 2. Recompensas por partido
    let homeResult: "win" | "draw" | "loss" = "draw";
    let awayResult: "win" | "draw" | "loss" = "draw";
    const hGoals = updatedMatch.home_goals ?? 0;
    const aGoals = updatedMatch.away_goals ?? 0;
    if (hGoals > aGoals) {
      homeResult = "win";
      awayResult = "loss";
    } else if (hGoals < aGoals) {
      homeResult = "loss";
      awayResult = "win";
    }

    const homeReward = calculateMatchReward(homeResult);
    const awayReward = calculateMatchReward(awayResult);

    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, budget, name")
      .in("id", [updatedMatch.home_team_id, updatedMatch.away_team_id]);

    if (teamsData) {
      const homeTeam = teamsData.find((t) => t.id === updatedMatch.home_team_id);
      const awayTeam = teamsData.find((t) => t.id === updatedMatch.away_team_id);

      if (homeTeam) {
        await supabase
          .from("teams")
          .update({ budget: homeTeam.budget + homeReward })
          .eq("id", homeTeam.id);
      }
      if (awayTeam) {
        await supabase
          .from("teams")
          .update({ budget: awayTeam.budget + awayReward })
          .eq("id", awayTeam.id);
      }
    }

    // 3. Revisión de fin de ida (mid-season) y fin de vuelta (end-season)
    let seasonStageApplied: "mid" | "end" | null = null;
    const { data: allLeagueMatches } = await supabase
      .from("matches")
      .select(
        "*, home_team:teams!matches_home_team_id_fkey(id,name,short_name,primary_color,logo_url), away_team:teams!matches_away_team_id_fkey(id,name,short_name,primary_color,logo_url)",
      )
      .eq("league_id", updatedMatch.league_id);

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
          const table = buildLeagueTable(
            leagueTeams as Team[],
            allLeagueMatches as unknown as MatchWithTeams[],
          );
          const standings = table.map((row, idx) => ({
            team_id: row.team.id,
            position: idx + 1,
          }));
          await applySeasonMultipliers(updatedMatch.league_id, standings, "end");
          seasonStageApplied = "end";
        }
      } else if (round1Complete && updatedMatch.round === 1) {
        // Completó todos los partidos de ida (mitad de temporada)
        const { data: leagueTeams } = await supabase
          .from("teams")
          .select("*")
          .eq("league_id", updatedMatch.league_id);

        if (leagueTeams) {
          const table = buildLeagueTable(
            leagueTeams as Team[],
            round1 as unknown as MatchWithTeams[],
          );
          const standings = table.map((row, idx) => ({
            team_id: row.team.id,
            position: idx + 1,
          }));
          await applySeasonMultipliers(updatedMatch.league_id, standings, "mid");
          seasonStageApplied = "mid";
        }
      }
    }

    // 4. Invalidación de caché
    invalidateMemCache("matches");
    invalidateMemCache("teams");
    try {
      revalidateTag("matches", "max");
      revalidateTag("standings", "max");
      revalidateTag("teams", "max");
    } catch {}

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      seasonStageApplied,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al procesar el partido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
