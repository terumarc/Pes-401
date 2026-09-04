import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { revalidateTag, revalidatePath } from "next/cache";
import type { Team, Match } from "@/types";

export async function POST(request: Request) {
  try {
    const { leagueId } = await request.json();

    if (!leagueId) {
      return NextResponse.json(
        { error: "Falta el ID de la liga (leagueId)" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // 1. Obtener solo los equipos reales de la liga (excluyendo Agentes Libres / Sin equipo)
    const { data: allTeams, error: teamsErr } = await supabase
      .from("teams")
      .select("*")
      .eq("league_id", leagueId)
      .order("name");

    if (teamsErr || !allTeams || allTeams.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron equipos para esta liga" },
        { status: 404 },
      );
    }

    const validTeams = (allTeams as Team[]).filter(
      (t) =>
        !t.name.toLowerCase().includes("libre") &&
        !t.name.toLowerCase().includes("sin equipo"),
    );

    if (validTeams.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 equipos para generar el calendario" },
        { status: 400 },
      );
    }

    // 2. Eliminar cualquier calendario anterior de la liga
    const { error: delErr } = await supabase
      .from("matches")
      .delete()
      .eq("league_id", leagueId);

    if (delErr) {
      return NextResponse.json(
        { error: "Error al borrar el calendario previo: " + delErr.message },
        { status: 500 },
      );
    }

    // 3. Generar round-robin ida y vuelta
    const teamList = [...validTeams];
    if (teamList.length % 2 !== 0) {
      teamList.push({ id: "BYE" } as Team);
    }

    const half = teamList.length / 2;
    const rounds = teamList.length - 1;
    const fixed = teamList[0];
    const rotating = teamList.slice(1);

    const inserts: Omit<Match, "id" | "created_at">[] = [];

    for (let round = 0; round < rounds; round++) {
      const matchday = round + 1;
      const pairs: [Team, Team][] = [];

      pairs.push([fixed, rotating[round % (teamList.length - 1)]]);
      for (let i = 1; i < half; i++) {
        const home = rotating[(round + i) % (teamList.length - 1)];
        const away =
          rotating[(round + teamList.length - 1 - i) % (teamList.length - 1)];
        pairs.push([home, away]);
      }

      for (const [home, away] of pairs) {
        if (home.id === "BYE" || away.id === "BYE") continue;

        // Ida
        inserts.push({
          league_id: leagueId,
          home_team_id: home.id,
          away_team_id: away.id,
          matchday,
          round: 1,
          home_goals: null,
          away_goals: null,
          played: false,
          played_at: null,
        });

        // Vuelta
        inserts.push({
          league_id: leagueId,
          home_team_id: away.id,
          away_team_id: home.id,
          matchday: rounds + matchday,
          round: 2,
          home_goals: null,
          away_goals: null,
          played: false,
          played_at: null,
        });
      }
    }

    // 4. Insertar los nuevos partidos
    const { data: createdMatches, error: insertErr } = await supabase
      .from("matches")
      .insert(inserts)
      .select("*");

    if (insertErr) {
      return NextResponse.json(
        { error: "Error al guardar los partidos: " + insertErr.message },
        { status: 500 },
      );
    }

    // 5. Invalidar cachés del servidor y tags
    invalidateMemCache("matches");
    invalidateMemCache("teams");
    invalidateMemCache("standing");
    try {
      revalidateTag("matches", { expire: 0 });
      revalidateTag("standings", { expire: 0 });
      revalidateTag("teams", { expire: 0 });
    } catch {}

    try {
      revalidatePath("/calendar");
      revalidatePath("/standings");
      revalidatePath("/league");
      revalidatePath("/teams");
    } catch {}

    return NextResponse.json({
      success: true,
      count: createdMatches?.length ?? 0,
      teamsCount: validTeams.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
