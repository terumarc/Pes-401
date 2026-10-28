import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordLeagueMatch } from "@/lib/data/record-match";
import { authErrorResponse, requireOneOf } from "@/lib/auth";
import type { ScorerInput } from "@/lib/data/goals";

export async function POST(request: Request) {
  try {
    const { matchId, homeGoals, awayGoals, scorers } = await request.json();

    if (!matchId || homeGoals == null || awayGoals == null) {
      return NextResponse.json(
        { error: "Parámetros requeridos faltantes (matchId, homeGoals, awayGoals)" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: match } = await supabase
      .from("matches")
      .select("home_team_id, away_team_id")
      .eq("id", matchId)
      .single();
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    await requireOneOf([match.home_team_id, match.away_team_id]);

    const result = await recordLeagueMatch(
      supabase,
      matchId,
      Number(homeGoals),
      Number(awayGoals),
      Array.isArray(scorers) ? (scorers as ScorerInput[]) : undefined,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const denied = authErrorResponse(err);
    if (denied) return denied;
    const msg = err instanceof Error ? err.message : "Error al procesar el partido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
